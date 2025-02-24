from backend.exts import db
from sqlalchemy.orm import relationship
from datetime import datetime

class PortfolioUser(db.Model):
    __tablename__ = 'user_portfolio'
    id = db.Column(db.Integer(), db.ForeignKey('users.id'), primary_key=True)
    networth = db.Column(db.Float, nullable=True)
    balance = db.Column(db.Float, nullable=True, default=0.0)
    total_assets = db.Column(db.Float, nullable=True, default=0.0)
    risk_tolerance = db.Column(db.String(10), nullable=True, default='medium')  #Low, medium or high
    
    investments = db.relationship('Investment', back_populates='portfolio_user', lazy=True)
    user = db.relationship("User", back_populates="portfolio_user")

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