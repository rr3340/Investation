from exts import db
from sqlalchemy.orm import deferred, relationship
from flask_jwt_extended import create_access_token
from flask import Flask, request, jsonify


class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer(), primary_key=True)
    username = db.Column(db.String(15), nullable=False, unique=True, index=True)
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    gender = db.Column(db.String(10), nullable=False)
    age = db.Column(db.Integer(), nullable=False)
    about = db.Column(db.String(150), nullable=True)
    nationality = db.Column(db.String(80), nullable=True)
    email = db.Column(db.String(80), nullable=False, unique=True, index=True)
    profile_img = db.Column(db.String(255), nullable=True)
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
        user_type = UserType.query.filter_by(id=self.id).first()
        return user_type and user_type.admin

class AuthenticationUser(db.Model):
    __tablename__ = 'user_authentication'
    
    id = db.Column(db.Integer(), db.ForeignKey('users.id'), primary_key=True)
    password_hash = deferred(db.Column(db.String(255), nullable=False))
    
    user = db.relationship("User", back_populates="auth_user")
    
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
    
class UserType(db.Model):
    __tablename__ = 'user_type'
    
    id = db.Column(db.Integer(), db.ForeignKey('users.id'), primary_key=True)
    admin = db.Column(db.Boolean, nullable=False, default=False)
    
    user = db.relationship("User", back_populates="privilege")
    
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