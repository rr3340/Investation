from backend.models.portfoliouser import PortfolioUser
from backend.models.investment import Investment
from backend.models.stock import Stock
from backend.models.historicstock import HistoricStock
from backend.exts import db
from datetime import datetime
from sqlalchemy import desc
from .calculate_networth import calculate_networth


def calculate_portfolio():
    portfolio_users = PortfolioUser.query.all()
    for portfolio_user in portfolio_users:
        calculate_networth(portfolio_user.id)
    return "Portfolio calculations completed successfully."