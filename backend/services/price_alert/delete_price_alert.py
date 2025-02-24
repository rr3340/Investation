from backend.models.pricealert import PriceAlert
from backend.exts import db

def delete_price_alert(alert_id):
    price_alert = PriceAlert.query.get(alert_id)
    if not price_alert:
        raise Exception("Price alert not found")

    price_alert.delete()
    
    return {"message": f"Price alert with ID {alert_id} deleted successfully"}