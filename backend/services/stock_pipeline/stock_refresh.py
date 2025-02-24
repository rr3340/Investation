import time
import yfinance as yf
import pandas as pd

last_request_time = time.time()
request_count = 0
MAX_REQUESTS_PER_MINUTE = 10 
REQUEST_DELAY = 60 / MAX_REQUESTS_PER_MINUTE 

def stock_refresh(symbol, interval="5m", period="1d"):
    global last_request_time, request_count

    # Calculate the time since the last request
    current_time = time.time()
    time_since_last_request = current_time - last_request_time

    # Enforce a delay if necessary
    if time_since_last_request < REQUEST_DELAY:
        sleep_time = REQUEST_DELAY - time_since_last_request
        print(f"Waiting {sleep_time:.2f} seconds to avoid rate limiting...")
        time.sleep(sleep_time)

    # Make the request
    print(f"Making request {request_count + 1} for {symbol}...")
    new_df = yf.download(tickers=symbol, interval=interval, period=period)
    request_count += 1
    last_request_time = time.time()

    if new_df.empty:
        raise ValueError(f"No data returned for symbol {symbol} with interval {interval}.")

    new_df.index = new_df.index.tz_localize(None)
    new_df.reset_index(inplace=True)

    if isinstance(new_df.columns, pd.MultiIndex):
        new_df.columns = ['_'.join(col).strip() for col in new_df.columns.values]

    new_df.rename(columns={
        "Datetime_": "datetime",
        f"Open_{symbol}": "open",
        f"High_{symbol}": "high",
        f"Low_{symbol}": "low",
        f"Close_{symbol}": "close",
        f"Volume_{symbol}": "volume"
    }, inplace=True)

    new_df.dropna(subset=["datetime"], inplace=True)

    return new_df