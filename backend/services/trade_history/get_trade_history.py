from typing import Dict, List
from sqlalchemy import desc
from backend.models.tradehistory import TradeHistory

def get_trade_history(user_id):
    trades = TradeHistory.query.filter_by(user_id=user_id).order_by(desc(TradeHistory.trade_date)).all()
    trade_history = []

    for trade in trades:
        trade_history.append({
            "trade_id": trade.trade_id,
            "user_id": trade.user_id,
            "stock_key": trade.stock_key,
            "quantity": trade.quantity,
            "trade_price": trade.trade_price,
            "trade_type": trade.trade_type,
            "trade_date": trade.trade_date.isoformat()
        })

    return {"user_id": user_id, "trade_history": trade_history}