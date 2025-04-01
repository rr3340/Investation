from flask_restx import Resource, Namespace, fields
from backend.models import User
from flask import Flask, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from backend.utilities.decorators import admin_required

user_ns = Namespace('users', description = 'User related operations')

user_model = user_ns.model(
    "User",
    {
    "id": fields.Integer(required=True,description="User ID", example=1),
    "username": fields.String(required=True,description="Unique username", example="LebronJames"),
    "display_name": fields.String(description="Display name (not unique)", example="King James"),
    "first_name": fields.String(required=True,description="First name", example="LeBron"),
    "last_name": fields.String(required=True,description="Last Name", example="James"),
    "gender": fields.String(required=True, description="Gender, must be in proper format. Refer to ex:",example="MALE/FEMALE/OTHER"),
    "birth_date": fields.Date(required=True,description="Date of birth", example="2000-01-01"),
    "mobile_phone": fields.String(description="User's mobile phone number", example="+1234567890"),
    "about": fields.String(description = "Short biography", example="Le Sserafim stan | Buckeyes Fanatic"),
    "nationality": fields.String(description = "User nationality", example="Great Britain"),
    "email": fields.String(required=True,description = "User email", example="LebronGOATJames@GOATmail.com"),
    "profile_img": fields.String(description = "Image url for profile", example="https://website.com/pfp.jpg"),
    "profile_banner": fields.String(description = "Image url for profile banner", example="https://website.com/banner.jpg"),
    "created_at": fields.DateTime(description="Date of account creation"),
    "last_login": fields.DateTime(description="Last login")
}
    )

profile_display_model = user_ns.model(
    "ProfileDisplay",
    {
    "display_name": fields.String(description="Display name (not unique)", example="King James"),
    "about": fields.String(description="Short biography", example="Le Sserafim stan | Buckeyes Fanatic"),
    "profile_img": fields.String(description="Image url for profile", example="https://website.com/pfp.jpg"),
    "profile_banner": fields.String(description="Image url for profile banner", example="https://website.com/banner.jpg"),
    "nationality": fields.String(description="User nationality", example="Great Britain")
    }
)

sensitive_info_model = user_ns.model(
    "SensitiveInfo",
    {
    "username": fields.String(description="Unique username", example="LebronJames"),
    "email": fields.String(description="User email", example="LebronGOATJames@GOATmail.com"),
    "mobile_phone": fields.String(description="User's mobile phone number", example="+1234567890"),
    "first_name": fields.String(description="First name", example="LeBron"),
    "last_name": fields.String(description="Last Name", example="James"),
    "gender": fields.String(description="Gender", example="MALE/FEMALE/OTHER"),
    "birth_date": fields.Date(description="Date of birth", example="2000-01-01")
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
                display_name = data.get("display_name"),
                first_name = data.get("first_name"),
                last_name = data.get("last_name"),
                gender = data.get("gender"),
                birth_date = data.get("birth_date"),
                mobile_phone = data.get("mobile_phone"),
                about = data.get("about"),
                nationality = data.get("nationality"),
                email = data.get("email"),
                profile_img = data.get("profile_img"),
                profile_banner = data.get("profile_banner"),
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
        """Update user (admin only)"""
        
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

@user_ns.route('/<int:id>/profile-display')
class UserProfileDisplayResource(Resource):
    @jwt_required()
    @user_ns.marshal_with(user_model)
    @user_ns.expect(profile_display_model)
    def put(self, id):
        """Update user profile display information (user can update their own profile)"""
        # Get the current user's ID from the JWT token
        current_user_id = get_jwt_identity()
        
        # Convert both IDs to integers for comparison
        try:
            current_user_id_int = int(current_user_id)
            id_int = int(id)
        except (ValueError, TypeError):
            return {"message": "Invalid user ID format"}, 400
        
        print(f"JWT identity: {current_user_id} (type: {type(current_user_id)})")
        print(f"Route ID: {id} (type: {type(id)})")
        print(f"Comparing: {current_user_id_int} == {id_int}")
        
        # Check if the user is updating their own profile or is an admin
        user = User.query.get_or_404(id)
        if current_user_id_int != id_int and not user.is_admin():
            return {"message": f"You can only update your own profile. JWT ID: {current_user_id}, Route ID: {id}"}, 403
        
        data = request.get_json()
        print(f"Received data: {data}")
        
        allowed_fields = ['display_name', 'about', 'profile_img', 'profile_banner', 'nationality']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        print(f"Updating user with data: {update_data}")
        user.update(**update_data)
        
        return user

@user_ns.route('/<int:id>/sensitive-info')
class UserSensitiveInfoResource(Resource):
    @jwt_required()
    @user_ns.marshal_with(user_model)
    @user_ns.expect(sensitive_info_model)
    def put(self, id):
        """Update user sensitive information (user can update their own sensitive info)"""
        # Get the current user's ID from the JWT token.
        current_user_id = get_jwt_identity()
        
        # Convert both IDs to integers for comparison.
        try:
            current_user_id_int = int(current_user_id)
            id_int = int(id)
        except (ValueError, TypeError):
            return {"message": "Invalid user ID format"}, 400
            
        print(f"JWT identity: {current_user_id} (type: {type(current_user_id)})")
        print(f"Route ID: {id} (type: {type(id)})")
        print(f"Comparing: {current_user_id_int} == {id_int}")
        
        # Check if the user is updating their own profile or is an admin
        user = User.query.get_or_404(id)
        if current_user_id_int != id_int and not user.is_admin():
            return {"message": f"You can only update your own information. JWT ID: {current_user_id}, Route ID: {id}"}, 403
        
        data = request.get_json()
        print(f"Received data for sensitive info update: {data}")
        
        allowed_fields = ['username', 'email', 'mobile_phone', 'first_name', 'last_name', 'gender', 'birth_date']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        print(f"Updating user with sensitive data: {update_data}")
        user.update(**update_data)
        
        return user

@user_ns.route('/search')
class UserSearchResource(Resource):
    @jwt_required()
    @user_ns.marshal_list_with(user_model)
    def get(self):
        """Search for users by username or display name"""
        search_query = request.args.get('query', '')
        
        if not search_query or len(search_query) < 2:
            return []
            
        # Convert to lowercase for case-insensitive search
        search_query = f"%{search_query.lower()}%"
        
        # Search by username or display name
        users = User.query.filter(
            (User.username.ilike(search_query)) | 
            (User.display_name.ilike(search_query))
        ).limit(10).all()
        
        return users