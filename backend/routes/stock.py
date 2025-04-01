from flask_restx import Resource, Namespace, fields
from backend.models import Stock, HistoricStock
from flask import Flask, request,jsonify
from datetime import datetime
from dateutil import parser
import pytz
from flask_jwt_extended import jwt_required
from backend.services.stock_pipeline.activate_stock_pipeline import live_pipeline
from backend.services.stock_pipeline.batch_processor import update_batch_stock_data, get_batch_stocks
from backend.services.historic_stock.batch_historical_processor import process_historical_batch
from backend.services.historic_stock.upload_processed_stock import process_database, process_stocks, convert_processed_to_utc
from backend.services.machine_learning.svm_scale_database import svm_scale_database
from backend.services.machine_learning.lstm_scale_database import lstm_scale_database
from backend.services.machine_learning.svm_update_model import svm_upload_retrained_model_to_database
from backend.services.machine_learning.lstm_update_model import lstm_upload_retrained_model_to_database
from backend.services.machine_learning.svm_create_prediction import svm_upload_predictions_to_database
from backend.services.machine_learning.lstm_create_predictions import lstm_upload_predictions_to_database
from backend.services.machine_learning.ml_pipeline_automation import automate_ml_pipeline, terminate_ml_pipeline, get_active_ml_pipelines, active_ml_pipelines
from backend.services.stock.buy_stock import buy_stock
from backend.services.stock.sell_stock import sell_stock
from backend.services.historic_stock.get_latest_price import get_latest_price
from backend.services.machine_learning.get_best_prediction import get_best_prediction
from backend.services.cloud_storage.connect_to_db import connect_to_db
from backend.utilities.decorators import admin_required
import time
import concurrent.futures
from flask import current_app
import logging
import threading
import uuid
import json
from datetime import datetime, timedelta
from backend.services.stock_pipeline.cleanup_database import cleanup_future_nulls, cleanup_specific_stock
from backend.services.stock_pipeline.analyze_future_dates import analyze_future_dates, get_future_dates_by_stock

# Configure logging
logger = logging.getLogger('stock_routes')

stock_ns = Namespace('stock', description = 'Stock related operations')

stock_model = stock_ns.model(
    'Stock',
    {
        "stock_key": fields.String(required=True, description="Stock key", example="AAPL"),
        "name": fields.String(required=True, description="Stock name", example="Apple Inc."),
        "sector": fields.String(required=True, description="Sector", example="Technology"),
        "industry": fields.String(required=True, description="Industry", example="Consumer Electronics")
    }
)

@stock_ns.route('/')
class StockResource(Resource):
    @stock_ns.marshal_list_with(stock_model)
    def get(self):
        """Get all stocks"""
        stocks = Stock.query.all()
        return stocks
    
    @jwt_required()
    @admin_required
    @stock_ns.marshal_with(stock_model)
    @stock_ns.expect(stock_model)
    def post(self):
        """Create a stock"""
        data = request.get_json()

        new_stock = Stock(
            stock_key=data.get("stock_key"),
            name=data.get("name"),
            sector=data.get("sector"),
            industry=data.get("industry")
        )
        
        new_stock.save()
        
        return new_stock, 201
    
@stock_ns.route('/<string:stock_key>')
class StockResourceById(Resource):
    @stock_ns.marshal_with(stock_model)
    def get(self, stock_key):
        """Get stock information by the id"""
        
        stock = Stock.query.get_or_404(stock_key)
        
        return stock
    
    @jwt_required()
    @admin_required
    @stock_ns.marshal_with(stock_model)
    def put(self, stock_key):
        """Update stock"""
        update_stock = Stock.query.get_or_404(stock_key)
        data = request.get_json()
        update_stock.update(**data)
        return update_stock
    
    @jwt_required()
    @admin_required
    @stock_ns.marshal_with(stock_model)
    def delete(self, stock_key):
        """Delete stock by id"""
        delete_stock = Stock.query.get_or_404(stock_key)
        
        delete_stock.delete()
        
        return delete_stock

@stock_ns.route('/update_stock_data')
class UpdateStockDataResource(Resource):
    @jwt_required()
    @admin_required
    def post(self):
        """Trigger live pipeline to update stock data"""
        data = request.get_json()
        key = data.get('key')
        live_pipeline(key)
        return {"message": "Stock data updated successfully"}, 200
    
@stock_ns.route('/connect_to_s3')
class ConnectToStockDataResource(Resource):
    @jwt_required()
    def get(self):
        """Test S3 connection and list available buckets"""
        try:
            s3 = connect_to_db()
            buckets = [bucket.name for bucket in s3.buckets.all()]
            return {
                "message": "S3 connected successfully",
                "buckets": buckets,
                "total_buckets": len(buckets)
            }, 200
        except Exception as e:
            return {"error": str(e)}, 500

@stock_ns.route('/scale_stock_data_svm')
class ScaleStockDataSVMResource(Resource):
    @jwt_required()
    @admin_required
    def post(self):
        data = request.get_json()
        key = data.get('key')
        svm_scale_database(key)
        return {"message": "Stock data scaled successfully - SVM"}, 200
    
@stock_ns.route('/scale_stock_data_lstm')
class ScaleStockDataLSTMResource(Resource):
    @jwt_required()
    @admin_required
    def post(self):
        data = request.get_json()
        key = data.get('key')
        lstm_scale_database(key)
        return {"message": "Stock data scaled successfully - LSTM"}, 200
    
@stock_ns.route('/process_stock_data')
class ProcessStockDataResource(Resource):
    @jwt_required()
    @admin_required
    def get(self):
        """Trigger live pipeline to process stock data"""
        try:
            # Process all historical stock data
            result = process_database()
            
            return {"message": "Stock data processed successfully", "result": result}, 200
        except Exception as e:
            return {"error": f"Error processing stock data: {str(e)}"}, 500
    
@stock_ns.route('/train_svm_model')
class TrainSVMModelStockDataResource(Resource):
    @jwt_required()
    @admin_required
    def post(self):
        """Trigger live pipeline to process stock data"""
        data = request.get_json()
        key = data.get('key')
        svm_upload_retrained_model_to_database(key)
        return {"message": "Successfully updated SVM training model"}, 200
    
@stock_ns.route('/train_lstm_model')
class TrainLSTMModelStockDataResource(Resource):
    @jwt_required()
    @admin_required
    def post(self):
        """Trigger live pipeline to process stock data"""
        data = request.get_json()
        key = data.get('key')
        lstm_upload_retrained_model_to_database(key)
        return {"message": "Successfully updated LSTM training model"}, 200
    
@stock_ns.route('/predict_svm_model')
class PredictSVMModelStockDataResource(Resource):
    @jwt_required()
    @admin_required
    def post(self):
        """Trigger live pipeline to process stock data"""
        data = request.get_json()
        key = data.get('key')
        svm_upload_predictions_to_database(key)
        return {"message": "Successfully predicted future stock data interval on SVM training model"}, 200
    
@stock_ns.route('/predict_lstm_model')
class PredictLSTMModelStockDataResource(Resource):
    @jwt_required()
    @admin_required
    def post(self):
        """Trigger live pipeline to process stock data"""
        data = request.get_json()
        key = data.get('key')
        lstm_upload_predictions_to_database(key)
        return {"message": "Successfully predicted future stock data interval on LSTM training model"}, 200
    
@stock_ns.route('/buy_stock')
class BuyStockResource(Resource):
    @jwt_required()
    @stock_ns.expect(stock_model)
    def post(self):
        """Buy stock"""
        data = request.get_json()
        user_id = data.get("user_id")
        stock_key = data.get("stock_key")
        quantity = data.get("quantity")
        buy_stock(user_id, stock_key, quantity)
        return {"message": f"Successfully bought {quantity} shares of {stock_key}"}, 200

@stock_ns.route('/sell_stock')
class SellStockResource(Resource):
    @jwt_required()
    @stock_ns.expect(stock_model)
    def post(self):
        """Sell stock"""
        data = request.get_json()
        user_id = data.get("user_id")
        stock_key = data.get("stock_key")
        quantity = data.get("quantity")
        sell_stock(user_id, stock_key, quantity)
        return {"message": f"Successfully sold {quantity} shares of {stock_key}"}, 200
    
@stock_ns.route('/latest_price/<string:stock_key>')
class LatestPriceResource(Resource):
    @stock_ns.response(200, 'Success')
    @stock_ns.response(404, 'Stock not found')
    def get(self, stock_key):
        """Get the latest price of a stock"""
        try:
            latest_price = get_latest_price(stock_key)
            return latest_price, 200
        except Exception as e:
            stock_ns.abort(404, str(e))

@stock_ns.route('/best_prediction/<string:stock_key>')
class BestPredictionResource(Resource):
    @stock_ns.response(200, 'Success')
    @stock_ns.response(404, 'Stock not found')
    def get(self, stock_key):
        """Get the best prediction for a stock"""
        try:
            prediction = get_best_prediction(stock_key)
            return prediction, 200
        except Exception as e:
            stock_ns.abort(404, str(e))

@stock_ns.route('/update_batch_stock_data')
class UpdateBatchStockDataResource(Resource):
    @jwt_required()
    def post(self):
        """Trigger batch processing to update multiple stocks at once"""
        try:
            #Default values of the code
            max_workers = 5
            stock_list = None #If there is no stock list, then do on all stock
            process_historical = False #Always set to false to ensure fetches aren't interrupted.
            
            #Check for a json payload, usually sent {} from the client.
            if request.is_json and request.get_json():
                data = request.get_json() #Then get the data.
                
                #If workers are requested, then adjust
                if 'max_workers' in data:
                    requested_workers = int(data.get('max_workers')) #Ensure correct type.
                    #Limit between 1-5 
                    max_workers = max(1, min(requested_workers, 5))
                
                #Check if hist_processing is requested, and do if so. 
                if 'process_historical' in data:
                    process_historical = bool(data.get('process_historical'))
                
                #Ensure that stocks are not empty and upper case to match case sensitive keys.
                if 'stocks' in data and isinstance(data['stocks'], list):
                    stock_list = [stock.upper().strip() for stock in data['stocks'] 
                                 if stock and isinstance(stock, str)]
                    
                    if not stock_list:
                        return {"error": "No valid stock symbols provided in the custom list"}, 400
            
            #Log everythingrelevant.
            logger.info(f"Batch update configuration: max_workers={max_workers}, " +
                       f"process_historical={process_historical}, " +
                       f"custom_stocks={'Yes' if stock_list else 'No (using default)'}")
            
            #Then use the update_batch_stock_data function.
            result = update_batch_stock_data(stock_list=stock_list, max_workers=max_workers, process_historical=process_historical)
            
            #Count the new stock created if relevant. Will be automatically registered.
            newly_created = []
            for res in result['detailed_results']:
                if res.get('status') == 'success' and res.get('stock_created') == 'newly created':
                    newly_created.append(res['stock'])
            
            #Then build the responses depending on what happened.
            batch_type = "custom" if stock_list else "default"
            successful = result["successful"]
            total = result["batch_size"]
            
            return {
                "message": f"Processed {batch_type} batch of stocks. {successful}/{total} stocks updated successfully.",
                "summary": { #Return all. total_records_added should equal the #  of stock * how many intervals. Running several times may be
                    #necessary due to yfinance's limited API.
                    "batch_type": batch_type,
                    "total_processed": total,
                    "successful": successful,
                    "failed": result["failed"],
                    "newly_created": len(newly_created),
                    "duration_seconds": result["duration_seconds"],
                    "total_records_added": result["total_records_added"],
                    "failed_stocks": result["failures"] if result["failed"] > 0 else [],
                    "newly_created_stocks": newly_created
                }
            }, 200
                
        except Exception as e:
            logger.error(f"Batch processing error: {str(e)}")
            return {"error": f"Batch processing error: {str(e)}"}, 500

@stock_ns.route('/get_batch_stocks')
class GetBatchStocksResource(Resource):
    def get(self):
        """Get the list of stocks within the batch processing"""
        try:
            #Get the list of stocks from the services
            stock_batch = get_batch_stocks()
            stocks_data = []
            
            #Fetch for additional details
            for symbol in stock_batch:
                stock_info = {
                    "symbol": symbol
                }
                
                #Get stock details  if they exist per stock key
                try:
                    stock = Stock.query.filter_by(stock_key=symbol).first()
                    if stock:
                        stock_info.update({
                            "name": stock.name,
                            "sector": stock.sector,
                            "industry": stock.industry
                        })
                except Exception:
                    #Use symbol if details cannot be fetched
                    pass
                
                stocks_data.append(stock_info)
            
            return {
                "message": "Successfully retrieved batch stocks list",
                "count": len(stock_batch),
                "stocks": stocks_data
            }, 200
                
        except Exception as e:
            return {"error": f"Error retrieving batch stocks: {str(e)}"}, 500

@stock_ns.route('/process_historical_batch')
class ProcessHistoricalBatchResource(Resource):
    @jwt_required()
    def post(self):
        try:
            """Process historical data for a batch of stocks"""
            #Get params or nothing if nothing is retured
            data = request.get_json() or {}
            stock_list = data.get('stocks', None) #Then get the stocks. If there is no list, then it is None. None uses all stocks.
            
            #Determine what stocks there are to process, turn upper case for key case sensitivity
            if stock_list:
                stocks_to_process = [s.upper().strip() for s in stock_list if s]
            else:
                #If there are no stocks, then get all batch stocks.
                stocks_to_process = get_batch_stocks()
            
            #Then call the process_historical_batch service function.
            results = process_historical_batch(stocks_to_process)
            
            #There are next steps in order to inform the user on what to / will be invoked next. On the client, you'll need to click on a stock's page
            #to get the predictions for that specific stock.
            results["next_step"] = "Use /stock/best_prediction/{stock_key} to get the predictions for specific stocks"
            if results.get("processing_results", {}).get("successful", []):
                example_stock = results["processing_results"]["successful"][0]
                results["example_prediction_url"] = f"/stock/best_prediction/{example_stock}"
            
            return results, 200
                
        except Exception as e:
            error_msg = f"Error processing historical batch: {str(e)}"
            logger.error(error_msg)
            return {"error": error_msg}, 500

@stock_ns.route('/automate_ml_pipeline')
class AutomateMLPipelineResource(Resource):
    @jwt_required()
    def post(self):
        """Process ML training and predictions for stocks (assumes historical data is already processed)"""
        try:
            #Get req parameters from requests, if none, do all
            data = request.get_json() or {}
            stock_list = data.get('stocks', None)
            prediction_only = data.get('prediction_only', False)
            max_workers = data.get('max_workers', 3)
            
            #Call the automation per specific stock or stock list if given, or all stock.
            results = automate_ml_pipeline(stock_list=stock_list, prediction_only=prediction_only, max_workers=max_workers)
            
            return results, 200
            
        except Exception as e:
            logger.error(f"Error in ML pipeline: {str(e)}")
            return {"error": f"Error in ML pipeline: {str(e)}"}, 500

@stock_ns.route('/terminate_ml_pipeline')
class TerminateMLPipelineResource(Resource):
    @jwt_required()
    def post(self):
        """Terminate ML pipeline process for a specific stock"""
        try:
            #Get request parameters, if there is nothing then it is all stocs.
            data = request.get_json() or {}
            stock_key = data.get('stock_key')
            
            #Call the ML service for terminating a pipeline when we tab off.
            result = terminate_ml_pipeline(stock_key)
            
            #Check if there is an error.
            if isinstance(result, tuple) and len(result) == 2 and isinstance(result[0], dict) and result[0].get('error'):
                return result
            
            return result, 200
            
        except Exception as e:
            logger.error(f"Error terminating ML pipeline: {str(e)}")
            return {"error": f"Error terminating ML pipeline: {str(e)}"}, 500

@stock_ns.route('/convert_processed_to_utc')
class ConvertProcessedToUTCResource(Resource):
    def post(self):
        """Convert existing processed stock data to use explicit UTC timezone"""
        try:
            data = request.get_json() or {}
            
            stock_list = None
            if 'stocks' in data and data['stocks']:
                stock_list = [s.upper().strip() for s in data['stocks'] if s]
                
            logger.info(f"Converting processed data to UTC for stocks: {stock_list or 'all available'}")
            
            #Converts the processed stock to UTC to maintain timing consistency.
            results = convert_processed_to_utc(stock_list)
            
            #Response for the conversions.
            if results.get("successful_count", 0) > 0:
                if results.get("failed_count", 0) > 0:
                    status_msg = f"Partially successful: {results['successful_count']} converted, {results['failed_count']} failed"
                else:
                    status_msg = f"All {results['successful_count']} stocks successfully converted to UTC"
            else:
                status_msg = "No stocks were successfully converted to UTC"
                
            return {
                "status": "success" if results.get("successful_count", 0) > 0 else "error",
                "message": status_msg,
                "details": results
            }, 200
            
        except Exception as e:
            error_msg = f"Error converting processed data to UTC: {str(e)}"
            logger.error(error_msg)
            return {"status": "error", "message": error_msg}, 500

@stock_ns.route('/cleanup_stock_data')
class CleanupStockDataResource(Resource):
    @jwt_required()
    @admin_required
    def post(self):
        #Cleans all null or future dates if scraped. Happenned with the yfinance API by mistake from the client side.
        #Unneeded now, but will be kept for data cleaning purposes while testing.
        try:
            """Clean the database of any future dates or null values"""
            data = request.get_json() or {}
            
            #Check for which specific stock as always, or else, do all stock
            if 'stock_key' in data and data['stock_key']:
                stock_key = data['stock_key'].upper()
                logger.info(f"Initiating database cleanup for specific stock: {stock_key}")
                result = cleanup_specific_stock(stock_key)
                
                return {
                    "message": f"Cleanup completed for {stock_key}",
                    "details": result
                }, 200
            else:
                logger.info("Initiating database cleanup for all stocks")
                result = cleanup_future_nulls()#Clean these records.
                
                return {
                    "message": "Database cleanup completed",
                    "details": result
                }, 200
        except Exception as e:
            logger.error(f"Error during database cleanup: {str(e)}")
            return {"error": f"Cleanup failed: {str(e)}"}, 500

@stock_ns.route('/analyze_future_dates')
class AnalyzeFutureDatesResource(Resource):
    @jwt_required()
    @admin_required
    def get(self):
        """Analyze why future dates are being created in the database"""
        try:
            logger.info("Initiating analysis of future dates in the database")
            result = analyze_future_dates() #See if there are future dates overall.
            
            return result, 200
        except Exception as e:
            logger.error(f"Error analyzing future dates: {str(e)}")
            return {"error": f"Analysis failed: {str(e)}"}, 500

@stock_ns.route('/analyze_future_dates/<string:stock_key>')
class AnalyzeFutureDatesByStockResource(Resource):
    @jwt_required()
    @admin_required
    def get(self, stock_key):
        """Analyze why future dates are being created in the database for a specific stock"""
        try:
            stock_key = stock_key.upper()
            logger.info(f"Initiating analysis of future dates for stock: {stock_key}")
            result = get_future_dates_by_stock(stock_key) #See if there are future dates per stock.
            
            return result, 200
        except Exception as e:
            logger.error(f"Error analyzing future dates for {stock_key}: {str(e)}")
            return {"error": f"Analysis failed: {str(e)}"}, 500