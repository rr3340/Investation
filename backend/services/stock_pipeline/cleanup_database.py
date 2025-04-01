from backend.models.historicstock import HistoricStock
from backend.exts import db
from datetime import datetime
import pytz
import logging

# Configure logging
logger = logging.getLogger('stock_cleanup')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def cleanup_future_nulls():
    """Clean up the database by removing any stock records that are null or have future dates."""
    logger.info("Starting database cleanup for future dates and NULL values")
    now = datetime.now(pytz.UTC)
    
    #Find records with future dates.
    future_records = HistoricStock.query.filter(HistoricStock.datetime > now).all()
    logger.info(f"Found {len(future_records)} records with future dates")
    
    #Find records with NULL values in essential price fields.
    null_price_records = HistoricStock.query.filter(
        (HistoricStock.open.is_(None)) | 
        (HistoricStock.high.is_(None)) | 
        (HistoricStock.low.is_(None)) | 
        (HistoricStock.close.is_(None))
    ).all()
    logger.info(f"Found {len(null_price_records)} records with NULL price values")
    
    # Combine the sets, might be some overlap.
    records_to_delete = set(future_records + null_price_records)
    logger.info(f"Total unique records to delete: {len(records_to_delete)}")
    
    # Group by stock symbol for reporting.
    stock_counts = {}
    for record in records_to_delete:
        if record.stock_key not in stock_counts:
            stock_counts[record.stock_key] = 0
        stock_counts[record.stock_key] += 1
    
    # Delete the bad records.
    deleted_count = 0
    try:
        for record in records_to_delete:
            db.session.delete(record)
            deleted_count += 1
        
        db.session.commit()
        logger.info(f"Successfully deleted {deleted_count} problematic records")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error during deletion: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "deleted_count": 0
        }
    
    return {
        "status": "success",
        "future_records_found": len(future_records),
        "null_records_found": len(null_price_records),
        "total_deleted": deleted_count,
        "affected_stocks": stock_counts
    }

def cleanup_specific_stock(stock_key):
    """Clean up a specific stock by removing records with future dates or NULL values"""
    logger.info(f"Starting cleanup for stock: {stock_key}")
    now = datetime.now(pytz.UTC)
    
    # Find problematic records for this stock.
    problematic_records = HistoricStock.query.filter(
        HistoricStock.stock_key == stock_key,
        (
            (HistoricStock.datetime > now) |
            (HistoricStock.open.is_(None)) | 
            (HistoricStock.high.is_(None)) | 
            (HistoricStock.low.is_(None)) | 
            (HistoricStock.close.is_(None))
        )
    ).all()
    
    logger.info(f"Found {len(problematic_records)} problematic records for {stock_key}")
    
    #Delete the records.
    deleted_count = 0
    try:
        for record in problematic_records:
            db.session.delete(record)
            deleted_count += 1
        
        db.session.commit()
        logger.info(f"Successfully deleted {deleted_count} problematic records for {stock_key}")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error during deletion: {str(e)}")
        return {
            "status": "error",
            "stock": stock_key,
            "error": str(e),
            "deleted_count": 0
        }
    
    return {
        "status": "success",
        "stock": stock_key,
        "total_deleted": deleted_count
    }