from backend.exts import db
from sqlalchemy.orm import deferred, relationship

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