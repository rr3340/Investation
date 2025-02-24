from backend.exts import db
from sqlalchemy.orm import relationship
from datetime import datetime

class Investment(db.Model):
    __tablename__ = 'investment'
    
    investment_id = db.Column(db.Integer(), primary_key=True)
    user_id = db.Column(db.Integer(), db.ForeignKey('users.id', name='fk_investment_user_id'), nullable=False)
    portfolio_user_id = db.Column(db.Integer(), db.ForeignKey('user_portfolio.id'), nullable=False)
    stock_key = db.Column(db.String(10), db.ForeignKey('stock.stock_key', name='fk_investment_stock_key'), nullable=False, index=True)
    quantity = db.Column(db.Float(), nullable=False)
    purchase_price = db.Column(db.Float(), nullable=False)
    purchase_date = db.Column(db.DateTime(), nullable=False)
    last_update = db.Column(db.DateTime(), nullable=False)
    
    user = db.relationship("User", back_populates="investments")
    portfolio_user = db.relationship("PortfolioUser", back_populates="investments")
    stock = db.relationship("Stock", backref="investments")
    
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