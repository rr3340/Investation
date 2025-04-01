import logging
from datetime import datetime
from flask import current_app
from .upload_processed_stock import process_stocks

# Configure logging
logger = logging.getLogger('historic_stock')

def process_historical_batch(stock_list=None):
    """Process historical data for a batch of stocks"""
    if not stock_list:
        return {
            "status": "error", 
            "message": "No stocks specified for historical processing"
        }
    
    # Initializes the response
    results = {
        "message": "Historical batch processing completed",
        "start_time": datetime.now().isoformat(),
        "stocks_to_process": stock_list
    }
    
    #Process each stock, loading data, applying process_from_database, then saving to an S3 bucke
    logger.info(f"Processing historical data for {len(stock_list)} stocks")
    processing_results = process_stocks(stock_list)
    
    # Adds results to response
    results["processing_results"] = processing_results
    
    #Then calculate the total duration
    results["end_time"] = datetime.now().isoformat()
    start_time = datetime.fromisoformat(results["start_time"])
    end_time = datetime.fromisoformat(results["end_time"])
    duration_seconds = (end_time - start_time).total_seconds()
    results["duration_seconds"] = duration_seconds
    
    # Set the status based on results
    if processing_results.get("successful_count", 0) > 0:
        if processing_results.get("failed_count", 0) > 0:
            results["status"] = "completed_with_errors"
        else:
            results["status"] = "success"
    else:
        results["status"] = "failed"
    
    logger.info(f"Historical batch processing completed in {duration_seconds:.2f} seconds. Status: {results['status']}")
    return results