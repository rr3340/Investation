from flask_restx import Resource, Namespace, fields
from backend.models import Stock, HistoricStock
from flask import Flask, request,jsonify
from datetime import datetime
from dateutil import parser
import pytz
from flask_jwt_extended import jwt_required
from backend.services.stock_pipeline.activate_stock_pipeline import live_pipeline
from backend.services.historic_stock.process_stock import process_from_database
from backend.services.machine_learning.svm_scale_database import svm_scale_database
from backend.services.machine_learning.lstm_scale_database import lstm_scale_database
from backend.services.machine_learning.svm_update_model import svm_upload_retrained_model_to_database
from backend.services.machine_learning.lstm_update_model import lstm_upload_retrained_model_to_database
from backend.services.machine_learning.svm_create_prediction import svm_upload_predictions_to_database
from backend.services.machine_learning.lstm_create_predictions import lstm_upload_predictions_to_database
from backend.services.stock.buy_stock import buy_stock
from backend.services.stock.sell_stock import sell_stock
from backend.services.historic_stock.get_latest_price import get_latest_price
from backend.services.machine_learning.get_best_prediction import get_best_prediction
from backend.services.cloud_storage.connect_to_db import connect_to_db
from backend.utilities.decorators import admin_required

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
    @jwt_required()
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
    @jwt_required()
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
        process_from_database()
        return {"message": "Stock data processed successfully"}, 200
    
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
    @jwt_required()
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
    @jwt_required()
    @stock_ns.response(200, 'Success')
    @stock_ns.response(404, 'Stock not found')
    def get(self, stock_key):
        """Get the best prediction for a stock"""
        try:
            prediction = get_best_prediction(stock_key)
            return prediction, 200
        except Exception as e:
            stock_ns.abort(404, str(e))