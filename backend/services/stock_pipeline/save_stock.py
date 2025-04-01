from backend.models.stock import Stock
from backend.models.historicstock import HistoricStock
from backend.exts import db
from datetime import datetime
import pytz
import logging
import pandas as pd

# Configure logging
logger = logging.getLogger('stock_pipeline')

def save_to_database(df, symbol):
    """Save stock data to the database, ensuring all timestamps are properly converted to UTC with timezone information and no NULL values
    are saved."""
    count_added = 0
    count_skipped_null = 0
    count_skipped_future = 0
    
    #Current time to check for future dates.
    now = datetime.now(pytz.UTC)
    
    for _, row in df.iterrows():
        try:
            #Get datetime values from dataframe.
            datetime_value = row["datetime"]
            
            # Skip the future dates.
            if datetime_value > now:
                logger.warning(f"Skipping future date for {symbol}: {datetime_value}")
                count_skipped_future += 1
                continue
            
            # Skip rows with NULL values in essential fields.
            if (pd.isna(row["open"]) or pd.isna(row["high"]) or 
                pd.isna(row["low"]) or pd.isna(row["close"])):
                logger.warning(f"Skipping record with NULL values for {symbol} at {datetime_value}")
                count_skipped_null += 1
                continue
            
            # Handle the timezone conversions to UTC for storage.
            if datetime_value.tzinfo is None:
                # If datetime has no timezone, assume it's already UTC.
                utc_datetime = pytz.UTC.localize(datetime_value)
                logger.debug(f"Localized naive datetime to UTC: {utc_datetime}")
            else:
                # Convert to UTC if it has a different timezone.
                utc_datetime = datetime_value.astimezone(pytz.UTC)
                logger.debug(f"Converted aware datetime to UTC: {utc_datetime}")
            
            # Check if the record already exists (using UTC datetime.)
            existing_record = HistoricStock.query.filter_by(
                stock_key=symbol,
                datetime=utc_datetime
            ).first()

            if not existing_record:
                #Create a new record with non-NULL values.
                new_record = HistoricStock(
                    stock_key=symbol,
                    datetime=utc_datetime,
                    open=row["open"],
                    high=row["high"],
                    low=row["low"],
                    close=row["close"],
                    volume=row["volume"] if not pd.isna(row["volume"]) else 0  # Default volume to 0 if NULL
                )
                new_record.save()
                count_added += 1
        except Exception as e:
            logger.error(f"Error saving record for {symbol}: {str(e)}")
            #Continue processing other records
            continue
    
    logger.info(f"Added {count_added} new records for {symbol}")
    if count_skipped_null > 0:
        logger.info(f"Skipped {count_skipped_null} records with NULL values for {symbol}")
    if count_skipped_future > 0:
        logger.info(f"Skipped {count_skipped_future} future dates for {symbol}")
    
    return count_added