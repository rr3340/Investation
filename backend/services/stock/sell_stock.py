from backend.models.stock import Stock
from backend.models.users import User
from backend.models.portfoliouser import PortfolioUser
from backend.models.investment import Investment
from backend.models.historicstock import HistoricStock
from backend.models.tradehistory import TradeHistory
from backend.exts import db
from datetime import datetime
from sqlalchemy import desc

def sell_stock(user_id, stock_key, quantity):
    user = User.query.get(user_id)
    if not user:
        raise Exception("User not found")
    
    portfolio_user = user.portfolio_user
    investment = Investment.query.filter_by(user_id=user_id, stock_key=stock_key).first()
    if not investment or investment.quantity < quantity:
        raise Exception("Insufficient stock quantity to sell")
    
    latest_record = HistoricStock.query.filter_by(stock_key=stock_key).order_by(desc(HistoricStock.datetime)).first()
    if not latest_record:
        raise Exception(f"No recent data available for {stock_key}")
    
    current_price = latest_record.close
    total_value = current_price * quantity
    
    portfolio_user.balance += total_value
    investment.quantity -= quantity

    if investment.quantity == 0:
        investment.delete()
    else:
        investment.last_update = datetime.now()
        investment.save()
        
    new_trade = TradeHistory(
        user_id=user_id,
        stock_key=stock_key,
        quantity=quantity,
        trade_price=current_price,
        trade_type='SELL',
        trade_date=datetime.now()
    )
    new_trade.save()
    
    calculate_networth(portfolio_user.id)