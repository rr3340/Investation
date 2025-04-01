from backend.models.users import User
from backend.models.investment import Investment
from backend.models.historicstock import HistoricStock
from sqlalchemy import desc
from backend.exts import db

"""GET PORTFOLIO SUMMARY"""

def get_portfolio_summary(user_id):
    user = User.query.get(user_id)
    if not user:
        raise Exception("User not found")

    portfolio_user = user.portfolio_user
    investments = Investment.query.filter_by(user_id=user_id).all()

    # Initializes total assets to 0 (should NOT include balance)
    total_assets = 0
    
    portfolio_summary = {
        "user_id": user_id,
        "networth": portfolio_user.networth,
        "balance": portfolio_user.balance,
        "risk_tolerance": portfolio_user.risk_tolerance,
        "investments": []
    }

    for investment in investments:
        latest_record = HistoricStock.query.filter_by(stock_key=investment.stock_key).order_by(desc(HistoricStock.datetime)).first()
        current_price = latest_record.close if latest_record else None
        investment_value = investment.quantity * current_price if current_price else 0
        
        # Adds the investment value to total assets.
        if investment_value:
            total_assets += investment_value

        portfolio_summary["investments"].append({
            "stock_key": investment.stock_key,
            "quantity": investment.quantity,
            "purchase_price": investment.purchase_price,
            "current_price": current_price,
            "investment_value": investment_value
        })

    # Adds total assets to the summary (investment values only, not including balance).
    portfolio_summary["total_assets"] = total_assets

    return portfolio_summary