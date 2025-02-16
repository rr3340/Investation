import numpy as np
from sklearn.metrics import mean_squared_error
from sklearn.preprocessing import StandardScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dropout, Dense
from sklearn.svm import SVR
from backend.s3services import load_variables_from_s3, save_variables_to_s3
from dotenv import load_dotenv
import os

load_dotenv()

PROCESSED_STORAGE = os.getenv('PROCESSED_STORAGE')
PREDICTION_STORAGE = os.getenv('PREDICTION_STORAGE')
MODEL_STORAGE = os.getenv('MODEL_STORAGE')

def svm_predictor(key):
    variables = {
        'svm_x_test_normalized': (PROCESSED_STORAGE, f'svm_x_test_normalized_{key}.npy'),
        'svm_y_test': (PROCESSED_STORAGE, f'svm_y_test_{key}.npy'),
        'scaler': (MODEL_STORAGE, f'svm_scaler_{key}.pkl'),
        'svr_model': (MODEL_STORAGE, f'svr_model_{key}.pkl'),
        'processed_df': (PROCESSED_STORAGE, f'processed_{key}_stock.csv')
    }
    
    try:
        variables = load_variables_from_s3(variables)
    except RuntimeError as e:
        print(f"Data not found: {e}")
        return

    #Grab all training and testing data necessary, with the model, scaler, and original dataframe

    svm_x_test_normalized = variables.get('svm_x_test_normalized')
    svm_y_test = variables.get('svm_y_test')
    scaler = variables.get('scaler')
    svr_model = variables.get('svr_model')
    svm_df = variables.get('processed_df')

    predictions = svr_model.predict(svm_x_test_normalized) #Predict off of the test set for next value
    mse = mean_squared_error(svm_y_test, predictions) #Get mse

    print(predictions)
    print("Mean Squared Error:", mse)

    rmse = np.sqrt(mse) #Calculate for root mse
    print(f"Root Mean Squared Error (RMSE): {rmse}")

    last_row = svm_df[['Exponential Moving Average',
        'Relative Strength Index', 'Moving Standard Deviation',
        'Upper Band', 'Lower Band', 'Williams R%', '%K Fast', '%D Slow',
        'Price Rate of Change', 'adx', 'Variation']].iloc[-1].to_frame().T #Ensure the last row from the newest df has all features needed

    last_row_scaled = scaler.transform(last_row) #Grab and transform the last row

    next_price_prediction = svr_model.predict(last_row_scaled) #Use the model to predict the last row

    print(f"Predicted Next Stock Price: {next_price_prediction[0]}")

    variables = {
            'svm_predictions': (predictions, PREDICTION_STORAGE, f'svm_predictions_{key}.npy'),
            'svm_original': (svm_y_test, PREDICTION_STORAGE, f'svm_original_{key}.npy'),
            'svm_next_price_prediction': (next_price_prediction[0], PREDICTION_STORAGE, f'svm_next_price_prediction_{key}.npy'),
            'rmse': (rmse, PREDICTION_STORAGE, f'svm_rmse_{key}.npy'),
            'mse': (mse, PREDICTION_STORAGE, f'svm_mse_{key}.npy')
        }

    variables = save_variables_to_s3(variables) #Upload the predicted values
    
import tempfile
from sklearn.metrics import mean_squared_error

def lstm_predictor(key):
    variables = {
        'lstm_test_X': (PROCESSED_STORAGE, f'lstm_test_X_{key}.npy'),
        'lstm_test_y': (PROCESSED_STORAGE, f'lstm_test_y_{key}.npy'),
        'lstm_scaler': (MODEL_STORAGE, f'lstm_scaler_{key}.pkl'),
        'lstm_model': (MODEL_STORAGE, f'lstm_model_{key}.keras')
    }

    try:
        variables = load_variables_from_s3(variables)
    except RuntimeError as e:
        print(f"Data not found: {e}")
        return
    
    lstm_test_X = variables.get('lstm_test_X')
    lstm_test_y = variables.get('lstm_test_y')
    lstm_scaler = variables.get('lstm_scaler')
    lstm_model = variables.get('lstm_model')

    predictions = lstm_model.predict(lstm_test_X) #Tie predictions from the test set into the loaded model

    prediction_copies_array = np.repeat(predictions, lstm_test_X.shape[2], axis=-1) #Copy the predictions, with 3 features per time step
    pred = lstm_scaler.inverse_transform(np.reshape(prediction_copies_array, (len(predictions), lstm_test_X.shape[2])))[:, 0] #Turn away from the scale by inverse transsformation
    #Each feature is duplicated to ensure the inverse transformation can be correctly applied, as is below

    original_copies_array = np.repeat(lstm_test_y, lstm_test_X.shape[2], axis=-1)
    original = lstm_scaler.inverse_transform(np.reshape(original_copies_array, (len(lstm_test_y), lstm_test_X.shape[2])))[:, 0] #Do the same for the original

    print("Predicted Values: ", pred) #Print both to check, not needed
    print("Original Values: ", original)

    prediction_copies_array = np.repeat(predictions, lstm_test_X.shape[2], axis=1) #Predictions and its test shape are repeated to match the number of time steps, and number of features

    predicted_price_original_scale = lstm_scaler.inverse_transform(prediction_copies_array)[:, 0] #Transforms the array back to its original scale

    print(f"Last input time step: {original[-1]}")
    print(f"Predicted next price (original scale): {predicted_price_original_scale[0]}") #Print the redicted next price

    mse = mean_squared_error(original, pred)
    rmse = np.sqrt(mse) #calculate mse and rmse

    print(f"Mean Squared Error (MSE): {mse}")
    print(f"Root Mean Squared Error (RMSE): {rmse}") #Print

    variables = {
            'lstm_predictions': (pred, PREDICTION_STORAGE, f'lstm_predictions_{key}.npy'),
            'lstm_original': (original, PREDICTION_STORAGE, f'lstm_original_{key}.npy'),
            'lstm_next_price_prediction': (predicted_price_original_scale[0], PREDICTION_STORAGE, f'lstm_next_price_prediction_{key}.npy'),
            'rmse': (rmse, PREDICTION_STORAGE, f'lstm_rmse_{key}.npy'),
            'mse': (mse, PREDICTION_STORAGE, f'lstm_mse_{key}.npy')
        }

    variables = save_variables_to_s3(variables) #Upload all results