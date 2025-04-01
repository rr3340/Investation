from flask_restx import Resource, Namespace, fields
from backend.models import User, AuthenticationUser, PortfolioUser, UserType
from flask import request, jsonify
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from backend.utilities.decorators import admin_required
from backend.utilities.validators import validate_signup_data, validate_login_data

auth_ns = Namespace('auth', description='Authentication related operations')

signup_model = auth_ns.model(
    'SignUp',
    {
        "username": fields.String(required=True, description="Unique username", example="LebronJames"),
        "first_name": fields.String(required=True, description="First name", example="LeBron"),
        "last_name": fields.String(required=True, description="Last Name", example="James"),
        "gender": fields.String(required=True, description="Gender, must be in proper format. Refer to ex:", example="MALE/FEMALE/OTHER"),
        "birth_date": fields.Date(required=True, description="Birth date in YYYY-MM-DD format", example="1984-12-30"),
        "mobile_phone": fields.String(required=False, description="Mobile phone number", example="+1234567890"),
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

# Response models for better documentation.
user_response_model = auth_ns.model(
    'UserResponse',
    {
        "username": fields.String(description="Username"),
        "first_name": fields.String(description="First name"),
        "last_name": fields.String(description="Last name"),
        "gender": fields.String(description="Gender"),
        "birth_date": fields.String(description="Birth date"),
        "mobile_phone": fields.String(description="Mobile phone"),
        "email": fields.String(description="Email")
    }
)

auth_response_model = auth_ns.model(
    'AuthResponse',
    {
        "access_token": fields.String(description="JWT access token"),
        "refresh_token": fields.String(description="JWT refresh token"),
        "user": fields.Nested(user_response_model)
    }
)

error_response_model = auth_ns.model(
    'ErrorResponse',
    {
        "success": fields.Boolean(description="Success status", example=False),
        "message": fields.String(description="Error message"),
        "errors": fields.Raw(description="Validation errors")
    }
)

# Password change model
password_change_model = auth_ns.model(
    'PasswordChange',
    {
        "current_password": fields.String(required=True, description="Current password"),
        "new_password": fields.String(required=True, description="New password")
    }
)

@auth_ns.route('/signup')
class SignUp(Resource):
    @auth_ns.expect(signup_model)
    @auth_ns.response(201, 'User created successfully', user_response_model)
    @auth_ns.response(400, 'Validation error', error_response_model)
    @auth_ns.response(500, 'Server error', error_response_model)
    def post(self):
        """Register a new user"""
        data = request.get_json()
        
        # Validates the input data
        validation_errors = validate_signup_data(data)
        if validation_errors:
            return {
                "success": False,
                "message": "Validation failed",
                "errors": validation_errors
            }, 400
        
        # Check if username or email already exists
        username = data.get("username")
        email = data.get("email")
        
        username_check = User.query.filter_by(username=username).first()
        email_check = User.query.filter_by(email=email).first()
        
        if username_check:
            return {
                "success": False,
                "message": "Username already taken",
                "errors": {"username": f"Username '{username}' is already taken."}
            }, 400
            
        if email_check:
            return {
                "success": False,
                "message": "Email already registered",
                "errors": {"email": f"Email '{email}' is already registered."}
            }, 400
        
        try:
            # Parses the birth_date from string to date object.
            birth_date_str = data.get("birth_date")
            try:
                birth_date = datetime.strptime(birth_date_str, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                return {
                    "success": False,
                    "message": "Invalid birth date format",
                    "errors": {"birth_date": "Invalid birth date format. Use YYYY-MM-DD."}
                }, 400
            
            # Creates a new user
            new_user = User(
                username=data.get("username"),
                first_name=data.get("first_name"),
                last_name=data.get("last_name"),
                gender=data.get("gender"),
                birth_date=birth_date,
                mobile_phone=data.get("mobile_phone"),
                email=data.get("email")
            )
            
            new_user.save()
            
            # Create authentication user
            auth_user = AuthenticationUser(
                id=new_user.id,
                password_hash=generate_password_hash(data.get('password'))
            )
            
            auth_user.save()
            
            # Creates a portfolio user with $10,000 starting balance.
            portfolio_user = PortfolioUser(
                id=new_user.id,
                balance=10000.0,
                total_assets=0.0,
                networth=10000.0,
                risk_tolerance='medium'
            )
            
            portfolio_user.save()
            
            # Create user type that is non admin by default.
            user_type = UserType(
                id=new_user.id,
                admin=False
            )
            
            user_type.save()
            
            return {
                "success": True,
                "message": "User registered successfully",
                "user": {
                    "username": new_user.username,
                    "first_name": new_user.first_name,
                    "last_name": new_user.last_name,
                    "gender": new_user.gender,
                    "birth_date": birth_date_str,
                    "mobile_phone": new_user.mobile_phone,
                    "email": new_user.email
                }
            }, 201
            
        except Exception as e:
            print(f"Error during registration: {e}")
            return {
                "success": False,
                "message": "An error occurred during registration"
            }, 500
        
@auth_ns.route('/login')
class LogIn(Resource):
    @auth_ns.expect(login_model)
    @auth_ns.response(200, 'Login successful', auth_response_model)
    @auth_ns.response(400, 'Validation error', error_response_model)
    @auth_ns.response(401, 'Authentication failed', error_response_model)
    @auth_ns.response(500, 'Server error', error_response_model)
    def post(self):
        """Authenticate a user and return tokens"""
        data = request.get_json()
        
        # Validate input data
        validation_errors = validate_login_data(data)
        if validation_errors:
            return {
                "success": False,
                "message": "Validation failed",
                "errors": validation_errors
            }, 400
        
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")
        
        try:
            # Find user by username or email
            login_user = User.query.filter((User.username == username) | (User.email == email)).first()
            
            if not login_user:
                return {
                    "success": False,
                    "message": "User not found",
                    "errors": {"auth": "Invalid username or email"}
                }, 401
            
            # Get authentication user
            auth_user = AuthenticationUser.query.filter_by(id=login_user.id).first()
            
            if not auth_user:
                return {
                    "success": False,
                    "message": "Authentication failed",
                    "errors": {"auth": "Authentication record not found"}
                }, 401
                
            # Check password
            if not check_password_hash(auth_user.password_hash, password):
                return {
                    "success": False,
                    "message": "Invalid password",
                    "errors": {"password": "Password is incorrect"}
                }, 401
            
            # Generating tokens
            access_token = create_access_token(identity=str(auth_user.id), expires_delta=timedelta(days=1))
            refresh_token = create_refresh_token(identity=str(auth_user.id))
            
            # Update last login timestamp
            login_user.last_login = datetime.now()
            login_user.save()
            
            return {
                "success": True,
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": {
                    "id": login_user.id,
                    "username": login_user.username,
                    "email": login_user.email,
                    "first_name": login_user.first_name,
                    "last_name": login_user.last_name
                }
            }
            
        except Exception as e:
            print(f"Error during login: {e}")
            return {
                "success": False,
                "message": "An error occurred during login"
            }, 500
        
@auth_ns.route('/refresh')
class RefreshToken(Resource):
    @jwt_required(refresh=True)
    @auth_ns.response(200, 'Token refreshed successfully')
    @auth_ns.response(401, 'Invalid refresh token')
    def post(self):
        """Refresh access token using refresh token"""
        try:
            current_user = get_jwt_identity()
            new_access_token = create_access_token(identity=current_user, expires_delta=timedelta(days=1))
            
            return {
                "success": True,
                "access_token": new_access_token
            }, 200
            
        except Exception as e:
            print(f"Error refreshing token: {e}")
            return {
                "success": False,
                "message": "Failed to refresh token"
            }, 401

@auth_ns.route('/protected')
class ProtectedResource(Resource):
    @jwt_required()
    @auth_ns.response(200, 'Access granted')
    @auth_ns.response(401, 'Unauthorized')
    def get(self):
        """Test protected route requiring authentication"""
        try:
            current_user = get_jwt_identity()
            user = User.query.get(current_user)
            
            if not user:
                return {
                    "success": False,
                    "message": "User not found"
                }, 401
                
            return {
                "success": True,
                "message": f"Hello, {user.first_name}!"
            }, 200
            
        except Exception as e:
            print(f"Error accessing protected route: {e}")
            return {
                "success": False,
                "message": "An error occurred while accessing the protected route"
            }, 500

@auth_ns.route('/change-password')
class ChangePassword(Resource):
    @jwt_required()
    @auth_ns.expect(password_change_model)
    @auth_ns.response(200, 'Password changed successfully')
    @auth_ns.response(400, 'Invalid request')
    @auth_ns.response(401, 'Unauthorized')
    def post(self):
        """Change user password"""
        try:
            # Gets the current user ID from JWT
            current_user_id = get_jwt_identity()
            
            data = request.get_json()
            
            # Validate required fields
            if not data.get('current_password') or not data.get('new_password'):
                return {
                    "success": False,
                    "message": "Both current and new password are required",
                    "errors": {"password": "Both current and new password are required"}
                }, 400
            
            # Gets the user and authentication records.
            user = User.query.get_or_404(current_user_id)
            auth_user = AuthenticationUser.query.get(current_user_id)
            
            if not auth_user:
                return {
                    "success": False,
                    "message": "Authentication record not found",
                    "errors": {"auth": "Authentication record not found"}
                }, 401
            
            # Verifies current password
            if not check_password_hash(auth_user.password_hash, data.get('current_password')):
                return {
                    "success": False,
                    "message": "Current password is incorrect",
                    "errors": {"current_password": "Current password is incorrect"}
                }, 401
            
            # Updates password
            auth_user.password_hash = generate_password_hash(data.get('new_password'))
            auth_user.update()
            
            return {
                "success": True,
                "message": "Password changed successfully"
            }, 200
            
        except Exception as e:
            print(f"Error changing password: {e}")
            return {
                "success": False,
                "message": "An error occurred while changing the password"
            }, 500