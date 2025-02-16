from flask_restx import Resource, Namespace, fields
from models import PriceAlert
from flask import request
from flask_jwt_extended import jwt_required
from datetime import datetime
from services import set_price_alert
from decorator import admin_required

pricealert_ns = Namespace('pricealerts', description='Price Alert related operations')

pricealert_model = pricealert_ns.model(
    "PriceAlert",
    {
        "id": fields.Integer(required=True, description="Alert ID", example=1),
        "user_id": fields.Integer(required=True, description="User ID", example=1),
        "stock_key": fields.String(required=True, description="Stock Key", example="AAPL"),
        "target_price": fields.Float(required=True, description="Target Price", example=150.00),
        "status": fields.String(required=True, description="Status", example="active"),
        "created_at": fields.DateTime(description="Created At")
    }
)

@pricealert_ns.route('/pricealerts')
class PriceAlertResource(Resource):
    @jwt_required()
    @pricealert_ns.marshal_list_with(pricealert_model)
    def get(self):
        """Get all price alerts"""
        pricealerts = PriceAlert.query.all()
        return pricealerts

    @jwt_required()
    @admin_required
    @pricealert_ns.marshal_with(pricealert_model)
    @pricealert_ns.expect(pricealert_model)
    def post(self):
        """Create a price alert"""
        data = request.get_json()
        created_at = data.get("created_at")
        if created_at:
            created_at = datetime.fromisoformat(created_at)
        pricealert = PriceAlert(
            user_id=data.get("user_id"),
            stock_key=data.get("stock_key"),
            target_price=data.get("target_price"),
            status=data.get("status"),
            created_at=created_at
        )
        pricealert.save()
        return pricealert, 201

@pricealert_ns.route('/pricealerts/<int:id>')
class PriceAlertResourceById(Resource):
    @jwt_required()
    @pricealert_ns.marshal_with(pricealert_model)
    def get(self, id):
        """Get price alert by id"""
        pricealert = PriceAlert.query.get_or_404(id)
        return pricealert

    @jwt_required()
    @admin_required
    @pricealert_ns.marshal_with(pricealert_model)
    @pricealert_ns.expect(pricealert_model)
    def put(self, id):
        """Update price alert"""
        update_pricealert = PriceAlert.query.get_or_404(id)
        data = request.get_json()
        created_at = data.get("created_at")
        if created_at:
            created_at = datetime.fromisoformat(created_at)
        data["created_at"] = created_at
        update_pricealert.update(**data)
        return update_pricealert

    @jwt_required()
    @admin_required
    @pricealert_ns.marshal_with(pricealert_model)
    def delete(self, id):
        """Delete price alert by id"""
        delete_pricealert = PriceAlert.query.get_or_404(id)
        delete_pricealert.delete()
        return delete_pricealert
    
@pricealert_ns.route('/pricealerts/set_price_alert')
class SetPriceAlertResource(Resource):
    @jwt_required()
    @pricealert_ns.expect(pricealert_model)
    def post(self):
        """Set a price alert"""
        data = request.get_json()
        user_id = data.get("user_id")
        stock_key = data.get("stock_key")
        target_price = data.get("target_price")
        try:
            result = set_price_alert(user_id, stock_key, target_price)
            return result, 201
        except Exception as e:
            pricealert_ns.abort(404, str(e))