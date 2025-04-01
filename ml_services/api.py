from flask import Flask, request
from flask_restx import Api, Namespace, Resource
from ml_services.routes.scaling_routes import scaling_ns
from ml_services.routes.prediction_routes import prediction_ns
from ml_services.routes.training_routes import training_ns

app = Flask(__name__)
api = Api(app, version='1.0', title='ML Services API', description='API for Machine Learning Services')

api.add_namespace(scaling_ns)
api.add_namespace(prediction_ns)
api.add_namespace(training_ns)

if __name__ == "__main__":
    app.run(debug=True, port=5001, threaded=True)