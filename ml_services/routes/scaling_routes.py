from flask import request
from flask_restx import Namespace, Resource
from ..services.scaling.scaling_service import svm_scaler, lstm_scaler

scaling_ns = Namespace('scaling', description='Scaling operations')

@scaling_ns.route('/svm')
class ScaleSVMModelResource(Resource):
    def post(self):
        data = request.get_json()
        key = data.get('key')
        svm_scaler(key)
        return {"message": "Successfully scaled SVM data"}, 200
    
@scaling_ns.route('/lstm')
class ScaleLSTMModelResource(Resource):
    def post(self):
        data = request.get_json()
        key = data.get('key')
        lstm_scaler(key)
        return {"message": "Successfully scaled LSTM data"}, 200