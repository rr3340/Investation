from decouple import config, UndefinedValueError
import os

BASE_DIR = os.path.dirname(os.path.realpath(__file__))

class Config:
    SECRET_KEY = config('SECRET_KEY', default='your_default_secret_key')
    SERVICE_NAME = config('SERVICE_NAME')
    REGION_NAME = config('REGION_NAME')
    AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY')
    
class DevConfig(Config):
    DEBUG = True

class ProdConfig(Config):
    DEBUG = False

class TestConfig(Config):
    DEBUG = True
    TESTING = True