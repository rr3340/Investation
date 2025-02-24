from flask_restx import Resource, Namespace, fields
from backend.models import User, AuthenticationUser
from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from backend.utilities.decorators import admin_required

auth_ns = Namespace('auth', description = 'Authentication related operations')

signup_model =auth_ns.model(
    'SignUp',
    {
        "username": fields.String(required=True, description="Unique username", example="LebronJames"),
        "first_name": fields.String(required=True, description="First name", example="LeBron"),
        "last_name": fields.String(required=True, description="Last Name", example="James"),
        "gender": fields.String(required=True, description="Gender, must be in proper format. Refer to ex:", example="MALE/FEMALE/OTHER"),
        "age": fields.Integer(required=True, description="Age", example=25),
        "email": fields.String(required=True, description="User email", example="LebronGOATJames@GOATmail.com"),
        "password": fields.String(required=True, description="The password", example="Password12345!@$")
    }
)

login_model = auth_ns.model(
    'LogIn',
    {
        "username": fields.String(required=False, description="Unique username", example="LebronJames"),
        "email": fields.String(required=False, description="User email", example="LebronGOATJames@GOATmail.com"),
        "password": fields.String(required=True, description="The password", example="Password12345!@$")
    }
)

@auth_ns.route('/signup')
class SignUp(Resource):
    @auth_ns.expect(signup_model)
    @auth_ns.marshal_with(signup_model)
    def post(self):
        data = request.get_json()
        
        username = data.get("username")
        email = data.get("email")
        
        username_check = User.query.filter_by(username=username).first()
        email_check = User.query.filter_by(email=email).first()
        
        if username_check or email_check:
            taken_name = "username" if username_check else "email"
            taken_val = username if username_check else email
            return jsonify({"message": f"{taken_name.capitalize()} '{taken_val}' is already taken."})
        
        new_user = User(
            username=data.get("username"),
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
            gender=data.get("gender"),
            age=data.get("age"),
            email=data.get("email")
        )
        
        new_user.save()
        
        pw = data.get('password')
        
        auth_user = AuthenticationUser(
            id=new_user.id,
            password_hash=generate_password_hash(pw)
        )
        
        try:
            auth_user.save()
        except Exception as e:
            print(f"Error while saving auth_user: {e}")
            return jsonify({"message": "Error occurred while saving authentication details."}), 500
        
        return jsonify({
            "username": new_user.username,
            "first_name": new_user.first_name,
            "last_name": new_user.last_name,
            "gender": new_user.gender,
            "age": new_user.age,
            "email": new_user.email
        }), 201
        
@auth_ns.route('/login')
class LogIn(Resource):
    @auth_ns.expect(login_model)
    @auth_ns.marshal_with(login_model)
    def post(self):
        data = request.get_json()
        
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")
        
        if not username and not email:
            return jsonify({"message": "Missing required fields: username or email"}), 400
        
        if not password:
            return jsonify({"message": "Missing required field: password"}), 400
        
        login_user = User.query.filter((User.username == username) | (User.email == email)).first()
        
        if not login_user:
            return jsonify({"message": "User not found"}), 404
        
        auth_user = AuthenticationUser.query.filter_by(id=login_user.id).first()
        
        if not auth_user:
            return jsonify({"message": "User password not found"}), 404
        if not check_password_hash(auth_user.password_hash, password):
            return jsonify({"message": "Password is invalid"}), 401
        
        access_token = create_access_token(identity=str(auth_user.id), expires_delta=timedelta(days=1))
        refresh_token = create_refresh_token(identity=str(auth_user.id))
        
        return jsonify({
            "access_token": access_token,
            "refresh_token": refresh_token
        })
        
        
@auth_ns.route('/refresh')
class RefreshToken(Resource):
    @jwt_required(refresh=True)
    def post(self):
        current_user = get_jwt_identity()
        new_access_token = create_access_token(identity=current_user, expires_delta=timedelta(days=1))
        response = jsonify({"access_token": new_access_token})
        response.status_code = 200
        return response

@auth_ns.route('/protected')
class ProtectedResource(Resource):
    @jwt_required()
    def get(self):
        current_user = get_jwt_identity()
        response = jsonify({"message": f"Hello, user {current_user}!"})
        response.status_code = 200
        return response