from backend.models.historicstock import HistoricStock
from backend.exts import db
from sqlalchemy import func
import logging

# Configure logging
logger = logging.getLogger('historic_stock_cleanup')

def cleanup_duplicate_datetimes_for_stock(stock_key):
    """Remove duplicate datetime entries for a specific stock."""
    logger.info(f"Starting duplicate datetime cleanup for stock: {stock_key}")
    
    try:
        #Find duplicate datetime entries for a specific stock
        # This query gets the count and groups by stock_key and datetimes.
        duplicate_groups = db.session.query(
            HistoricStock.stock_key,
            HistoricStock.datetime,
            func.count(HistoricStock.record_id).label('count')
        ).filter(
            HistoricStock.stock_key == stock_key
        ).group_by(
            HistoricStock.stock_key,
            HistoricStock.datetime
        ).having(
            func.count(HistoricStock.record_id) > 1
        ).all()
        
        logger.info(f"Found {len(duplicate_groups)} groups of duplicate datetimes for {stock_key}")
        
        # Process each group of duplicates.
        total_deleted = 0
        for group in duplicate_groups:
            # Get all records for each group.
            duplicate_records = HistoricStock.query.filter(
                HistoricStock.stock_key == group.stock_key,
                HistoricStock.datetime == group.datetime
            ).order_by(
                HistoricStock.record_id.desc()
            ).all()
            
            # Keep the first record, being the highest record_id and delete the rest
            for record in duplicate_records[1:]:
                db.session.delete(record)
                total_deleted += 1
        
        #Commit all the deletions.
        db.session.commit()
        logger.info(f"Successfully deleted {total_deleted} duplicate records for {stock_key}")
        
        return {
            "status": "success",
            "stock": stock_key,
            "duplicate_groups_found": len(duplicate_groups),
            "total_records_deleted": total_deleted
        }
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error cleaning up duplicates for {stock_key}: {str(e)}")
        return {
            "status": "error",
            "stock": stock_key,
            "error": str(e)
        }

def cleanup_duplicate_datetimes_all_stocks():
    """Remove duplicate datetime entries for all stocks in the database."""

    logger.info("Starting duplicate datetime cleanup for all stocks")
    
    try:
        #Find all stocks with data.
        stocks = db.session.query(HistoricStock.stock_key).distinct().all()
        stock_keys = [stock.stock_key for stock in stocks]
        
        logger.info(f"Found {len(stock_keys)} stocks with data")
        
        #Process each stock.
        results = []
        total_deleted = 0
        
        for stock_key in stock_keys:
            stock_result = cleanup_duplicate_datetimes_for_stock(stock_key)
            results.append(stock_result)
            
            if stock_result["status"] == "success":
                total_deleted += stock_result["total_records_deleted"]
        
        # Count successes and failures.
        success_count = sum(1 for result in results if result["status"] == "success")
        failure_count = len(results) - success_count
        
        return {
            "status": "success",
            "total_stocks_processed": len(stock_keys),
            "successful_cleanups": success_count,
            "failed_cleanups": failure_count,
            "total_records_deleted": total_deleted,
            "detailed_results": results
        }
        
    except Exception as e:
        logger.error(f"Error in overall cleanup process: {str(e)}")
        return {
            "status": "error",
            "error": str(e)
        } 