from backend.models.portfoliouser import PortfolioUser
from backend.models.investment import Investment
from backend.models.historicstock import HistoricStock
from sqlalchemy import desc
from sqlalchemy.orm import joinedload
from backend.exts import db

"""CALCULATE NETWORTH"""

def calculate_networth(portfolio_user_id):
    portfolio_user = PortfolioUser.query.options(
        joinedload(PortfolioUser.investments).joinedload(Investment.stock)
    ).filter_by(id=portfolio_user_id).first()

    if not portfolio_user:
        raise ValueError(f"Portfolio user with ID {portfolio_user_id} not found.")
    
    # Calculate the total value of investments only
    total_assets = 0.0

    for investment in portfolio_user.investments:
        latest_record = HistoricStock.query.filter_by(stock_key=investment.stock_key).order_by(desc(HistoricStock.datetime)).first()
        current_stock_price = latest_record.close if latest_record else None
        
        if current_stock_price is not None:
            investment_value = investment.quantity * current_stock_price
            total_assets += investment_value

    # Update the total_assets (value of investments only) 
    portfolio_user.total_assets = total_assets
    portfolio_user.save()

    #Calculate the networth as balance + total_assets
    networth = portfolio_user.balance + total_assets
    
    portfolio_user.networth = networth
    portfolio_user.save()

    return networth