from backend.models.pricealert import PriceAlert
from backend.models.stock import Stock
from backend.models.historicstock import HistoricStock
from backend.exts import db
from sqlalchemy import desc
from datetime import datetime

def check_price_alerts():
    active_alerts = PriceAlert.query.filter_by(status='active').all()
    triggered_alerts = []
    
    print(f"Checking {len(active_alerts)} active price alerts")
    
    for alert in active_alerts:
        # Ensure stock keys are uppercase for consistency.
        stock_key = alert.stock_key.upper() if alert.stock_key else alert.stock_key
        print(f"Checking alert ID {alert.id} for stock {stock_key}")
        
        # Get the latest price data for this stock.
        latest_price = HistoricStock.query.filter_by(stock_key=stock_key).order_by(desc(HistoricStock.datetime)).first()
        
        if latest_price:
            print(f"Alert for {stock_key}: target=${alert.target_price}, current=${latest_price.close}")
            
            #Get the previous price to check if we've crossed the threshold.
            previous_price = HistoricStock.query.filter_by(stock_key=stock_key).order_by(desc(HistoricStock.datetime)).offset(1).first()
            
            #Default to triggering only on exact match if we don't have previous price data
            should_trigger = latest_price.close == alert.target_price
            
            if previous_price:
                prev_close = previous_price.close
                print(f"Previous close for {stock_key}: ${prev_close}")
                
                # Check if stock key crossed the price threshold in either direction.
                if (prev_close < alert.target_price and latest_price.close >= alert.target_price):
                    # Price went UP across the target threshold
                    print(f"Price crossed UP through target: ${prev_close} → ${latest_price.close}, target: ${alert.target_price}")
                    should_trigger = True
                elif (prev_close > alert.target_price and latest_price.close <= alert.target_price):
                    # Price went DOWN across the target threshold
                    print(f"Price crossed DOWN through target: ${prev_close} → ${latest_price.close}, target: ${alert.target_price}")
                    should_trigger = True
            
            if should_trigger:
                print(f"*** ALERT TRIGGERED ***: {stock_key} at ${latest_price.close}")
                #Mark alert as inactive since it has been triggered.
                alert.status = 'inactive'
                alert.update(status='inactive')  # Uses update method which calls commit.
                
                triggered_alerts.append({
                    "alert_id": alert.id,
                    "user_id": alert.user_id,
                    "stock_key": stock_key,
                    "target_price": alert.target_price,
                    "current_price": latest_price.close,
                    "timestamp": latest_price.datetime.isoformat()
                })
            else:
                print(f"Alert not triggered: current price ${latest_price.close} has not crossed target ${alert.target_price}")
        else:
            print(f"No price data found for {stock_key}")
    
    print(f"Found {len(triggered_alerts)} triggered alerts")
    return triggered_alerts