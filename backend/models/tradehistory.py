from backend.exts import db
from sqlalchemy.orm import relationship
from datetime import datetime

class TradeHistory(db.Model):
    __tablename__ = 'trade_history'
    
    trade_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    stock_key = db.Column(db.String(10), db.ForeignKey('stock.stock_key'), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    trade_price = db.Column(db.Float, nullable=False)
    trade_type = db.Column(db.String(10), nullable=False)  #'BUY' or 'SELL' only
    trade_date = db.Column(db.DateTime(), nullable=True)

    user = db.relationship("User", back_populates="trade_history")
    stock = db.relationship("Stock", back_populates="trade_history")

    def save(self):
        db.session.add(self)
        db.session.commit()
        
    def delete(self):
        db.session.delete(self)
        db.session.commit()
        
    def update(self, **kwargs):
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        db.session.commit()