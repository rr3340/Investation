from flask_restx import Resource, Namespace, fields
from backend.models import UserType, User
from flask import Flask, request
from flask_jwt_extended import jwt_required
from backend.utilities.decorators import admin_required

usertype_ns = Namespace('usertype', description='User type related operations')

usertype_model = usertype_ns.model(
    "UserType",
    {
        "id": fields.Integer(required=True, description="User ID", example=1),
        "admin": fields.Boolean(required=True, description="Admin status", example=True)
    }
)

@usertype_ns.route('/')
class UserTypeResource(Resource):
    @jwt_required()
    @usertype_ns.marshal_list_with(usertype_model)
    def get(self):
        """Get all user types"""
        user_types = UserType.query.all()
        return user_types
    
    @jwt_required()
    @admin_required
    @usertype_ns.marshal_with(usertype_model)
    @usertype_ns.expect(usertype_model)
    def post(self):
        """Create a user type"""
        data = request.get_json()
        new_usertype = UserType(
            id=data.get("id"),
            admin=data.get("admin", False)
        )
        new_usertype.save()
        return new_usertype, 201
    
@usertype_ns.route('/<int:id>')
class UserTypeResourceById(Resource):
    @jwt_required()
    @usertype_ns.marshal_with(usertype_model)
    def get(self, id):
        """Get user type by id"""
        usertype = UserType.query.get_or_404(id)
        return usertype
    
    @jwt_required()
    @usertype_ns.marshal_with(usertype_model)
    def put(self, id):
        """Update user type"""
        update_usertype = UserType.query.get_or_404(id)
        data = request.get_json()
        update_usertype.update(**data)
        return update_usertype
    
    @jwt_required()
    @admin_required
    @usertype_ns.marshal_with(usertype_model)
    def delete(self, id):
        """Delete user type by id"""
        delete_usertype = UserType.query.get_or_404(id)
        delete_usertype.delete()
        return delete_usertype