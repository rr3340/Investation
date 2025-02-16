from flask_restx import Resource, Namespace, fields
from models import Watchlist, User
from flask import request
from flask_jwt_extended import jwt_required
from datetime import datetime
from services import add_to_watchlist
from decorator import admin_required

watchlist_ns = Namespace('watchlist', description='User related operations')

watchlist_model = watchlist_ns.model(
    "Watchlist",
    {
        "id": fields.Integer(required=True, description="Trade ID", example=1),
        "user_id": fields.Integer(required=True, description="User ID", example=1),
        "stock_key": fields.String(required=True, description="Unique username", example="LebronJames"),
        "added_date": fields.DateTime(description="Last login")
    }
)

@watchlist_ns.route('/watchlist')
class WatchlistResource(Resource):
    @jwt_required()
    @watchlist_ns.marshal_list_with(watchlist_model)
    def get(self):
        """Get all watchlist items"""
        watchlist = Watchlist.query.all()
        return watchlist

    @jwt_required()
    @admin_required
    @watchlist_ns.marshal_with(watchlist_model)
    @watchlist_ns.expect(watchlist_model)
    def post(self):
        """Create a watchlist item"""
        data = request.get_json()
        added_date = data.get("added_date")
        if added_date:
            added_date = datetime.fromisoformat(added_date)
        watchlist = Watchlist(
            user_id=data.get("user_id"),
            stock_key=data.get("stock_key"),
            added_date=added_date
        )
        watchlist.save()
        return watchlist, 201

@watchlist_ns.route('/watchlist/<int:id>')
class WatchlistResourceById(Resource):
    @jwt_required()
    @watchlist_ns.marshal_with(watchlist_model)
    def get(self, id):
        """Get watchlist item by id"""
        watchlist = Watchlist.query.get_or_404(id)
        return watchlist

    @jwt_required()
    @admin_required
    @watchlist_ns.marshal_with(watchlist_model)
    @watchlist_ns.expect(watchlist_model)
    def put(self, id):
        """Update watchlist item"""
        update_watchlist = Watchlist.query.get_or_404(id)
        data = request.get_json()
        added_date = data.get("added_date")
        if added_date:
            added_date = datetime.fromisoformat(added_date)
        data["added_date"] = added_date
        update_watchlist.update(**data)
        return update_watchlist

    @jwt_required()
    @admin_required
    @watchlist_ns.marshal_with(watchlist_model)
    def delete(self, id):
        """Delete watchlist item by id"""
        delete_watchlist = Watchlist.query.get_or_404(id)
        delete_watchlist.delete()
        return delete_watchlist
    
@watchlist_ns.route('/watchlist/add_to_watchlist')
class AddToWatchlistResource(Resource):
    @jwt_required()
    @watchlist_ns.expect(watchlist_model)
    def post(self):
        """Add to watchlist"""
        data = request.get_json()
        user_id = data.get("user_id")
        stock_key = data.get("stock_key")
        try:
            result = add_to_watchlist(user_id, stock_key)
            return result, 201
        except Exception as e:
            watchlist_ns.abort(404, str(e))