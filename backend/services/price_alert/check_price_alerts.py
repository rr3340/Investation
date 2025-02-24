from backend.models.pricealert import PriceAlert
from backend.models.stock import Stock
from backend.models.historicstock import HistoricStock
from backend.exts import db
from sqlalchemy import desc
from datetime import datetime

def check_price_alerts():
    active_alerts = PriceAlert.query.filter_by(status='active').all()
    triggered_alerts = []
    
    for alert in active_alerts:
        latest_price = HistoricStock.query.filter_by(stock_key=alert.stock_key).order_by(desc(HistoricStock.datetime)).first()
        
        if latest_price:
            if (alert.target_price >= latest_price.close):
                alert.status = 'inactive'
                alert.save()
                triggered_alerts.append({
                    "alert_id": alert.id,
                    "user_id": alert.user_id,
                    "stock_key": alert.stock_key,
                    "target_price": alert.target_price,
                    "current_price": latest_price.close,
                    "timestamp": latest_price.datetime.isoformat()
                })
    
    return triggered_alerts