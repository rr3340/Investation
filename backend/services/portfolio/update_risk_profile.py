from backend.models.users import User
from backend.exts import db

"""UPDATE RISK PROFILE"""

def update_risk_profile(user_id, risk_level):
    user = User.query.get(user_id)
    if not user:
        raise Exception("User not found")

    user.risk_profile = risk_level
    user.save()
    
    return {"user_id": user_id, "risk_profile_updated_to": risk_level}