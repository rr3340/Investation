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

    for investment in investments:
        latest_record = HistoricStock.query.filter_by(stock_key=investment.stock_key).order_by(desc(HistoricStock.datetime)).first()
        if latest_record:
            current_price = latest_record.close
            unrealized_gain = (current_price - investment.purchase_price) * investment.quantity
            total_unrealized_gains += unrealized_gain

    return {"user_id": user_id, "unrealized_gains": total_unrealized_gains}