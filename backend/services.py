from flask_restx import Resource, Namespace, fields
from models import User, PortfolioUser, Stock, HistoricStock, Investment, TradeHistory, Watchlist, PriceAlert
from flask import Flask, request, jsonify
from sqlalchemy.orm import joinedload
from sqlalchemy import desc
import yfinance as yf
import pandas as pd
from io import StringIO
import boto3
from s3services import save_variables_to_s3, load_variables_from_s3
import numpy as np
import requests
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

PROCESSED_STORAGE = os.getenv('PROCESSED_STORAGE')
PREDICTION_STORAGE = os.getenv('PREDICTION_STORAGE')

def stock_refresh(symbol, interval="5m", period="1d"):
    new_df = yf.download(tickers=symbol, interval=interval, period=period)
    if new_df.empty:
        raise ValueError(f"No data returned for symbol {symbol} with interval {interval}.")

    new_df.index = new_df.index.tz_localize(None)
    new_df.reset_index(inplace=True)
    
    if isinstance(new_df.columns, pd.MultiIndex):
        new_df.columns = ['_'.join(col).strip() for col in new_df.columns.values]

    new_df.rename(columns={
        "Datetime_": "datetime",
        f"Open_{symbol}": "open",
        f"High_{symbol}": "high",
        f"Low_{symbol}": "low",
        f"Close_{symbol}": "close",
        f"Volume_{symbol}": "volume"
    }, inplace=True)

    new_df.dropna(subset=["datetime"], inplace=True)

    return new_df

def update_stock(existing_df, new_df):
    new_df = new_df.dropna(subset=["datetime"])

    new_df_filtered = new_df[~new_df["datetime"].isin(existing_df["datetime"])]
    
    df_final = pd.concat([existing_df, new_df_filtered], ignore_index=True)
    df_final.sort_values(by="datetime", inplace=True)
    return df_final

def load_data(symbol):
    data = HistoricStock.query.filter_by(stock_key=symbol).all()
    df = pd.DataFrame([{
        "datetime": record.datetime,
        "open": record.open,
        "high": record.high,
        "low": record.low,
        "close": record.close,
        "volume": record.volume
    } for record in data])
    print(df)
    return df

def save_to_database(df, symbol):
    for _, row in df.iterrows():
        #Check if the record already exists
        existing_record = HistoricStock.query.filter_by(
            stock_key=symbol,
            datetime=row["datetime"]
        ).first()

        if not existing_record:

            new_record = HistoricStock(
                stock_key=symbol,
                datetime=row["datetime"],
                open=row["open"],
                high=row["high"],
                low=row["low"],
                close=row["close"],
                volume=row["volume"]
            )
            new_record.save()
            
def live_pipeline():
    symbol = "AAPL"
    interval = "5m"

    existing_df = load_data(symbol)

    new_df = stock_refresh(symbol, interval)

    updated_df = update_stock(existing_df, new_df)

    save_to_database(updated_df, symbol)
    
def process_from_database(df):
    normal_window = 9  #Fast
    slow_d = 3  #Slow
    necessary_columns = ['close', 'high', 'low', 'volume']  #Needed columns

    if not all(col in df.columns for col in necessary_columns):
        print(f"Error: Missing one or more required columns: {necessary_columns}")
        return None

    #Nma + Ema calculations
    def ma_calculations(df, window_size=5):
        df.index = pd.to_datetime(df.index, errors='coerce')
        df['date'] = df.index.day #Per day split so the first 5 will be of NA

        def calculate_nma_roll(set):
            set['Normal Moving Average'] = set['close'].rolling(window=window_size).mean() #calculate rolling set per window size
            return set

        def calculate_ema_roll(set):
            set['Exponential Moving Average'] = set['close'].ewm(span=10, adjust=False).mean()
            return set #Calculates all past the last 10 index, with the rest being dropped

        df = df.groupby('date', group_keys=False).apply(calculate_nma_roll)
        df = df.groupby('date', group_keys=False).apply(calculate_ema_roll)#Run function through per day organization
        df = df.drop(columns='date')
        return df

    df = ma_calculations(df)

    #Rsi calc
    def calculate_rsi(df):
        df['close'] = df['close'].fillna(0)
        delta = df['close'].diff()
        average_gain = (delta.where(delta > 0, 0)).rolling(window=normal_window).mean()
        average_loss = (-delta.where(delta < 0, 0)).rolling(window=normal_window).mean()
        rs = average_gain / average_loss
        df['Relative Strength Index'] = 100 - (100 / (1 + rs))
        return df

    df = calculate_rsi(df)

    #Target shift for rfm
    df["Shift For Target"] = df['close'].shift(-1)
    df["Target"] = (df["Shift For Target"] > df['close']).astype(int)

    #Max + min rolling windows
    df['High_N'] = df['high'].rolling(window=normal_window).max()
    df['Low_N'] = df['low'].rolling(window=normal_window).min()

    #Stochastic oscillator
    df['%K Fast'] = (df['close'] - df['Low_N']) * 100 / (df['High_N'] - df['Low_N'])
    df['%D Slow'] = df['%K Fast'].rolling(window=slow_d).mean()

    #Williams %R
    df['Williams R%'] = -100 * ((df['High_N'] - df['close']) / (df['High_N'] - df['Low_N']))

    #MACD
    df['MACD'] = df['Exponential Moving Average'] - df['Normal Moving Average']

    #Price rate of change
    df["shift_one_forward"] = df['close'].shift(1)
    df["Price Rate of Change"] = ((df['close'] - df["shift_one_forward"]) / df["shift_one_forward"]) * 100

    #On balance volume
    df["Variation"] = df["close"].diff()
    df["On Balance Volume"] = 0
    for i in range(1, len(df)):
        daily_change = df["Variation"].iloc[i]#Subtract or add the day's volumne dependent on if closing price increased or decreased
        volume = df["volume"].iloc[i] if daily_change > 0 else -df["volume"].iloc[i] if daily_change < 0 else 0
        df["On Balance Volume"].iloc[i] = df["On Balance Volume"].iloc[i - 1] + volume

    #Standard deviation and bollinger bands, upper and lower
    df['Moving Standard Deviation'] = df['close'].rolling(window=5).std()
    df['Upper Band'] = df['Normal Moving Average'] + 2 * df['Moving Standard Deviation']
    df['Lower Band'] = df['Normal Moving Average'] - 2 * df['Moving Standard Deviation']

    #% change, moving average, volatility calculations, momentum etc.
    df['Percentange_Change'] = (df['close'] - df['close'].shift(1)) * 100 / df['close'].shift(1)
    df['Moving_Ave'] = df['close'].rolling(window=12).mean()
    df['Close_To_moving_AVG'] = df['close'] / df['Moving_Ave']
    df['Price_Range_Normalization'] = (df['close'] - df['Low_N']) / (df['High_N'] - df['Low_N'])
    df['volatility'] = df['close'].rolling(window=normal_window).std()
    df['momentum'] = df['close'] - df['close'].shift(normal_window)

    #Adx calculations
    def get_adx(high, low, close, window):
        plus_dm = high.diff().clip(lower=0)#positive VS negative directional movement
        minus_dm = low.diff().clip(upper=0).abs()
        atr = pd.concat([high - low, (high - close.shift(1)).abs(), (low - close.shift(1)).abs()], axis=1).max(axis=1) #Largest difference btwn high and low,and prev's closing price
        plus_di = 100 * (plus_dm.ewm(alpha=1 / window).mean() / atr)
        minus_di = 100 * (minus_dm.ewm(alpha=1 / window).mean() / atr).abs()
        dx = (abs(plus_di - minus_di) / (plus_di + minus_di)) * 100#calculate direction
        adx = dx.rolling(window).mean()#Calculate rolling avg of direction to solve
        return plus_di, minus_di, adx

    df['plus_di'], df['minus_di'], df['adx'] = get_adx(df['high'], df['low'], df['close'], normal_window) #get values from function and form columns

    #Clean + drop unnecessary columns
    df = df.drop(columns=['shift_one_forward', "High_N", "Low_N"]).dropna()
    
    print(df.columns)

    return df

def process_database():
    stocks = Stock.query.all()
    for stock in stocks:
        stock_key = stock.stock_key
        df = load_data(stock_key)
        processed_df = process_from_database(df)
        print(processed_df)

        if processed_df is not None:
            variables = {
                'processed_stock': (processed_df, PROCESSED_STORAGE, f"processed_{stock_key}_stock.csv")
                }
            save_variables_to_s3(variables)

    return "Database processed successfully."
    

def svm_scale_database(key):
    if key:
        response = requests.post('http://localhost:5001/ml/scale_svm', json={'key': key})
        return response.json(), response.status_code
    else:
        stocks = Stock.query.all()
        for stock in stocks:
            stock_key = stock.stock_key
            response = requests.post('http://localhost:5001/ml/scale_svm', json={'key': stock_key})
            if response.status_code != 200:
                return response.json(), response.status_code
        return {"message": "Successfully scaled SVM data for all stocks"}, 200

def lstm_scale_database(key):
    if key:
        response = requests.post('http://localhost:5001/ml/scale_lstm', json={'key': key})
        return response.json(), response.status_code
    else:
        stocks = Stock.query.all()
        for stock in stocks:
            stock_key = stock.stock_key
            response = requests.post('http://localhost:5001/ml/scale_lstm', json={'key': stock_key})
            if response.status_code != 200:
                return response.json(), response.status_code
        return {"message": "Successfully scaled LSTM data for all stocks"}, 200

def svm_upload_retrained_model_to_database(key):
    if key:
        response = requests.post('http://localhost:5001/ml/retrain_svm', json={'key': key})
        return response.json(), response.status_code
    else:
        stocks = Stock.query.all()
        for stock in stocks:
            stock_key = stock.stock_key
            response = requests.post('http://localhost:5001/ml/retrain_svm', json={'key': stock_key})
            if response.status_code != 200:
                return response.json(), response.status_code
        return {"message": "Successfully retrained SVM model for all stocks"}, 200

def lstm_upload_retrained_model_to_database(key):
    if key:
        response = requests.post('http://localhost:5001/ml/retrain_lstm', json={'key': key})
        return response.json(), response.status_code
    else:
        stocks = Stock.query.all()
        for stock in stocks:
            stock_key = stock.stock_key
            response = requests.post('http://localhost:5001/ml/retrain_lstm', json={'key': stock_key})
            if response.status_code != 200:
                return response.json(), response.status_code
        return {"message": "Successfully retrained LSTM model for all stocks"}, 200

def svm_upload_predictions_to_database(key):
    if key:
        response = requests.post('http://localhost:5001/ml/predict_svm', json={'key': key})
        return response.json(), response.status_code
    else:
        stocks = Stock.query.all()
        for stock in stocks:
            stock_key = stock.stock_key
            response = requests.post('http://localhost:5001/ml/predict_svm', json={'key': stock_key})
            if response.status_code != 200:
                return response.json(), response.status_code
        return {"message": "Successfully predicted SVM model for all stocks"}, 200

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
    
    
""" 
Buy and sell stocks
"""

def buy_stock(user_id, stock_key, quantity):
    user = User.query.get(user_id)
    if not user:
        raise Exception("User not found")
    
    portfolio_user = user.portfolio_user
    latest_record = HistoricStock.query.filter_by(stock_key=stock_key).order_by(desc(HistoricStock.datetime)).first()
    if not latest_record:
        raise Exception(f"No recent data available for {stock_key}")
    
    current_price = latest_record.close
    total_cost = current_price * quantity

    if portfolio_user.balance < total_cost:
        raise Exception("Insufficient funds")

    portfolio_user.balance -= total_cost

    investment = Investment.query.filter_by(user_id=user_id, stock_key=stock_key).first()
    if investment:
        investment.quantity += quantity
        investment.purchase_price = current_price
        investment.last_update = datetime.now()
        investment.save()
    else:
        new_investment = Investment(
            user_id=user_id,
            portfolio_user_id=portfolio_user.id,
            stock_key=stock_key,
            quantity=quantity,
            purchase_price=current_price,
            purchase_date=datetime.now(),
            last_update=datetime.now()
        )
        new_investment.save()
        
    new_trade = TradeHistory(
        user_id=user_id,
        stock_key=stock_key,
        quantity=quantity,
        trade_price=current_price,
        trade_type='BUY',
        trade_date=datetime.now()
    )
    new_trade.save()

    calculate_networth(portfolio_user.id)

def sell_stock(user_id, stock_key, quantity):
    user = User.query.get(user_id)
    if not user:
        raise Exception("User not found")
    
    portfolio_user = user.portfolio_user
    investment = Investment.query.filter_by(user_id=user_id, stock_key=stock_key).first()
    if not investment or investment.quantity < quantity:
        raise Exception("Insufficient stock quantity to sell")
    
    latest_record = HistoricStock.query.filter_by(stock_key=stock_key).order_by(desc(HistoricStock.datetime)).first()
    if not latest_record:
        raise Exception(f"No recent data available for {stock_key}")
    
    current_price = latest_record.close
    total_value = current_price * quantity
    
    portfolio_user.balance += total_value
    investment.quantity -= quantity

    if investment.quantity == 0:
        investment.delete()
    else:
        investment.last_update = datetime.now()
        investment.save()
        
    new_trade = TradeHistory(
        user_id=user_id,
        stock_key=stock_key,
        quantity=quantity,
        trade_price=current_price,
        trade_type='SELL',
        trade_date=datetime.now()
    )
    new_trade.save()
    
    calculate_networth(portfolio_user.id)
    
""" 
Calculate current networth
"""

def calculate_networth(portfolio_user_id):
    portfolio_user = PortfolioUser.query.options(
        joinedload(PortfolioUser.investments).joinedload(Investment.stock)
    ).filter_by(id=portfolio_user_id).first()

    if not portfolio_user:
        raise ValueError(f"Portfolio user with ID {portfolio_user_id} not found.")
    
    total_assets = 0.0

    for investment in portfolio_user.investments:
        latest_record = HistoricStock.query.filter_by(stock_key=investment.stock_key).order_by(desc(HistoricStock.datetime)).first()
        current_stock_price = latest_record.close if latest_record else None
        
        if current_stock_price is not None:
            investment_value = investment.quantity * current_stock_price
            total_assets += investment_value

    portfolio_user.total_assets = total_assets
    portfolio_user.save()

    networth = portfolio_user.balance + total_assets
    
    portfolio_user.networth = networth
    portfolio_user.save()

    return networth

"""
Get portfolio summary
"""

def get_portfolio_summary(user_id):
    user = User.query.get(user_id)
    if not user:
        raise Exception("User not found")

    portfolio_user = user.portfolio_user
    investments = Investment.query.filter_by(user_id=user_id).all()

    portfolio_summary = {
        "user_id": user_id,
        "networth": portfolio_user.networth,
        "balance": portfolio_user.balance,
        "investments": []
    }

    for investment in investments:
        latest_record = HistoricStock.query.filter_by(stock_key=investment.stock_key).order_by(desc(HistoricStock.datetime)).first()
        current_price = latest_record.close if latest_record else None
        investment_value = investment.quantity * current_price if current_price else None

        portfolio_summary["investments"].append({
            "stock_key": investment.stock_key,
            "quantity": investment.quantity,
            "purchase_price": investment.purchase_price,
            "current_price": current_price,
            "investment_value": investment_value
        })

    return portfolio_summary

"""
Calculate unrealized gains
"""
def calculate_unrealized_gains(user_id):
    user = User.query.get(user_id)
    if not user:
        raise Exception("User not found")

    investments = Investment.query.filter_by(user_id=user_id).all()
    total_unrealized_gains = 0.0

    for investment in investments:
        latest_record = HistoricStock.query.filter_by(stock_key=investment.stock_key).order_by(desc(HistoricStock.datetime)).first()
        if latest_record:
            current_price = latest_record.close
            unrealized_gain = (current_price - investment.purchase_price) * investment.quantity
            total_unrealized_gains += unrealized_gain

    return {"user_id": user_id, "unrealized_gains": total_unrealized_gains}

"""
Get latest stock price
"""

def get_latest_price(stock_key):
    latest_record = HistoricStock.query.filter_by(stock_key=stock_key).order_by(desc(HistoricStock.datetime)).first()
    if not latest_record:
        raise Exception(f"No recent data available for {stock_key}")

    return {"stock_key": stock_key, "latest_price": latest_record.close, "timestamp": latest_record.datetime.isoformat()}

""" 
Set price alert
"""

def set_price_alert(user_id, stock_key, target_price):
    user = User.query.get(user_id)
    if not user:
        raise Exception("User not found")

    price_alert = PriceAlert(
        user_id=user_id,
        stock_key=stock_key,
        target_price=target_price,
        status="active"
    )
    price_alert.save()
    
    return {"message": f"Price alert set for {stock_key} at {target_price}"}

""" 
Update Risk Profile
"""

def update_risk_profile(user_id, risk_level):
    user = User.query.get(user_id)
    if not user:
        raise Exception("User not found")

    user.risk_profile = risk_level
    user.save()
    
    return {"user_id": user_id, "risk_profile_updated_to": risk_level}

""" 
Add stock to watch list
"""

def add_to_watchlist(user_id, stock_key):
    user = User.query.get(user_id)
    if not user:
        raise Exception("User not found")

    watchlist_entry = Watchlist.query.filter_by(user_id=user_id, stock_key=stock_key).first()
    if watchlist_entry:
        return {"message": f"{stock_key} is already in your watchlist"}

    new_watchlist_entry = Watchlist(
        user_id=user_id,
        stock_key=stock_key,
        added_date=datetime.now()  #Add current date and time.
    )
    new_watchlist_entry.save()

    return {"message": f"{stock_key} added to watchlist"}

"""
Get trade history
"""

def get_trade_history(user_id):
    trades = TradeHistory.query.filter_by(user_id=user_id).order_by(desc(TradeHistory.trade_date)).all()
    trade_history = []

    for trade in trades:
        trade_history.append({
            "trade_id": trade.trade_id,
            "user_id": trade.user_id,
            "stock_key": trade.stock_key,
            "quantity": trade.quantity,
            "trade_price": trade.trade_price,
            "trade_type": trade.trade_type,
            "trade_date": trade.trade_date.isoformat()
        })

    return {"user_id": user_id, "trade_history": trade_history}

"""
Get best predictiion
"""

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
    

def get_historical_data(stock_key, interval=None, start_date=None, end_date=None, limit=None):
    print(f"Fetching historical data for stock: {stock_key}, start_date: {start_date}, end_date: {end_date}, interval: {interval}, limit: {limit}")

    query = HistoricStock.query.filter(HistoricStock.stock_key == stock_key)

    if start_date:
        query = query.filter(HistoricStock.datetime >= start_date)
    if end_date:
        query = query.filter(HistoricStock.datetime <= end_date)

    query = query.order_by(HistoricStock.datetime.desc())

    if interval:
        query = query.limit(interval)

    if limit and not interval:
        query = query.limit(limit)

    data = query.all()
    print(f"Retrieved {len(data)} records from DB.")

    df = pd.DataFrame([{
        "datetime": record.datetime.isoformat(),
        "open": record.open,
        "high": record.high,
        "low": record.low,
        "close": record.close,
        "volume": record.volume
    } for record in data])

    return df

def get_processed_data(stock_key):
    variables = {
        'processed_stock': (PROCESSED_STORAGE, f"processed_{stock_key}_stock.csv")
    }

    try:
        variables = load_variables_from_s3(variables)
    except RuntimeError as e:
        return {"error": f"Missing processed data: {e}"}

    processed_df = variables.get('processed_stock')
    
    processed_df['datetime'] = pd.to_datetime(processed_df['datetime'])
    processed_df['datetime'] = processed_df['datetime'].apply(lambda x: x.isoformat())
    return processed_df