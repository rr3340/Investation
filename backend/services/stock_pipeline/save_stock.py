from backend.models.stock import Stock
from backend.models.historicstock import HistoricStock
from backend.exts import db
from datetime import datetime

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