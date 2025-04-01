import os
import pandas as pd
import pytz
from backend.models.stock import Stock
from backend.services.cloud_storage.upload_to_db import save_variables_to_s3
from backend.services.cloud_storage.upload_from_db import load_variables_from_s3
from backend.services.stock_pipeline.load_stock import load_data
from backend.services.historic_stock.process_stock import process_from_database
import logging

# Configure logging
logger = logging.getLogger('historic_stock')

PROCESSED_STORAGE = os.getenv("PROCESSED_STORAGE")

def process_database():
    stocks = Stock.query.all()
    for stock in stocks:
        stock_key = stock.stock_key
        df = load_data(stock_key)
        processed_df = process_from_database(df)
        print(processed_df)

        if processed_df is not None:
            variables = {
                'processed_stock': (processed_df, PROCESSED_STORAGE, f"processed_{stock_key}_stock.csv")
                }
            save_variables_to_s3(variables)

    return "Database processed successfully."

def process_stocks(stock_list):
    """Process a list of stocks by loading data, processing it, and saving to S3"""
    if not stock_list:
        return {"status": "skipped", "message": "No stocks to process"}
    
    if not PROCESSED_STORAGE:
        return {"status": "error", "message": "PROCESSED_STORAGE environment variable not set"}
    
    results = {
        "successful": [],
        "failed": [],
        "details": {}
    }
    
    #Process each stock
    for stock_key in stock_list:
        try:
            logger.info(f"Processing stock {stock_key}")
            
            # Load the data
            df = load_data(stock_key)
            if df is None or df.empty:
                error_msg = "No data found or data is empty"
                logger.error(f"{error_msg} for {stock_key}")
                results["failed"].append(stock_key)
                results["details"][stock_key] = {"status": "error", "message": error_msg}
                continue
            
            # Process the data
            processed_df = process_from_database(df)
            if processed_df is None:
                error_msg = "Processing failed, invalid data format"
                logger.error(f"{error_msg} for {stock_key}")
                results["failed"].append(stock_key)
                results["details"][stock_key] = {"status": "error", "message": error_msg}
                continue
            
            # Then save the processed data to S3
            variables = {
                'processed_stock': (processed_df, PROCESSED_STORAGE, f"processed_{stock_key}_stock.csv")
            }
            save_variables_to_s3(variables)
            
            # Record success if correctly one.
            results["successful"].append(stock_key)
            results["details"][stock_key] = {"status": "success", "message": "Successfully processed and saved"}
            logger.info(f"Successfully processed {stock_key}")
            
        except Exception as e:
            error_msg = f"Error: {str(e)}"
            logger.error(f"Error processing {stock_key}: {error_msg}")
            results["failed"].append(stock_key)
            results["details"][stock_key] = {"status": "error", "message": error_msg}
    
    # Then add the summary stats.
    results["successful_count"] = len(results["successful"])
    results["failed_count"] = len(results["failed"])
    results["total"] = len(stock_list)
    
    return results

def convert_processed_to_utc(stock_list=None):
    """Convert existing processed stock data to use explicit UTC timezone information"""
    if not PROCESSED_STORAGE:
        return {"status": "error", "message": "PROCESSED_STORAGE environment variable not set"}
    
    #If there is no stock list provided, try to get all stocks from the database.
    if stock_list is None:
        stocks = Stock.query.all()
        stock_list = [stock.stock_key for stock in stocks]
    
    results = {
        "successful": [],
        "failed": [],
        "details": {}
    }
    
    for stock_key in stock_list:
        try:
            logger.info(f"Converting processed data for {stock_key} to UTC")
            
            # Load the existing processed data.
            variables = {
                'processed_stock': (PROCESSED_STORAGE, f"processed_{stock_key}_stock.csv")
            }
            
            try:
                loaded_vars = load_variables_from_s3(variables)
                processed_df = loaded_vars.get('processed_stock')
            except Exception as e:
                error_msg = f"Failed to load processed data: {str(e)}"
                logger.error(f"{error_msg} for {stock_key}")
                results["failed"].append(stock_key)
                results["details"][stock_key] = {"status": "error", "message": error_msg}
                continue
                
            if processed_df is None or processed_df.empty:
                error_msg = "No processed data found or data is empty"
                logger.error(f"{error_msg} for {stock_key}")
                results["failed"].append(stock_key)
                results["details"][stock_key] = {"status": "error", "message": error_msg}
                continue
            
            # Ensures index is datetime with the UTC timezone
            processed_df.index = pd.to_datetime(processed_df.index, errors='coerce')
            # Convert to UTC timezone if it isn't already
            processed_df.index = processed_df.index.map(lambda x: 
                x.tz_localize(pytz.UTC) if x.tzinfo is None else x.astimezone(pytz.UTC))
            
            #Save the UTC-converted data back to the S3 bucket.
            variables = {
                'processed_stock': (processed_df, PROCESSED_STORAGE, f"processed_{stock_key}_stock.csv")
            }
            save_variables_to_s3(variables)
            
            #Record successful.
            results["successful"].append(stock_key)
            results["details"][stock_key] = {"status": "success", "message": "Successfully converted to UTC"}
            logger.info(f"Successfully converted {stock_key} to UTC")
            
        except Exception as e:
            error_msg = f"Error: {str(e)}"
            logger.error(f"Error converting {stock_key} to UTC: {error_msg}")
            results["failed"].append(stock_key)
            results["details"][stock_key] = {"status": "error", "message": error_msg}
    
    #Add the summary stats.
    results["successful_count"] = len(results["successful"])
    results["failed_count"] = len(results["failed"])
    results["total"] = len(stock_list)
    
    return results