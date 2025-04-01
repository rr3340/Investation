from backend.models.users import User
from backend.models.investment import Investment
from backend.models.historicstock import HistoricStock
from sqlalchemy import desc
from backend.exts import db

"""CALCULATE UNREALIZED GAINS"""

def calculate_unrealized_gains(user_id):
    user = User.query.get(user_id)
    if not user:
        raise Exception("User not found")

    investments = Investment.query.filter_by(user_id=user_id).all()
    total_unrealized_gains = 0.0
    total_investment_cost = 0.0
    
    for investment in investments:
        latest_record = HistoricStock.query.filter_by(stock_key=investment.stock_key).order_by(desc(HistoricStock.datetime)).first()
        if latest_record:
            current_price = latest_record.close
            current_value = current_price * investment.quantity
            initial_cost = investment.purchase_price * investment.quantity
            
            unrealized_gain = current_value - initial_cost
            total_unrealized_gains += unrealized_gain
            total_investment_cost += initial_cost

    # Calculate percentage change
    percentage_change = 0
    if total_investment_cost > 0:
        percentage_change = (total_unrealized_gains / total_investment_cost) * 100
    
    return {
        "user_id": user_id, 
        "total_unrealized_gains": total_unrealized_gains,
        "percentage_change": percentage_change
    }