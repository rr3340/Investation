from flask import request
from flask_restx import Namespace, Resource
from ..services.training.training_service import retrain_svm_model, retrain_lstm_model

training_ns = Namespace('training', description='Model training operations')

@training_ns.route('/svm')
class TrainSVMModelResource(Resource):
    def post(self):
        data = request.get_json()
        key = data.get('key')
        retrain_svm_model(key)
        return {"message": "Successfully retrained SVM model"}, 200

@training_ns.route('/lstm')
class TrainLSTMModelResource(Resource):
    def post(self):
        data = request.get_json()
        key = data.get('key')
        retrain_lstm_model(key)
        return {"message": "Successfully retrained LSTM model"}, 200