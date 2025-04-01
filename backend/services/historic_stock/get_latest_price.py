from sqlalchemy import desc, func
from backend.models.historicstock import HistoricStock
from datetime import datetime

def get_latest_price(stock_key):
    #Get the most recent record
    latest_record = HistoricStock.query.filter_by(stock_key=stock_key).order_by(desc(HistoricStock.datetime)).first()
    
    if not latest_record:
        raise Exception(f"No recent data available for {stock_key}")
    
    #Add default values if we don't find previous day's record
    change_percent = 0
    price_change = 0
    previous_record = None
    
    #Get the date of the latest record
    latest_date = latest_record.datetime.date()
    
    #Find the last record from the previous day (yesterday's closing price)
    previous_record = HistoricStock.query.filter_by(
        stock_key=stock_key
    ).filter(
        func.date(HistoricStock.datetime) < latest_date
    ).order_by(desc(HistoricStock.datetime)).first()
    
    #Calculate the price change and percentage.
    if previous_record and previous_record.close > 0:  # Avoid division by zero
        price_change = latest_record.close - previous_record.close
        change_percent = (price_change / previous_record.close) * 100
    
    return {
        "stock_key": stock_key, 
        "latest_price": latest_record.close, 
        "previous_price": previous_record.close if previous_record else latest_record.close,
        "price_change": price_change,
        "change_percent": round(change_percent, 2),
        "timestamp": latest_record.datetime.isoformat()
    }