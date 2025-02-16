from flask_restx import Resource, Namespace, fields
from models import TradeHistory
from flask import request
from flask_jwt_extended import jwt_required
from datetime import datetime
from services import get_trade_history
from decorator import admin_required 

trade_history_ns = Namespace('trade_history', description='User related operations')

trade_history_model = trade_history_ns.model(
    "TradeHistory",
    {
        "trade_id": fields.Integer(required=True, description="Trade ID", example=1),
        "user_id": fields.Integer(required=True, description="User ID", example=1),
        "stock_key": fields.String(required=True, description="Stock Key", example="AAPL"),
        "quantity": fields.Integer(required=True, description="Quantity", example=10),
        "trade_price": fields.Float(required=False, description="Trade Price", example=145.00),
        "trade_type": fields.String(required=True, description="Trade Type", example='BUY or SELL'),
        "trade_date": fields.DateTime(description="Trade Date")
    }
)

@trade_history_ns.route('/trade_history')
class TradeHistoryResource(Resource):
    @jwt_required()
    @trade_history_ns.marshal_list_with(trade_history_model)
    def get(self):
        """Get all trade history items"""
        trade_history = TradeHistory.query.all()
        return trade_history

    @jwt_required()
    @admin_required
    @trade_history_ns.marshal_with(trade_history_model)
    @trade_history_ns.expect(trade_history_model)
    def post(self):
        """Create a trade history item"""
        data = request.get_json()
        trade_date = data.get("trade_date")
        if trade_date:
            trade_date = datetime.fromisoformat(trade_date)
        new_trade = TradeHistory(
            user_id=data.get("user_id"),
            stock_key=data.get("stock_key"),
            quantity=data.get("quantity"),
            trade_price=data.get("trade_price"),
            trade_type=data.get("trade_type"),
            trade_date=trade_date
        )
        new_trade.save()
        return new_trade, 201

@trade_history_ns.route('/trade_history/<int:id>')
class TradeHistoryResourceById(Resource):
    @jwt_required()
    @trade_history_ns.marshal_with(trade_history_model)
    def get(self, id):
        """Get trade history item by id"""
        trade_history = TradeHistory.query.get_or_404(id)
        return trade_history

    @jwt_required()
    @admin_required
    @trade_history_ns.marshal_with(trade_history_model)
    @trade_history_ns.expect(trade_history_model)
    def put(self, id):
        """Update trade history item"""
        update_trade_history = TradeHistory.query.get_or_404(id)
        data = request.get_json()
        trade_date = data.get("trade_date")
        if trade_date:
            trade_date = datetime.fromisoformat(trade_date)
        data["trade_date"] = trade_date
        update_trade_history.update(**data)
        return update_trade_history

    @jwt_required()
    @admin_required
    @trade_history_ns.marshal_with(trade_history_model)
    def delete(self, id):
        """Delete trade history item by id"""
        delete_trade = TradeHistory.query.get_or_404(id)
        delete_trade.delete()
        return delete_trade
    
@trade_history_ns.route('/trade_history/user/<int:user_id>')
class TradeHistoryByUserResource(Resource):
    @jwt_required()
    @trade_history_ns.response(200, 'Success')
    @trade_history_ns.response(404, 'User not found')
    def get(self, user_id):
        """Get trade history for a user"""
        try:
            trade_history = get_trade_history(user_id)
            return trade_history, 200
        except Exception as e:
            trade_history_ns.abort(404, str(e))