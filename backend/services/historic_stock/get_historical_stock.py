from sqlalchemy import desc
from backend.models.historicstock import HistoricStock
import pandas as pd
import pytz
from datetime import datetime

def get_historical_data(stock_key, interval=None, start_date=None, end_date=None, limit=None):
    print(f"Fetching historical data for stock: {stock_key}, start_date: {start_date}, end_date: {end_date}, interval: {interval}, limit: {limit}")

    #Build queries for historical data.
    query = HistoricStock.query.filter(HistoricStock.stock_key == stock_key)

    #Apply the date filters if provided.
    if start_date:
        #If there is no start date, assume utc.
        if hasattr(start_date, 'tzinfo') and start_date.tzinfo is None:
            start_date = pytz.UTC.localize(start_date)
        query = query.filter(HistoricStock.datetime >= start_date)
        
    if end_date:
        #If there is no end date, we assume utc as that is what was downloaded.
        if hasattr(end_date, 'tzinfo') and end_date.tzinfo is None:
            end_date = pytz.UTC.localize(end_date)
        query = query.filter(HistoricStock.datetime <= end_date)

    #Order by datetime descending, newest first.
    query = query.order_by(HistoricStock.datetime.desc())

    #Then apply limits.
    if interval:
        query = query.limit(interval)

    if limit and not interval:
        query = query.limit(limit)

    #Execute query
    data = query.all()
    print(f"Retrieved {len(data)} records from DB.")

    #Converts to DataFrame with proper UTC timezone information in ISO format
    df = pd.DataFrame([{
        #Ensure the datetime has UTC timezone and is in ISO format
        "datetime": ensure_utc_timezone(record.datetime).isoformat(),
        "open": record.open,
        "high": record.high,
        "low": record.low,
        "close": record.close,
        "volume": record.volume
    } for record in data])

    return df

def ensure_utc_timezone(dt):
    """Ensure a datetime is in UTC timezone"""
    #If datetime has no timezone, assume already
    if dt.tzinfo is None:
        return pytz.UTC.localize(dt)
    
    #If datetime has a timezone that's not UTC, then convert it.
    if dt.tzinfo != pytz.UTC:
        return dt.astimezone(pytz.UTC)
    
    return dt