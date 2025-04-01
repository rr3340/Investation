from backend.models.users import User
from backend.models.pricealert import PriceAlert
from backend.models.stock import Stock
from backend.models.historicstock import HistoricStock
from backend.exts import db
from sqlalchemy import desc
from datetime import datetime

def set_price_alert(user_id, stock_key, target_price):
    print(f"Setting price alert: user_id={user_id}, stock_key={stock_key}, target_price={target_price}")
    
    # Verify if the user exists.
    user = User.query.get(user_id)
    if not user:
        raise Exception("User not found")
    
    # Always make sure the stock key is uppercase.
    uppercase_stock_key = stock_key.upper() if stock_key else stock_key
    
    # Make sure the stock exists.
    stock = Stock.query.filter_by(stock_key=uppercase_stock_key).first()
    if not stock:
        raise Exception(f"Stock with key {uppercase_stock_key} not found")
    
    # Check if an active alert already exists for this stock and user
    existing_alert = PriceAlert.query.filter_by(
        user_id=user_id, 
        stock_key=uppercase_stock_key,
        status="active"
    ).first()
    
    if existing_alert:
        # Update the existing alert instead of creating a new one
        existing_alert.target_price = target_price
        existing_alert.created_at = datetime.now()
        existing_alert.save()
        print(f"Updated existing price alert (ID: {existing_alert.id}) for {uppercase_stock_key} at {target_price}")
        return {"message": f"Price alert updated for {uppercase_stock_key} at {target_price}", "alert_id": existing_alert.id}
    
    # Create a new price alert
    price_alert = PriceAlert(
        user_id=user_id,
        stock_key=uppercase_stock_key,
        target_price=target_price,
        status="active",
        created_at=datetime.now()
    )
    price_alert.save()
    
    print(f"Created new price alert (ID: {price_alert.id}) for {uppercase_stock_key} at {target_price}")
    return {"message": f"Price alert set for {uppercase_stock_key} at {target_price}", "alert_id": price_alert.id}