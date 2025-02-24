from backend.exts import db
from sqlalchemy.orm import relationship

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