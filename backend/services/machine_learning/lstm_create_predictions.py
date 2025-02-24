import requests
from backend.models.stock import Stock

def lstm_upload_predictions_to_database(key):
    if key:
        response = requests.post('http://localhost:5001/ml/predict_lstm', json={'key': key})
        return response.json(), response.status_code
    else:
        stocks = Stock.query.all()
        for stock in stocks:
            stock_key = stock.stock_key
            response = requests.post('http://localhost:5001/ml/predict_lstm', json={'key': stock_key})
            if response.status_code != 200:
                return response.json(), response.status_code
        return {"message": "Successfully predicted LSTM model for all stocks"}, 200