from flask import Flask
from flask_restx import Api
from ml_services.config import Config

api = Api(version='1.0', title='ML Services API', description='API for Machine Learning Services')

def create_app(config):
    app = Flask(__name__)
    app.config.from_object(config)

    api.init_app(app)

    return app

if __name__ == "__main__":
    app = create_app(Config)
    app.run(debug=True)