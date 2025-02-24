from backend.exts import db
from sqlalchemy.orm import relationship
from datetime import datetime

class Watchlist(db.Model):
    __tablename__ = 'watchlist'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    stock_key = db.Column(db.String(10), db.ForeignKey('stock.stock_key'), nullable=False)
    added_date = db.Column(db.DateTime(), nullable=True)

    user = db.relationship("User", back_populates="watchlist")
    stock = db.relationship("Stock", back_populates="watchlist")

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