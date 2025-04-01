from flask import Flask
from flask_restx import Api, Resource
from backend.models import User
from backend.models import AuthenticationUser
from backend.models.usertype import UserType
from backend.models.portfoliouser import PortfolioUser
from backend.models.stock import Stock
from backend.models.historicstock import HistoricStock
from backend.models.investment import Investment
from backend.models.tradehistory import TradeHistory
from backend.models.watchlist import Watchlist
from backend.models.pricealert import PriceAlert
from backend.exts import db
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from datetime import datetime, timedelta
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, jwt_required
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.orm import undefer
from backend.routes.user import user_ns
from backend.routes.stock import stock_ns
from backend.routes.historicstock import historicstock_ns
from backend.routes.usertype import usertype_ns
from backend.routes.portfolio import portfolio_ns
from backend.routes.investments import investment_ns
from backend.routes.watchlist import watchlist_ns
from backend.routes.tradehistory import trade_history_ns
from backend.routes.pricealert import pricealert_ns
from backend.routes.authorization import auth_ns

api = Api(version='1.0', title='Finance App API', description='API for Finance App')

hello_ns = api.namespace('api', description='Hello World API')

@hello_ns.route('/helloworld')
class HelloWorld(Resource):
    def get(self):
        return {'message': 'Hello, World!'}

def create_app(config):
    app = Flask(__name__)
    bcrypt = Bcrypt(app)
    app.config.from_object(config)
    CORS(app)
    db.init_app(app)

    migrate = Migrate(app, db)
    JWTManager(app)

    api.init_app(app)
    
    api.add_namespace(auth_ns)
    api.add_namespace(user_ns)
    api.add_namespace(usertype_ns)
    api.add_namespace(stock_ns)
    api.add_namespace(historicstock_ns)
    api.add_namespace(portfolio_ns)
    api.add_namespace(investment_ns)
    api.add_namespace(watchlist_ns)
    api.add_namespace(trade_history_ns)
    api.add_namespace(pricealert_ns)
    api.add_namespace(hello_ns)
        
    @app.shell_context_processor
    def make_shell_context():
        return {
            "db": db,
            "User": User
        }

    return app