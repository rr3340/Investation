from flask import Flask
from flask_restx import Api, Namespace, Resource
from ml_services.config import Config
from ml_services.routes.scaling_routes import scaling_ns
from ml_services.routes.prediction_routes import prediction_ns
from ml_services.routes.training_routes import training_ns

api = Api(version='1.0', title='ML Services API', description='API for Machine Learning Services')

def create_app(config):
    app = Flask(__name__)
    app.config.from_object(config)

    api.init_app(app)
    api.add_namespace(scaling_ns)
    api.add_namespace(prediction_ns)
    api.add_namespace(training_ns)

    return app

if __name__ == "__main__":
    app = create_app(Config)
    app.run(debug=True, port=5001)