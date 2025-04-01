from flask_restx import Resource, Namespace, fields
from backend.models import HistoricStock
from flask import Flask, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime
from dateutil import parser
import pytz
from backend.utilities.decorators import admin_required
from backend.services.historic_stock.get_processed_stock import get_processed_data
from backend.services.historic_stock.get_historical_stock import get_historical_data
from backend.services.historic_stock.cleanup_duplicate_datetimes import cleanup_duplicate_datetimes_for_stock, cleanup_duplicate_datetimes_all_stocks
import logging

logger = logging.getLogger('historicstock_routes')

historicstock_ns = Namespace('histstock', description='Historic stock related operations')

historic_stock_model = historicstock_ns.model(
    'HistoricStock',
    {
        "record_id": fields.Integer(required=True, description="Record ID", example=1),
        "stock_key": fields.String(required=True, description="Stock key", example="AAPL"),
        "datetime": fields.DateTime(required=True, description="Datetime", example="2021-09-01T00:00:00Z"),
        "open": fields.Float(required=False, description="Open price", example=145.00),
        "high": fields.Float(required=False, description="High price", example=155.00),
        "low": fields.Float(required=False, description="Low price", example=140.00),
        "close": fields.Float(required=False, description="Close price", example=150.00),
        "volume": fields.Float(required=False, description="Volume", example=1000000)
    }
)

@historicstock_ns.route('/')
class HistoricStockResource(Resource):
    @historicstock_ns.marshal_list_with(historic_stock_model)
    def get(self):
        """Get all historic stocks"""
        all_stock = HistoricStock.query.all()
        return all_stock
    
    @jwt_required()
    @admin_required
    @historicstock_ns.marshal_with(historic_stock_model)
    @historicstock_ns.expect(historic_stock_model)
    def post(self):
        """Create a historic stock record"""
        data = request.get_json()
        
        datetime_obj = parser.parse(data.get("datetime"))
        
        stock_record = HistoricStock(
            stock_key=data.get("stock_key"),
            datetime=datetime_obj,
            open=data.get("open"),
            high=data.get("high"),
            low=data.get("low"),
            close=data.get("close"),
            volume=data.get("volume")
        )
        
        # Save the stock record to the database
        stock_record.save()
        
        return stock_record, 201
    
@historicstock_ns.route('/<int:id>')
class HistoricStockResourceById(Resource):
    @historicstock_ns.marshal_with(historic_stock_model)
    def get(self, id):
        """Get historic stock information by the id"""
        all_hist_stock = HistoricStock.query.get_or_404(id)
        
        return all_hist_stock
    
    @jwt_required()
    @admin_required
    @historicstock_ns.marshal_with(historic_stock_model)
    def put(self, id):
        """Update historic stock"""
        update_stock_record = HistoricStock.query.get_or_404(id)
        data = request.get_json()
        datetime_obj = parser.parse(data["datetime"])
        data["datetime"] = datetime_obj
        update_stock_record.update(**data)
        return update_stock_record
    
    @jwt_required()
    @admin_required
    @historicstock_ns.marshal_with(historic_stock_model)
    def delete(self, id):
        """Delete historic stock by id"""
        delete_stock_record = HistoricStock.query.get_or_404(id)
        
        delete_stock_record.delete()
        
        return delete_stock_record
    
@historicstock_ns.route('/historicdata')
class HistoricalDataResource(Resource):
    @historicstock_ns.response(200, 'Success')
    @historicstock_ns.response(400, 'Invalid input')
    @historicstock_ns.response(404, 'Stock not found')
    def post(self):
        try:
            data = request.get_json()
            if not data:
                return {"error": "Missing JSON payload."}, 400

            stock_key = data.get("stock_key")
            start_date = data.get("start_date")
            end_date = data.get("end_date")
            interval = data.get("interval")
            limit = data.get("limit")

            # print(f"Received API request: stock_key={stock_key}, start_date={start_date}, end_date={end_date}, interval={interval}, limit={limit}")

            if not stock_key:
                return {"error": "Missing stock_key."}, 400

            try:
                if start_date:
                    start_date = datetime.fromisoformat(start_date)
                    # print(f"Parsed start_date: {start_date}")
                if end_date:
                    end_date = datetime.fromisoformat(end_date)
                    # print(f"Parsed end_date: {end_date}")
            except ValueError:
                return {"error": "Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)."}, 400

            if interval:
                try:
                    interval = int(interval)
                except ValueError:
                    return {"error": "Invalid interval. It must be an integer."}, 400

            if limit:
                try:
                    limit = int(limit)
                except ValueError:
                    return {"error": "Invalid limit. It must be an integer."}, 400

            historical_data = get_historical_data(stock_key, interval, start_date, end_date, limit)

            return historical_data.to_dict(orient='records'), 200

        except Exception as e:
            # print(f"Exception occurred: {e}")
            return {"error": str(e)}, 500

@historicstock_ns.route('/processed_data/<string:stock_key>')
class ProcessedDataResource(Resource):
    @historicstock_ns.response(200, 'Success')
    @historicstock_ns.response(404, 'Processed data not found')
    def get(self, stock_key):
        """Get processed data for a stock"""
        try:
            processed_data = get_processed_data(stock_key)
            return processed_data.to_dict(orient='records'), 200
        except Exception as e:
            historicstock_ns.abort(404, str(e))

@historicstock_ns.route('/cleanup_duplicates')
class CleanupDuplicatesResource(Resource):
    @jwt_required()
    @admin_required
    @historicstock_ns.response(200, 'Success')
    @historicstock_ns.response(400, 'Invalid input')
    @historicstock_ns.response(500, 'Server error')
    def post(self):
        try:
            data = request.get_json() or {}
            
            # Check if a specific stock was provided
            if 'stock_key' in data and data['stock_key']:
                stock_key = data['stock_key'].upper()
                logger.info(f"Initiating duplicate datetime cleanup for specific stock: {stock_key}")
                result = cleanup_duplicate_datetimes_for_stock(stock_key)
                
                return {
                    "message": f"Duplicate datetime cleanup completed for {stock_key}",
                    "details": result
                }, 200
            else:
                # Clean up duplicates for all stocks
                logger.info("Initiating duplicate datetime cleanup for all stocks")
                result = cleanup_duplicate_datetimes_all_stocks()
                
                return {
                    "message": "Duplicate datetime cleanup completed for all stocks",
                    "details": result
                }, 200
                
        except Exception as e:
            logger.error(f"Error during duplicate datetime cleanup: {str(e)}")
            return {"error": f"Cleanup failed: {str(e)}"}, 500

@historicstock_ns.route('/cleanup_duplicates/<string:stock_key>')
class CleanupDuplicatesByStockResource(Resource):
    @jwt_required()
    @admin_required
    @historicstock_ns.response(200, 'Success')
    @historicstock_ns.response(404, 'Stock not found')
    @historicstock_ns.response(500, 'Server error')
    def post(self, stock_key):
        try:
            stock_key = stock_key.upper()
            logger.info(f"Initiating duplicate datetime cleanup for stock: {stock_key}")
            
            # Check if stock exists
            stock_exists = HistoricStock.query.filter_by(stock_key=stock_key).first() is not None
            if not stock_exists:
                return {"error": f"Stock {stock_key} not found in historical data"}, 404
            
            result = cleanup_duplicate_datetimes_for_stock(stock_key)
            
            return {
                "message": f"Duplicate datetime cleanup completed for {stock_key}",
                "details": result
            }, 200
            
        except Exception as e:
            logger.error(f"Error cleaning up duplicates for {stock_key}: {str(e)}")
            return {"error": f"Cleanup failed: {str(e)}"}, 500