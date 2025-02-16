from decouple import config, UndefinedValueError
import os
from typing import Optional

BASE_DIR = os.path.dirname(os.path.realpath(__file__))

class Config:
    SECRET_KEY=config('SECRET_KEY')
    JWT_SECRET_KEY = config('JWT_SECRET_KEY')
    SQLALCHEMY_TRACK_MODIFICATIONS=config('SQLALCHEMY_TRACK_MODIFICATIONS',cast=bool)
    
    
class DevConfig(Config):
    SQLALCHEMY_DATABASE_URI="sqlite:///"+os.path.join(BASE_DIR,'dev.db')
    DEBUG=True
    SQLALCHEMY_ECHO=True
    
class ProdConfig(Config):
    pass

class TestConfig(Config):
    pass