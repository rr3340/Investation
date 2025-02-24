from flask_restx import Resource, Namespace, fields
from backend.models import User
from flask import Flask, request
from flask_jwt_extended import jwt_required
from datetime import datetime
from backend.utilities.decorators import admin_required

user_ns = Namespace('users', description = 'User related operations')

user_model = user_ns.model(
    "User",
    {
    "id": fields.Integer(required=True,description="User ID", example=1),
    "username": fields.String(required=True,description="Unique username", example="LebronJames"),
    "first_name": fields.String(required=True,description="First name", example="LeBron"),
    "last_name": fields.String(required=True,description="Last Name", example="James"),
    "gender": fields.String(required=True, description="Gender, must be in proper format. Refer to ex:",example="MALE/FEMALE/OTHER"),
    "age": fields.Integer(required=True,description="Age", example=25),
    "about": fields.String(description = "Short biography", example="Le Sserafim stan | Buckeyes Fanatic"),
    "nationality": fields.String(description = "User nationality", example="Great Britain"),
    "email": fields.String(required=True,description = "User email", example="LebronGOATJames@GOATmail.com"),
    "profile_img": fields.String(description = "Image url for profile", example="https://website.com/pfp.jpg"),
    "created_at": fields.DateTime(description="Date of account creation"),
    "last_login": fields.DateTime(description="Last login")
}
    )

@user_ns.route('/')
class UserResource(Resource):
    @jwt_required()
    @user_ns.marshal_list_with(user_model)
    def get(self):
        """Get all users"""
        users = User.query.all()
        return users
    
    @jwt_required()
    @admin_required
    @user_ns.marshal_with(user_model)
    @user_ns.expect(user_model)
    def post(self):
        """Create a user"""
        
        data = request.get_json()

        new_user = User(
                username = data.get("username"),
                first_name = data.get("first_name"),
                last_name = data.get("last_name"),
                gender = data.get("gender"),
                age = data.get("age"),
                about = data.get("about"),
                nationality = data.get("nationality"),
                email = data.get("email"),
                profile_img = data.get("profile_img"),
                last_login = data.get("last_login")
        )
        
        new_user.save()
        
        return new_user, 201
    
@user_ns.route('/<int:id>')
class UserResourceById(Resource):
    @jwt_required()
    @user_ns.marshal_with(user_model)
    def get(self, id):
        """Get user information by the id"""
        
        user = User.query.get_or_404(id)
        
        return user
    
    @jwt_required()
    @admin_required
    @user_ns.marshal_with(user_model)
    def put(self, id):
        """Update user"""
        
        update_user = User.query.get_or_404(id)
        data = request.get_json()
        update_user.update(**data)
        
        return update_user
    
    @jwt_required()
    @admin_required
    @user_ns.marshal_with(user_model)
    def delete(self, id):
        """Delete user by id"""
        delete_user = User.query.get_or_404(id)
        
        delete_user.delete()
        
        return delete_user