import time
import yfinance as yf
import pandas as pd
import pytz
from datetime import datetime
import logging
import random

# Configure logging
logger = logging.getLogger('stock_pipeline')

#Global variables for rate limiting
last_request_time = time.time()
request_count = 0 #Uses a more conservative rate limit to ensure success with Yahoo Finance.
MAX_REQUESTS_PER_MINUTE = 20  #Reduced from 30 to 20 for better reliability.
REQUEST_DELAY = 60 / MAX_REQUESTS_PER_MINUTE
MAX_RETRIES = 2  #Add retries for transient failures.

def stock_refresh(symbol, interval="5m", period="1d"):
    """Fetch fresh stock data from Yahoo Finance and ensure all timestamps have proper UTC timezone information."""
    global last_request_time, request_count

    #Gets current time in UTC for validation
    now = datetime.now(pytz.UTC)
    logger.info(f"Current time (UTC): {now.isoformat()}")
    
    #Adds a slight jitter to request timing to avoid all threads hitting at once.
    jitter = random.uniform(0.1, 1.0)  #Random delay between 0.1 and 1.0 seconds.
    
    #Calculates the time since the last request.
    current_time = time.time()
    time_since_last_request = current_time - last_request_time

    # Enforce a minimal delay if necessary.
    required_delay = max(0, REQUEST_DELAY - time_since_last_request + jitter)
    if required_delay > 0:
        logger.info(f"Waiting {required_delay:.2f} seconds for {symbol} to avoid rate limiting...")
        time.sleep(required_delay)

    # Track retries attempt.
    retry_count = 0
    last_error = None
    
    while retry_count <= MAX_RETRIES:
        try:
            # Updates request time before making the request.
            request_count += 1
            last_request_time = time.time()
            
            logger.info(f"Making request {request_count} for {symbol} (attempt {retry_count+1}/{MAX_RETRIES+1}), interval={interval}, period={period}")
            
            # Downloads the data using period parameter.
            new_df = yf.download(
                tickers=symbol,
                interval=interval,
                period=period,
                prepost=False,  # Avoid pre/post market hours which can cause issues.
                progress=False  # Disable progress bar which can clutter logs.
            )
            
            #Request successful.
            if new_df.empty:
                logger.warning(f"No data returned for symbol {symbol} with interval {interval}.")
                raise ValueError(f"No data returned for symbol {symbol} with interval {interval}.")
            
            logger.info(f"Successfully fetched data for {symbol} on attempt {retry_count+1}")
            break  #Exits the retry loop
            
        except Exception as e:
            error_msg = str(e)
            last_error = e
            
            #Checks for specific error types for better diagnostics.
            if "No data found" in error_msg:
                logger.warning(f"No data available for {symbol} - might be due to market being closed")
                #Don't retry "No data found" errors.
                break
            elif "rate limit" in error_msg.lower():
                logger.warning(f"Rate limit hit while fetching {symbol}, retrying after delay")
                retry_count += 1
                if retry_count <= MAX_RETRIES:
                    #Exponential backoff for rate limit errors.
                    backoff_time = 5 * (2 ** retry_count) + random.uniform(0, 1)
                    logger.info(f"Backing off for {backoff_time:.2f} seconds before retry {retry_count}/{MAX_RETRIES}")
                    time.sleep(backoff_time)
                continue
            else:
                logger.error(f"Error downloading data for {symbol}: {error_msg}")
                retry_count += 1
                if retry_count <= MAX_RETRIES:
                    #Linear backoff for other errors.
                    backoff_time = 2 * retry_count + random.uniform(0, 1)
                    logger.info(f"Backing off for {backoff_time:.2f} seconds before retry {retry_count}/{MAX_RETRIES}")
                    time.sleep(backoff_time)
                continue
    
    #If we exited the loop with all retries exhausted, raise the last error.
    if retry_count > MAX_RETRIES and last_error:
        raise ValueError(f"Failed to download data for {symbol} after {MAX_RETRIES+1} attempts: {str(last_error)}")
    
    #Logs the date range of the returned data.
    if not new_df.empty:
        min_date = new_df.index.min()
        max_date = new_df.index.max()
        logger.info(f"Retrieved data range for {symbol}: {min_date} to {max_date} ({len(new_df)} records)")

    #Converts timezone to UTC.
    utc_tz = pytz.UTC
    
    #Ensures the index has timezone info and convert to UTC if needed.
    if new_df.index.tzinfo is None:
        logger.info(f"Localizing naive timestamps to UTC for {symbol}")
        new_df.index = pd.DatetimeIndex([
            pytz.UTC.localize(dt) if dt.tzinfo is None else dt 
            for dt in new_df.index
        ])
    else:
        logger.info(f"Converting aware timestamps to UTC for {symbol}")
        new_df.index = new_df.index.tz_convert(utc_tz)
    
    #Resets index to prepare for column renaming
    new_df.reset_index(inplace=True)

    #Handles multi-level columns if present
    if isinstance(new_df.columns, pd.MultiIndex):
        new_df.columns = ['_'.join(col).strip() for col in new_df.columns.values]

    #Renames columns to standard format.
    column_mapping = {
        "Datetime_": "datetime",
        "Datetime": "datetime",
        "Date": "datetime",  #Date turned into datetime.
        f"Open_{symbol}": "open",
        "Open": "open",
        f"High_{symbol}": "high",
        "High": "high",
        f"Low_{symbol}": "low",
        "Low": "low",
        f"Close_{symbol}": "close",
        "Close": "close",
        f"Volume_{symbol}": "volume",
        "Volume": "volume"
    }
    
    #Ensures all columns exist.
    for old_col, new_col in column_mapping.items():
        if old_col in new_df.columns:
            new_df[new_col] = new_df[old_col]
            new_df.drop(columns=[old_col], inplace=True)
    
    #Drops rows with missing datetime values
    new_df.dropna(subset=["datetime"], inplace=True)
    
    #Checks for rows with NULL values in all price columns
    price_columns = ['open', 'high', 'low', 'close']
    if all(col in new_df.columns for col in price_columns):
        null_price_rows = new_df[price_columns].isnull().all(axis=1)
        if null_price_rows.any():
            logger.warning(f"Found {null_price_rows.sum()} rows with all NULL price data for {symbol}. Removing these rows.")
            new_df = new_df[~null_price_rows]
    
    #Ensures datetime column has timezone information
    if hasattr(new_df['datetime'].dtype, 'tz') and new_df['datetime'].dtype.tz is None:
        logger.info(f"Localizing DataFrame datetime column to UTC for {symbol}")
        new_df['datetime'] = new_df['datetime'].apply(lambda dt: pytz.UTC.localize(dt) if dt.tzinfo is None else dt)

    logger.info(f"Fetched {len(new_df)} valid records for {symbol}")
    
    return new_df