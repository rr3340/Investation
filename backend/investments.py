from flask_restx import Resource, Namespace, fields
from models import Investment
from flask import Flask, request,jsonify
from flask_jwt_extended import JWTManager, jwt_required
from datetime import datetime
from dateutil import parser
import pytz
from decorator import admin_required

investment_ns = Namespace('investment', description='Investment related operations')

investment_model = investment_ns.model(
    "Investment",
    {
        "investment_id": fields.Integer(required=True, description="Investment ID", example=1),
        "user_id": fields.Integer(required=True, description="User ID", example=1),
        "portfolio_user_id": fields.Integer(required=True, description="Portfolio ID", example=1),
        "stock_key": fields.String(required=True, description="Stock key", example="AAPL"),
        "quantity": fields.Float(required=True, description="Quantity of stock", example=10),
        "purchase_price": fields.Float(required=True, description="Purchase price of stock", example=100.50),
        "purchase_date": fields.DateTime(required=True, description="Purchase date of stock", example="2021-09-01"),
        "last_update": fields.DateTime(required=True, description="Last update of stock", example="2021-09-01")
    }
    )

@investment_ns.route('/investment')
class InvestmentResource(Resource):
    @jwt_required()
    @investment_ns.marshal_list_with(investment_model)
    def get(self):
        """Get all investments"""
        investments = Investment.query.all()
        return investments
    
    @jwt_required()
    @admin_required
    @investment_ns.marshal_with(investment_model)
    @investment_ns.expect(investment_model)
    def post(self):
        """Create an investment"""
        data = request.get_json()
        
        purchase_date_obj = parser.parse(data.get("purchase_date"))
        last_date_obj = parser.parse(data.get("last_update"))
        
        new_investment = Investment(
            investment_id=data.get("investment_id"),
            user_id=data.get("user_id"),
            portfolio_user_id=data.get("portfolio_user_id"),
            stock_key=data.get("stock_key"),
            quantity=data.get("quantity"),
            purchase_price=data.get("purchase_price"),
            purchase_date=purchase_date_obj,
            last_update=last_date_obj
        )
        new_investment.save()
        return new_investment, 201
    
@investment_ns.route('/investment/<int:id>')
class InvestmentResourceById(Resource):
    @jwt_required()
    @investment_ns.marshal_with(investment_model)
    def get(self, id):
        """Get investment by the id"""
        investment = Investment.query.get_or_404(id)
        return investment
    
    @jwt_required()
    @admin_required
    @investment_ns.marshal_with(investment_model)
    def put(self, id):
        """Update investment"""
        update_investment = Investment.query.get_or_404(id)
        data = request.get_json()
        parser.parse(data.get("purchase_date"))
        datetime_obj = parser.parse(data["purchase_date"])
        data["purchase_date"] = datetime_obj
        last_date_obj = parser.parse(data.get("last_update"))
        data["last_update"] = last_date_obj
        update_investment.update(**data)
        return update_investment
    
    @jwt_required()
    @admin_required
    @investment_ns.marshal_with(investment_model)
    def delete(self, id):
        """Delete investment by id"""
        delete_investment = Investment.query.get_or_404(id)
        delete_investment.delete()
        return delete_investment