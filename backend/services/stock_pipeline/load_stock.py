from backend.models.stock import Stock
from backend.models.historicstock import HistoricStock
from backend.exts import db
import pandas as pd

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