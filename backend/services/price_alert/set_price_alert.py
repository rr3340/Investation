from backend.models.users import User
from backend.models.pricealert import PriceAlert
from backend.models.stock import Stock
from backend.models.historicstock import HistoricStock
from backend.exts import db
from sqlalchemy import desc
from datetime import datetime

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