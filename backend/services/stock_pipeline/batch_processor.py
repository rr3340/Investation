import time
import logging
import traceback
import concurrent.futures
from flask import current_app
from datetime import datetime
from .activate_stock_pipeline import live_pipeline
from backend.models.historicstock import HistoricStock
from backend.models.stock import Stock
from backend.services.historic_stock.process_stock import process_from_database as process_single_stock_data
from backend.services.cloud_storage.upload_to_db import save_variables_to_s3
from backend.services.stock_pipeline.load_stock import load_data
import os
import pandas as pd

# Configure logging
logger = logging.getLogger('stock_pipeline')

# The fixed stock batches.
STOCK_BATCH = [
    'AAPL',  # Apple Inc.
    'MSFT',  # Microsoft Corporation
    'GOOGL', # Alphabet Inc. (Google)
    'AMZN',  # Amazon.com Inc.
    'META',  # Meta Platforms Inc. (Facebook)
    'TSLA',  # Tesla Inc.
    'NVDA',  # NVIDIA Corporation
    'JPM',   # JPMorgan Chase & Co.
    'JNJ',   # Johnson & Johnson
    'V',     # Visa Inc.
    'PG',    # Procter & Gamble Co.
    'HD',    # Home Depot Inc.
    'BAC',   # Bank of America Corp.
    'MA',    # Mastercard Inc.
    'DIS'    # Walt Disney Co.
]

def ensure_stock_exists(stock_key):
    """Ensure the stock exists in the Stock model before processing, or if it doesn't exist, 
    will create it with the stock key as both the key and name"""
    try:
        # Check if stock exists in the database.
        stock = Stock.query.filter_by(stock_key=stock_key).first()
        
        if not stock:
            logger.info(f"Stock {stock_key} not found in the database. Creating a new stock entry.")
            
            # Create a new stock with default values.
            new_stock = Stock(
                stock_key=stock_key,
                name=stock_key,  # Use symbol as name initially
                sector="Undefined",  # Placeholder
                industry="Undefined"  # Placeholder
            )
            
            #Save the new stock using the native save method
            new_stock.save()
            logger.info(f"Created new stock: {stock_key}")
            
            return True, f"Stock {stock_key} was automatically created"
            
        return True, f"Stock {stock_key} already exists"
    
    except Exception as e:
        logger.error(f"Error checking/creating stock for {stock_key}: {str(e)}")
        return False, f"Error: {str(e)}"

def check_historic_data(stock_key):
    """Check if historical data exists for the stock"""
    try:
        #Count historical records for this stock
        count = HistoricStock.query.filter_by(stock_key=stock_key).count()
        return count
    except Exception as e:
        logger.error(f"Error counting historical records for {stock_key}: {str(e)}")
        return 0

def process_single_stock(stock_key):
    """Process a single stock through the live pipeline"""
    try:
        # Checks if stock exists in the stock model, if it doesn't, create it.
        stock_exists, message = ensure_stock_exists(stock_key)
        
        if not stock_exists:
            return {
                "stock": stock_key,
                "status": "error",
                "message": f"Failed to ensure stock exists: {message}"
            }
        
        # Checks how many historical records exist before processing the stocks
        records_before = check_historic_data(stock_key)
        logger.info(f"Starting processing for {stock_key} (existing records: {records_before})")
        
        # Processes the stock through the live pipeline
        pipeline_result = live_pipeline(stock_key)
        
        # Checks if the pipeline was successful
        if pipeline_result["status"] == "error":
            logger.error(f"Pipeline error for {stock_key}: {pipeline_result['error']}")
            return {
                "stock": stock_key,
                "status": "error",
                "message": f"Pipeline error: {pipeline_result['error']}"
            }
        
        #Check how many records were added.
        records_after = check_historic_data(stock_key)
        records_added = records_after - records_before
        
        logger.info(f"Completed processing for {stock_key}: Added {records_added} new records")
        return {
            "stock": stock_key,
            "status": "success",
            "message": f"Stock data for {stock_key} updated successfully",
            "records_before": records_before,
            "records_after": records_after,
            "records_added": records_added,
            "stock_created": "already existed" if "already exists" in message else "newly created"
        }
    except Exception as e:
        # Get detailed error information including traceback
        error_detail = traceback.format_exc()
        logger.error(f"Error processing {stock_key}: {str(e)}\n{error_detail}")
        return {
            "stock": stock_key,
            "status": "error",
            "message": f"Failed to update stock data for {stock_key}: {str(e)}"
        }

def process_stock_with_app_context(stock_key, app):
    """Process a single stock with the application context"""
    # Create a new app context for this thread
    with app.app_context():
        try:
            return process_single_stock(stock_key)
        except Exception as e:
            # Ensures any thread-level exceptions are caught and logged with full traceback
            error_detail = traceback.format_exc()
            logger.error(f"Thread exception processing {stock_key}: {str(e)}\n{error_detail}")
            return {
                "stock": stock_key,
                "status": "error",
                "message": f"Thread exception: {str(e)}"
            }

def process_historical_data_for_stocks(stock_list, app):
    """Process historical stock data for a list of stocks"""
    if not stock_list:
        return {"status": "skipped", "message": "No stocks to process"}
    
    PROCESSED_STORAGE = os.getenv("PROCESSED_STORAGE")
    if not PROCESSED_STORAGE:
        return {"status": "error", "message": "PROCESSED_STORAGE environment variable not set"}
    
    start_time = time.time()
    logger.info(f"Starting historical data processing for {len(stock_list)} stocks")
    
    results = {
        "successful": [],
        "failed": [],
        "details": []
    }
    
    # Process historical data for each stock
    for stock_key in stock_list:
        try:
            with app.app_context():
                # Load the data
                df = load_data(stock_key)
                if df is None or df.empty:
                    results["failed"].append(stock_key)
                    results["details"].append({
                        "stock": stock_key,
                        "status": "error",
                        "message": "No data found or data is empty"
                    })
                    continue
                
                # Process the data
                processed_df = process_single_stock_data(df)
                if processed_df is None:
                    results["failed"].append(stock_key)
                    results["details"].append({
                        "stock": stock_key,
                        "status": "error",
                        "message": "Processing failed, invalid data format"
                    })
                    continue
                
                # Save the processed data
                try:
                    variables = {
                        'processed_stock': (processed_df, PROCESSED_STORAGE, f"processed_{stock_key}_stock.csv")
                    }
                    save_variables_to_s3(variables)
                    
                    # Record success
                    results["successful"].append(stock_key)
                    results["details"].append({
                        "stock": stock_key,
                        "status": "success",
                        "message": "Successfully processed and saved historical data"
                    })
                    logger.info(f"Successfully processed historical data for {stock_key}")
                except Exception as save_error:
                    # Handle S3 saving errors
                    error_detail = traceback.format_exc()
                    logger.error(f"Error saving processed data for {stock_key}: {str(save_error)}\n{error_detail}")
                    results["failed"].append(stock_key)
                    results["details"].append({
                        "stock": stock_key,
                        "status": "error",
                        "message": f"Error saving data: {str(save_error)}"
                    })
                
        except Exception as e:
            error_detail = traceback.format_exc()
            logger.error(f"Error processing historical data for {stock_key}: {str(e)}\n{error_detail}")
            results["failed"].append(stock_key)
            results["details"].append({
                "stock": stock_key,
                "status": "error",
                "message": f"Error: {str(e)}"
            })
    
    end_time = time.time()
    duration = end_time - start_time
    
    results["total"] = len(stock_list)
    results["duration_seconds"] = duration
    results["successful_count"] = len(results["successful"])
    results["failed_count"] = len(results["failed"])
    
    logger.info(f"Historical data processing completed in {duration:.2f} seconds. "
                f"Successful: {results['successful_count']}, Failed: {results['failed_count']}")
    
    return results

def update_batch_stock_data(stock_list=None, max_workers=5, process_historical=False):
    """Process a batch of stocks concurrently"""
    if stock_list is None:
        stock_list = STOCK_BATCH
    
    # Ensure the stock matches the stock keys which are case sensitive.
    stock_list = [symbol.upper().strip() for symbol in stock_list if symbol]
    
    # Limit max workers to ensure that the YFinance API fetches all needed data
    max_workers = min(max_workers, 5)
    logger.info(f"Using {max_workers} concurrent workers for batch processing")
    
    start_time = time.time()
    logger.info(f"Starting batch processing for {len(stock_list)} stocks")
    
    results = []
    successes = []
    failures = []
    skipped = []
    
    # Get the current Flask app.
    app = current_app._get_current_object()
    
    # Process stocks in smaller batches to avoid rate limiting
    batch_size = max_workers
    stock_batches = [stock_list[i:i + batch_size] for i in range(0, len(stock_list), batch_size)]
    logger.info(f"Divided {len(stock_list)} stocks into {len(stock_batches)} batches of up to {batch_size} stocks each")
    
    for batch_idx, current_batch in enumerate(stock_batches):
        logger.info(f"Processing batch {batch_idx+1}/{len(stock_batches)} with {len(current_batch)} stocks")
        
        # Process each batch with a thread pool.
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all stock processing tasks for this batch
            future_to_stock = {}
            for stock in current_batch:
                logger.info(f"Submitting stock {stock} for processing in batch {batch_idx+1}")
                future = executor.submit(process_stock_with_app_context, stock, app)
                future_to_stock[future] = stock
            
            # Collect results as they complete
            for future in concurrent.futures.as_completed(future_to_stock):
                stock = future_to_stock[future]
                try:
                    result = future.result()
                    results.append(result)
                    
                    if result["status"] == "success":
                        successes.append(stock)
                        logger.info(f"Successfully processed stock: {stock}")
                    elif result["status"] == "error":
                        failures.append(stock)
                        logger.warning(f"Failed to process stock: {stock}, reason: {result.get('message', 'Unknown error')}")
                    elif result["status"] == "skipped":
                        skipped.append(stock)
                        logger.info(f"Skipped processing stock: {stock}")
                except Exception as e:
                    error_detail = traceback.format_exc()
                    logger.error(f"Execution error for {stock}: {str(e)}\n{error_detail}")
                    failures.append(stock)
                    results.append({
                        "stock": stock,
                        "status": "error",
                        "message": f"Execution exception: {str(e)}"
                    })
        
        # Add a delay between batches to prevent rate limiting.
        if batch_idx < len(stock_batches) - 1:  # Don't delay after the final batch.
            delay_between_batches = 3  # 3 seconds delay
            logger.info(f"Batch {batch_idx+1} complete. Waiting {delay_between_batches}s before starting next batch...")
            time.sleep(delay_between_batches)
    
    end_time = time.time()
    duration = end_time - start_time
    
    # Calculate total records added
    total_records_added = 0
    for result in results:
        if result.get("status") == "success":
            total_records_added += result.get("records_added", 0)
    
    # Process historical data if requested
    historical_processing_results = None
    if process_historical and successes:
        logger.info("Starting historical data processing...")
        historical_processing_results = process_historical_data_for_stocks(successes, app)
    
    # Compile the results.
    summary = {
        "batch_size": len(stock_list),
        "successful": len(successes),
        "failed": len(failures),
        "skipped": len(skipped),
        "duration_seconds": duration,
        "total_records_added": total_records_added,
        "successes": successes,
        "failures": failures,
        "skipped": skipped,
        "detailed_results": results,
        "historical_processing": historical_processing_results
    }
    
    logger.info(f"Batch processing completed in {duration:.2f} seconds. "
                f"Successful: {summary['successful']}, Failed: {summary['failed']}, "
                f"Skipped: {summary['skipped']}, Records added: {summary['total_records_added']}")
    return summary

def get_batch_stocks():
    """Get the list of stocks in the batch"""
    return STOCK_BATCH
