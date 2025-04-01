import re
from datetime import datetime

def validate_signup_data(data):
    """Validate signup form data"""
    errors = {}
    
    # Required fields.
    required_fields = ['username', 'first_name', 'last_name', 'gender', 
                      'birth_date', 'email', 'password']
    
    for field in required_fields:
        if field not in data or not data[field]:
            errors[field] = f"{field.replace('_', ' ').title()} is required"
    
    # If there are missing required fields, return early.
    if errors:
        return errors
    
    # Username validation.
    if len(data['username']) < 3:
        errors['username'] = "Username must be at least 3 characters"
    elif not re.match(r'^[a-zA-Z0-9_]+$', data['username']):
        errors['username'] = "Username can only contain letters, numbers and underscores"
    
    # Email validation
    if not re.match(r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$', data['email']):
        errors['email'] = "Invalid email format"
    
    # Password validation
    if len(data['password']) < 8:
        errors['password'] = "Password must be at least 8 characters"
    elif not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=[\]{};\':"\\|,.<>/?]{8,}$', data['password']):
        errors['password'] = "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    
    # Gender validation
    if data['gender'] not in ['MALE', 'FEMALE', 'OTHER']:
        errors['gender'] = "Gender must be MALE, FEMALE, or OTHER"
    
    # Birth date validation is handled in the route itself.
    
    return errors

def validate_login_data(data):
    """Validate login form data"""
    errors = {}
    
    #Either username or email is required.
    if not (data.get('username') or data.get('email')):
        errors['auth'] = "Username or email is required"
    
    #Password is required.
    if not data.get('password'):
        errors['password'] = "Password is required"
    
    return errors 