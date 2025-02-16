from flask_restx import Resource, Namespace, fields
from models import Stock, HistoricStock
from flask import Flask, request,jsonify
from datetime import datetime
from dateutil import parser
import pytz
from flask_jwt_extended import jwt_required
from services import live_pipeline, process_database, svm_scale_database, lstm_scale_database, svm_upload_retrained_model_to_database, lstm_upload_retrained_model_to_database, svm_upload_predictions_to_database, lstm_upload_predictions_to_database, buy_stock, sell_stock, get_latest_price, get_best_prediction, get_historical_data, get_processed_data
from s3services import connect_to_db
from decorator import admin_required

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

@stock_ns.route('/stock')
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
    
@stock_ns.route('/stock/<string:stock_key>')
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
    def get(self):
        """Trigger live pipeline to update stock data"""
        live_pipeline()
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
        process_database()
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
    
@stock_ns.route('/stock/buy_stock')
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

@stock_ns.route('/stock/sell_stock')
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
    
@stock_ns.route('/stock/latest_price/<string:stock_key>')
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

@stock_ns.route('/stock/best_prediction/<string:stock_key>')
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

@historicstock_ns.route('/histstock')
class HistoricStockResource(Resource):
    @jwt_required()
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
        
        
        stock_record.save()
        
        return stock_record, 201
    
@historicstock_ns.route('/histstock/<int:id>')
class HistoricStockResourceById(Resource):
    @jwt_required()
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
    
@historicstock_ns.route('/histstock/historicdata')
class HistoricalDataResource(Resource):
    @jwt_required()
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

            print(f"Received API request: stock_key={stock_key}, start_date={start_date}, end_date={end_date}, interval={interval}, limit={limit}")

            if not stock_key:
                return {"error": "Missing stock_key."}, 400

            try:
                if start_date:
                    start_date = datetime.fromisoformat(start_date)
                    print(f"Parsed start_date: {start_date}")
                if end_date:
                    end_date = datetime.fromisoformat(end_date)
                    print(f"Parsed end_date: {end_date}")
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
            print(f"Exception occurred: {e}")
            return {"error": str(e)}, 500

@historicstock_ns.route('/processed_data/<string:stock_key>')
class ProcessedDataResource(Resource):
    @jwt_required()
    @historicstock_ns.response(200, 'Success')
    @historicstock_ns.response(404, 'Processed data not found')
    def get(self, stock_key):
        """Get processed data for a stock"""
        try:
            processed_data = get_processed_data(stock_key)
            return processed_data.to_dict(orient='records'), 200
        except Exception as e:
            historicstock_ns.abort(404, str(e))