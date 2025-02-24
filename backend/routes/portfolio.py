from flask_restx import Resource, Namespace, fields
from backend.models import User, PortfolioUser, Investment
from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, jwt_required
from backend.utilities.decorators import admin_required
from backend.services.portfolio.calculate_networth import calculate_networth
from backend.services.portfolio.get_portfolio_summary import get_portfolio_summary
from backend.services.portfolio.calculate_unrealized_gains import calculate_unrealized_gains
from backend.services.portfolio.update_risk_profile import update_risk_profile

portfolio_ns = Namespace('portfolio', description='User portfolio related operations')

investment_output_model = portfolio_ns.model('InvestmentOutput', {
    'investment_id': fields.Integer(attribute='investment_id')
})

portfolio_user_model = portfolio_ns.model(
    "Portfolio",
    {
        "id": fields.Integer(required=True, description="User ID", example=1),
        "networth": fields.Float(required=False, description="Net worth of the user", example=100000.50),
        "balance": fields.Float(required=False, description="Net worth of the user", example=100000.50),
        "total_assets": fields.Float(required=False, description="Net worth of the user", example=100000.50),
        "investments": fields.List(fields.Nested(investment_output_model), description="List of investments")
    }
)

@portfolio_ns.route('/')
class PortfolioUserResource(Resource):
    @jwt_required()
    @portfolio_ns.marshal_list_with(portfolio_user_model)
    def get(self):
        """Get all portfolios"""
        user_portfolio = PortfolioUser.query.all()
        return user_portfolio
    
    @jwt_required()
    @admin_required
    @portfolio_ns.marshal_with(portfolio_user_model)
    @portfolio_ns.expect(portfolio_user_model)
    def post(self):
        """Create or update a user's portfolio"""
        data = request.get_json()
        investment_ids = data.get('investments', [])

        investments = Investment.query.filter(Investment.investment_id.in_(investment_ids)).all()

        if len(investments) != len(investment_ids):
            portfolio_ns.abort(404, 'One or more investment IDs are invalid or do not exist.')

        existing_portfolio = PortfolioUser.query.get(data["id"])
        if existing_portfolio:
            existing_portfolio.networth = data["networth"]
            for investment in investments:
                investment.portfolio_user_id = existing_portfolio.id
                investment.save()
            existing_portfolio.investments = investments
            existing_portfolio.save()
            return existing_portfolio, 200
        else:
            new_user_portfolio = PortfolioUser(
                id=data["id"],
                networth=data["networth"]
            )
            new_user_portfolio.save()
            for investment in investments:
                investment.portfolio_user_id = new_user_portfolio.id
                investment.save()
            new_user_portfolio.investments = investments
            new_user_portfolio.save()
            
            calculate_networth(new_user_portfolio.id)
            
            return new_user_portfolio, 201
    
@portfolio_ns.route('/<int:id>')
class PortfolioUserResourceById(Resource):
    @jwt_required()
    @portfolio_ns.marshal_with(portfolio_user_model)
    def get(self, id):
        """Get user portfolio by the id"""
        user_portfolio = PortfolioUser.query.get_or_404(id)
        return user_portfolio
    
    @jwt_required()
    @admin_required
    @portfolio_ns.marshal_with(portfolio_user_model)
    @portfolio_ns.expect(portfolio_user_model)
    def put(self, id):
        """Update user portfolio"""
        update_user_portfolio = PortfolioUser.query.get_or_404(id)
        data = request.get_json()
        investment_ids = data.get('investments', [])

        investments = Investment.query.filter(Investment.investment_id.in_(investment_ids)).all()

        if len(investments) != len(investment_ids):
            portfolio_ns.abort(404, 'One or more investment IDs are invalid or do not exist.')

        update_user_portfolio.networth = data["networth"]
        for investment in investments:
            investment.portfolio_user_id = update_user_portfolio.id
            investment.save()
        update_user_portfolio.investments = investments
        update_user_portfolio.save()
        
        calculate_networth(update_user_portfolio.id)
        
        return update_user_portfolio
    
    @jwt_required()
    @admin_required
    @portfolio_ns.marshal_with(portfolio_user_model)
    def delete(self, id):
        """Delete user portfolio by id"""
        delete_user_portfolio = PortfolioUser.query.get_or_404(id)
        for investment in delete_user_portfolio.investments:
            investment.delete()
        delete_user_portfolio.delete()
        return delete_user_portfolio
    
@portfolio_ns.route('/summary/<int:user_id>')
class PortfolioSummaryResource(Resource):
    @jwt_required()
    @portfolio_ns.response(200, 'Success')
    @portfolio_ns.response(404, 'User not found')
    def get(self, user_id):
        """Get portfolio summary for a user"""
        try:
            summary = get_portfolio_summary(user_id)
            return summary, 200
        except Exception as e:
            portfolio_ns.abort(404, str(e))

@portfolio_ns.route('/unrealized_gains/<int:user_id>')
class UnrealizedGainsResource(Resource):
    @jwt_required()
    @portfolio_ns.response(200, 'Success')
    @portfolio_ns.response(404, 'User not found')
    def get(self, user_id):
        """Calculate unrealized gains for a user"""
        try:
            gains = calculate_unrealized_gains(user_id)
            return gains, 200
        except Exception as e:
            portfolio_ns.abort(404, str(e))

@portfolio_ns.route('/networth/<int:portfolio_user_id>')
class NetworthResource(Resource):
    @jwt_required()
    @portfolio_ns.response(200, 'Success')
    @portfolio_ns.response(404, 'Portfolio user not found')
    def get(self, portfolio_user_id):
        """Calculate networth for a portfolio user"""
        try:
            networth = calculate_networth(portfolio_user_id)
            return {"portfolio_user_id": portfolio_user_id, "networth": networth}, 200
        except Exception as e:
            portfolio_ns.abort(404, str(e))
            
@portfolio_ns.route('/risk_profile/<int:user_id>')
class RiskProfileResource(Resource):
    @jwt_required()
    @portfolio_ns.expect(portfolio_user_model)
    @portfolio_ns.response(200, 'Success')
    @portfolio_ns.response(404, 'User not found')
    def put(self, user_id):
        """Update risk profile for a user"""
        data = request.get_json()
        risk_tolerance = data.get("risk_tolerance")
        if risk_tolerance not in ["low", "medium", "high"]:
            portfolio_ns.abort(400, "Invalid risk tolerance value. Must be 'low', 'medium', or 'high'.")
        try:
            update_risk_profile(user_id, risk_tolerance)
            return {"message": f"Risk tolerance updated to {risk_tolerance}"}, 200
        except Exception as e:
            portfolio_ns.abort(404, str(e))