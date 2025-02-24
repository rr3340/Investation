from sqlalchemy import desc
from backend.models.historicstock import HistoricStock
from datetime import datetime

def get_latest_price(stock_key):
    latest_record = HistoricStock.query.filter_by(stock_key=stock_key).order_by(desc(HistoricStock.datetime)).first()
    if not latest_record:
        raise Exception(f"No recent data available for {stock_key}")

    return {"stock_key": stock_key, "latest_price": latest_record.close, "timestamp": latest_record.datetime.isoformat()}