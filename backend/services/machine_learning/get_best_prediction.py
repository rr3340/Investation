import os
import numpy as np
from backend.services.cloud_storage.upload_from_db import load_variables_from_s3

PREDICTION_STORAGE = os.getenv("PREDICTION_STORAGE")
def get_best_prediction(stock_key):
    variables = {
        'svm_mse': (PREDICTION_STORAGE, f'svm_mse_{stock_key}.npy'),
        'lstm_mse': (PREDICTION_STORAGE, f'lstm_mse_{stock_key}.npy'),
        'svm_predicted_price': (PREDICTION_STORAGE, f'svm_next_price_prediction_{stock_key}.npy'),
        'lstm_predicted_price': (PREDICTION_STORAGE, f'lstm_next_price_prediction_{stock_key}.npy')
    }

    try:
        variables = load_variables_from_s3(variables)
    except RuntimeError as e:
        return {"error": f"Missing prediction data: {e}"}

    svm_mse = variables.get('svm_mse')
    lstm_mse = variables.get('lstm_mse')
    svm_price = variables.get('svm_predicted_price')
    lstm_price = variables.get('lstm_predicted_price')
    
    if svm_mse is None or lstm_mse is None or svm_price is None or lstm_price is None:
        return {"error": "Incomplete prediction data"}
    
    svm_mse = svm_mse.item() if isinstance(svm_mse, np.ndarray) else svm_mse
    lstm_mse = lstm_mse.item() if isinstance(lstm_mse, np.ndarray) else lstm_mse
    svm_price = svm_price.item() if isinstance(svm_price, np.ndarray) else svm_price
    lstm_price = lstm_price.item() if isinstance(lstm_price, np.ndarray) else lstm_price

    #Compare MSE values
    if svm_mse < lstm_mse:
        best_model = "SVM"
        best_price = svm_price
    else:
        best_model = "LSTM"
        best_price = lstm_price

    return {
        "stock_key": stock_key,
        "best_model": best_model,
        "best_predicted_price": best_price,
        "svm_mse": svm_mse,
        "lstm_mse": lstm_mse
    }