from .load_stock import load_data
from .stock_refresh import stock_refresh
from .update_stock import update_stock
from .save_stock import save_to_database
import logging
import pytz
from datetime import datetime
import traceback

# Configure logging
logger = logging.getLogger('stock_pipeline')

def live_pipeline(key):
    """Run the complete stock data pipeline for a given stock symbol."""
    try:
        logger.info(f"Starting live pipeline for {key}")
        
        #Load the existing data.
        existing_df = load_data(key)
        logger.info(f"Loaded {len(existing_df)} existing records for {key}")
        
        #Fetch the new data.
        new_df = stock_refresh(key)
        logger.info(f"Fetched {len(new_df)} new records for {key}")
        
        #Update the data with the new and existing.
        updated_df = update_stock(existing_df, new_df)
        logger.info(f"Combined into {len(updated_df)} total records for {key}")
        
        #Save it to the database.
        records_added = save_to_database(updated_df, key)
        logger.info(f"Pipeline complete for {key}, added {records_added} new records")
        
        return {
            "status": "success",
            "symbol": key,
            "records_processed": len(updated_df),
            "records_added": records_added,
            "timestamp": datetime.now(pytz.UTC).isoformat()
        }
    except Exception as e:
        error_detail = traceback.format_exc()
        logger.error(f"Pipeline error for {key}: {str(e)}\n{error_detail}")
        
        return {
            "status": "error",
            "symbol": key,
            "error": str(e),
            "timestamp": datetime.now(pytz.UTC).isoformat()
        }