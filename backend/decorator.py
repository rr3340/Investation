from functools import wraps
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import User

def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if user:
            if user.privilege:
                if user.privilege.admin:
                    return fn(*args, **kwargs)

        return {"message": "Admin access required"}, 403

    return wrapper