import numpy as np
from sklearn.svm import SVR
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dropout, Dense
from sklearn.metrics import mean_squared_error
from backend.s3services import load_variables_from_s3, save_variables_to_s3
from dotenv import load_dotenv
import os

load_dotenv()

PROCESSED_STORAGE = os.getenv('PROCESSED_STORAGE')
PREDICTION_STORAGE = os.getenv('PREDICTION_STORAGE')
MODEL_STORAGE = os.getenv('MODEL_STORAGE')

def retrain_svm_model(key):
    
    scaler_variables = {
        'svm_x_train_normalized': (PROCESSED_STORAGE, f'svm_x_train_normalized_{key}.npy'),
        'svm_y_train': (PROCESSED_STORAGE, f'svm_y_train_{key}.npy')
    }
    
    df = load_variables_from_s3(scaler_variables)
    
    svm_x_train_normalized = df.get('svm_x_train_normalized')
    svm_y_train = df.get('svm_y_train')
    
    svm_variable = {
        'svr_model': (MODEL_STORAGE, f'svr_model_{key}.pkl')
    }
    
    try:
        model = load_variables_from_s3(svm_variable)
        svr_model = model.get('svr_model')
    except RuntimeError as e:
        print(f"Model not found, creating a new one: {e}")
        svr_model = build_svm_model()  #If SVM model isn't present, create a new one
    
    print(svm_x_train_normalized, svm_y_train)

    svr_model.fit(svm_x_train_normalized, svm_y_train) #Fit training data into model, retrain

    variables = {
        'svr_model': (svr_model, MODEL_STORAGE, f'svr_model_{key}.pkl')
    }

    variables = save_variables_to_s3(variables) #Upload retrained model

def retrain_lstm_model(key):
    
    scaler_variables = {
        'lstm_train_X': (PROCESSED_STORAGE, f'lstm_train_X_{key}.npy'),
        'lstm_test_X': (PROCESSED_STORAGE, f'lstm_test_X_{key}.npy'),
        'lstm_train_y': (PROCESSED_STORAGE, f'lstm_train_y_{key}.npy'),
        'lstm_test_y': (PROCESSED_STORAGE, f'lstm_test_y_{key}.npy')
    }

    df = load_variables_from_s3(scaler_variables) #same as above

    lstm_train_X = df.get('lstm_train_X')
    lstm_test_X = df.get('lstm_test_X')
    lstm_train_y = df.get('lstm_train_y')
    lstm_test_y = df.get('lstm_test_y')
    
    lstm_variable = {
        'lstm_model': (MODEL_STORAGE, f'lstm_model_{key}.keras')
    }
    
    try:
        lstm_model = load_variables_from_s3(lstm_variable)
        lstm_model = lstm_model.get('lstm_model')
    except RuntimeError as e:
        print(f"Model not found, creating a new one: {e}")
        lstm_model = build_lstm_model() #If there is no LSTM model, create a new one


    history = lstm_model.fit(
        lstm_train_X,
        lstm_train_y,
        epochs=100,
        batch_size=16,
        validation_data=(lstm_test_X, lstm_test_y),
        verbose=1
    )

    final_model = lstm_model #With all values as above, grab the necessary data and retrain the model

    variables = {
        'lstm_model': (final_model, MODEL_STORAGE, f'lstm_model_{key}.keras')
    }

    variables = save_variables_to_s3(variables) #Upload retrained model

def build_lstm_model():
    model = Sequential()
    model.add(LSTM(50, return_sequences=True, input_shape=(12, 15)))  #Adjust input shape to data
    model.add(LSTM(50))
    model.add(Dropout(0.35))
    model.add(Dense(1))  #Predicting next closing price
    
    #Compile model with adam
    model.compile(loss='mse', optimizer='adam')
    return model

def build_svm_model():
    model = SVR(kernel='linear', C=10, epsilon=0.001, gamma='scale')
    return model