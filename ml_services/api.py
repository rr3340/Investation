from flask import Flask, request
from flask_restx import Api, Namespace, Resource
from ml_services.train_model import retrain_svm_model, retrain_lstm_model
from ml_services.predict import svm_predictor, lstm_predictor
from ml_services.scaler import svm_scaler, lstm_scaler


app = Flask(__name__)
api = Api(app, version='1.0', title='ML Services API', description='API for Machine Learning Services')

ml_ns = Namespace('ml', description='Machine Learning operations')

@ml_ns.route('/scale_svm')
class ScaleSVMModelResource(Resource):
    def post(self):
        data = request.get_json()
        key = data.get('key')
        svm_scaler(key)
        return {"message": "Successfully scaled SVM data"}, 200
    
@ml_ns.route('/scale_lstm')
class ScaleLSTMModelResource(Resource):
    def post(self):
        data = request.get_json()
        key = data.get('key')
        lstm_scaler(key)
        return {"message": "Successfully scaled LSTM data"}, 200

@ml_ns.route('/retrain_svm')
class TrainSVMModelResource(Resource):
    def post(self):
        data = request.get_json()
        key = data.get('key')
        retrain_svm_model(key)
        return {"message": "Successfully retrained SVM model"}, 200

@ml_ns.route('/retrain_lstm')
class TrainLSTMModelResource(Resource):
    def post(self):
        data = request.get_json()
        key = data.get('key')
        retrain_lstm_model(key)
        return {"message": "Successfully retrained LSTM model"}, 200

@ml_ns.route('/predict_svm')
class PredictSVMModelResource(Resource):
    def post(self):
        data = request.get_json()
        key = data.get('key')
        svm_predictor(key)
        return {"message": "Successfully predicted future stock data interval on SVM model"}, 200

@ml_ns.route('/predict_lstm')
class PredictLSTMModelResource(Resource):
    def post(self):
        data = request.get_json()
        key = data.get('key')
        lstm_predictor(key)
        return {"message": "Successfully predicted future stock data interval on LSTM model"}, 200

api.add_namespace(ml_ns)

if __name__ == "__main__":
    app.run(debug=True, port=5001)