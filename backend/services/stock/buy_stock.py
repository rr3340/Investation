from backend.models.stock import Stock
from backend.models.users import User
from backend.models.portfoliouser import PortfolioUser
from backend.models.investment import Investment
from backend.models.historicstock import HistoricStock
from backend.models.tradehistory import TradeHistory
from backend.services.portfolio.calculate_networth import calculate_networth
from backend.exts import db
from datetime import datetime
from sqlalchemy import desc

def buy_stock(user_id, stock_key, quantity):
    user = User.query.get(user_id)
    if not user:
        raise Exception("User not found")
    
    portfolio_user = user.portfolio_user
    latest_record = HistoricStock.query.filter_by(stock_key=stock_key).order_by(desc(HistoricStock.datetime)).first()
    if not latest_record:
        raise Exception(f"No recent data available for {stock_key}")
    
    current_price = latest_record.close
    total_cost = current_price * quantity

    if portfolio_user.balance < total_cost:
        raise Exception("Insufficient funds")

    portfolio_user.balance -= total_cost

    investment = Investment.query.filter_by(user_id=user_id, stock_key=stock_key).first()
    if investment:
        investment.quantity += quantity
        investment.purchase_price = current_price
        investment.last_update = datetime.now()
        investment.save()
    else:
        new_investment = Investment(
            user_id=user_id,
            portfolio_user_id=portfolio_user.id,
            stock_key=stock_key,
            quantity=quantity,
            purchase_price=current_price,
            purchase_date=datetime.now(),
            last_update=datetime.now()
        )
        new_investment.save()
        
    new_trade = TradeHistory(
        user_id=user_id,
        stock_key=stock_key,
        quantity=quantity,
        trade_price=current_price,
        trade_type='BUY',
        trade_date=datetime.now()
    )
    new_trade.save()

    calculate_networth(portfolio_user.id)