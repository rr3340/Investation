from backend.exts import db
from sqlalchemy.orm import relationship
from datetime import datetime

class HistoricStock(db.Model):
    __tablename__ = 'historic_stock'
    
    record_id = db.Column(db.Integer(), primary_key=True)
    stock_key = db.Column(db.String(10), db.ForeignKey('stock.stock_key'), nullable=False)
    datetime = db.Column(db.DateTime(), nullable=False)
    open = db.Column(db.Float(), nullable=True)
    high = db.Column(db.Float(), nullable=True)
    low = db.Column(db.Float(), nullable=True)
    close = db.Column(db.Float(), nullable=True)
    volume = db.Column(db.Float(), nullable=True)
    
    stock = db.relationship("Stock", back_populates="historic_data")
    
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