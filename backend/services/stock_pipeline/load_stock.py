from backend.models.stock import Stock
from backend.models.historicstock import HistoricStock
from backend.exts import db
import pandas as pd
import pytz
from datetime import datetime

def load_data(symbol):
    """Load stock data from the database and ensure all datetime objects have proper timezone information."""
    data = HistoricStock.query.filter_by(stock_key=symbol).all()
    
    #If there's is no data found, return an empty DataFrame but with correct column structure.
    if not data:
        return pd.DataFrame(columns=[
            "datetime", "open", "high", "low", "close", "volume"
        ])
    
    # Converts database records to DataFrame.
    df = pd.DataFrame([{
        "datetime": record.datetime,
        "open": record.open,
        "high": record.high,
        "low": record.low,
        "close": record.close,
        "volume": record.volume
    } for record in data])
    
    # Ensures all datetime objects have timezone information.
    df['datetime'] = df['datetime'].apply(
        lambda dt: pytz.UTC.localize(dt) if dt.tzinfo is None else dt
    )
    
    print(f"Loaded {len(df)} records for {symbol} with timezone-aware datetimes")
    return df