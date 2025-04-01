from backend.exts import db
from sqlalchemy.orm import relationship
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer(), primary_key=True)
    username = db.Column(db.String(15), nullable=False, unique=True, index=True)
    display_name = db.Column(db.String(50), nullable=True)
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    gender = db.Column(db.String(10), nullable=False)
    birth_date = db.Column(db.Date(), nullable=False)
    mobile_phone = db.Column(db.String(20), nullable=True)
    about = db.Column(db.String(150), nullable=True)
    nationality = db.Column(db.String(80), nullable=True)
    email = db.Column(db.String(80), nullable=False, unique=True, index=True)
    profile_img = db.Column(db.String(255), nullable=True)
    profile_banner = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime(), nullable=False, default=db.func.now())
    last_login = db.Column(db.DateTime(), nullable=True)
    
    auth_user = db.relationship("AuthenticationUser", uselist=False, back_populates="user")
    portfolio_user = db.relationship("PortfolioUser", uselist=False, back_populates="user")
    investments = db.relationship("Investment", back_populates="user")
    privilege = db.relationship("UserType", uselist=False, back_populates="user")
    trade_history = db.relationship('TradeHistory', back_populates='user', lazy=True)
    watchlist = db.relationship('Watchlist', back_populates='user', lazy=True)
    price_alerts = db.relationship('PriceAlert', back_populates='user', lazy=True)
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"
    
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
        
    def is_admin(self):
        from .usertype import UserType
        user_type = UserType.query.filter_by(id=self.id).first()
        return user_type and user_type.admin