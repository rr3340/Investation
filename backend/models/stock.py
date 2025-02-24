from backend.exts import db
from sqlalchemy.orm import relationship

class Stock(db.Model):
    __tablename__ = 'stock'
    
    stock_key = db.Column(db.String(10), primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    sector = db.Column(db.String(80), nullable=False)
    industry = db.Column(db.String(80), nullable=False)
    
    historic_data = db.relationship("HistoricStock", back_populates="stock")
    trade_history = db.relationship("TradeHistory", back_populates="stock", lazy=True)
    watchlist = db.relationship("Watchlist", back_populates="stock", lazy=True)
    price_alerts = db.relationship('PriceAlert', back_populates='stock', lazy=True)
    
    def save(self):
        db.session.add(self)
        db.session.commit()
        
    def delete(self):
        db.session.delete(self)
        db.session.commit()
        
    def update(self, **kwargs):
        for key, value in kwargs.items():
            if hasattr(self,key):
                setattr(self, key, value)
        db.session.commit()