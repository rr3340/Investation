from backend.exts import db
from sqlalchemy.orm import relationship
from datetime import datetime

class PriceAlert(db.Model):
    __tablename__ = 'price_alerts'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    stock_key = db.Column(db.String(10), db.ForeignKey('stock.stock_key'), nullable=False)
    target_price = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(10), nullable=False, default='active')  #if the status is "active" or "inactive"
    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())

    user = db.relationship("User", back_populates="price_alerts")
    stock = db.relationship("Stock", back_populates="price_alerts")

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