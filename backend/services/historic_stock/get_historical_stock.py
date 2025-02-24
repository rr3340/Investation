from sqlalchemy import desc
from backend.models.historicstock import HistoricStock
import pandas as pd

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