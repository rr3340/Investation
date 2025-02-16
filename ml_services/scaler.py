import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
from backend.s3services import load_variables_from_s3, save_variables_to_s3
from dotenv import load_dotenv
import os

load_dotenv()

PROCESSED_STORAGE = os.getenv('PROCESSED_STORAGE')
PREDICTION_STORAGE = os.getenv('PREDICTION_STORAGE')
MODEL_STORAGE = os.getenv('MODEL_STORAGE')

def svm_scaler(key):
    
    variables = {
        f'processed_{key}_stock': (PROCESSED_STORAGE, f'processed_{key}_stock.csv')
    } #Load the variables from s3
    
    df = load_variables_from_s3(variables)
    
    processed_df = df.get(f'processed_{key}_stock')
    
    svm_df = processed_df.copy()
    
    x = svm_df[['Exponential Moving Average',
       'Relative Strength Index', 'Moving Standard Deviation',
       'Upper Band', 'Lower Band', 'Williams R%', '%K Fast', '%D Slow',
       'Price Rate of Change', 'adx', 'Variation']] #Store x variable features for svr model
    
    y = svm_df['Shift For Target']#Test for the next value which is shifting for target
    
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=42)#Split training and testing data

    svm_scaler = StandardScaler() #Establish the svm standard scaler

    x_train_normalized = svm_scaler.fit_transform(x_train)
    x_test_normalized = svm_scaler.transform(x_test) #normalize the x ranges
    
    print(x_train_normalized.shape, x_test_normalized.shape, y_train.shape, y_test.shape)
    print(x_train_normalized, x_test_normalized, y_train, y_test)

    variables = {
        'svm_scaler': (svm_scaler, MODEL_STORAGE, f'svm_scaler_{key}.pkl'),
        'svm_x_train_normalized': (x_train_normalized, PROCESSED_STORAGE, f'svm_x_train_normalized_{key}.npy'),
        'svm_x_test_normalized': (x_test_normalized, PROCESSED_STORAGE, f'svm_x_test_normalized_{key}.npy'),
        'svm_y_train': (y_train, PROCESSED_STORAGE, f'svm_y_train_{key}.npy'),
        'svm_y_test': (y_test, PROCESSED_STORAGE, f'svm_y_test_{key}.npy'),
    } #Save the variables to s3

    variables = save_variables_to_s3(variables) #Upload retrained model
    
from sklearn.preprocessing import MinMaxScaler

def lstm_scaler(key):
    variables = {
        f'processed_{key}_stock': (PROCESSED_STORAGE, f'processed_{key}_stock.csv')
    } #Save the variables to s3
    
    df = load_variables_from_s3(variables)
    
    processed_df = df.get(f'processed_{key}_stock')
    
    final_df = processed_df.copy()

    mlstm_df = final_df[['close', 'volume',
       'Normal Moving Average', 'Exponential Moving Average',
       'Relative Strength Index', 'Moving Standard Deviation', 'Upper Band',
       'Lower Band', 'Percentange_Change', 'Moving_Ave', 'Close_To_moving_AVG',
       'Price_Range_Normalization', 'volatility', 'momentum', 'MACD']].copy() #Create mlstm_df for appropiate features
    
    split_test = int((len(mlstm_df)*.2))
    training_set = mlstm_df[:-split_test]
    test_set = mlstm_df[-split_test:] #Set the split_test per 80% of the code to train and test

    minmax_scaler = MinMaxScaler(feature_range=(0,1)) #Set the minmax scaler

    training_set_scaled = minmax_scaler.fit_transform(training_set)
    test_set_scaled = minmax_scaler.transform(test_set)#Transform the data 

    def create_x_y_axis(df,candles):
        dataX = []
        dataY = []
        for i in range(candles, len(df)):
            dataX.append(df[i - candles:i, 0:df.shape[1]])
            dataY.append(df[i,0])
        return np.array(dataX),np.array(dataY) #Create the x and y axis through appending said data

    train_X,train_y = create_x_y_axis(training_set_scaled,12)
    test_X,test_y = create_x_y_axis(test_set_scaled,12) #Then shape the axises including the 12 features
    
    print(train_X.shape, train_y.shape, test_X.shape, test_y.shape)
    print(train_X, train_y, test_X, test_y)

    variables = {
        'lstm_train_X': (train_X, PROCESSED_STORAGE, f'lstm_train_X_{key}.npy'),
        'lstm_test_X': (test_X, PROCESSED_STORAGE, f'lstm_test_X_{key}.npy'),
        'lstm_train_y': (train_y,PROCESSED_STORAGE, f'lstm_train_y_{key}.npy'),
        'lstm_test_y': (test_y, PROCESSED_STORAGE, f'lstm_test_y_{key}.npy'),
        'scaler': (minmax_scaler, MODEL_STORAGE, f'lstm_scaler_{key}.pkl'),
    }

    variables = save_variables_to_s3(variables) #Save the variables to s3


