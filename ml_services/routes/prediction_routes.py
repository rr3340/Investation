from flask import request
from flask_restx import Namespace, Resource
from ..services.prediction.prediction_service import svm_predictor, lstm_predictor

prediction_ns = Namespace('prediction', description='Prediction operations')

@prediction_ns.route('/svm')
class PredictSVMModelResource(Resource):
    def post(self):
        data = request.get_json()
        key = data.get('key')
        svm_predictor(key)
        return {"message": "Successfully predicted future stock data interval on SVM model"}, 200

@prediction_ns.route('/lstm')
class PredictLSTMModelResource(Resource):
    def post(self):
        data = request.get_json()
        key = data.get('key')
        lstm_predictor(key)
        return {"message": "Successfully predicted future stock data interval on LSTM model"}, 200