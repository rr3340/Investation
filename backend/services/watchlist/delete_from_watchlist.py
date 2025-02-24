from backend.models.watchlist import Watchlist
from backend.models.users import User

def delete_from_watchlist(user_id, stock_key):
    user = User.query.get(user_id)
    if not user:
        raise Exception("User not found")

    watchlist_entry = Watchlist.query.filter_by(user_id=user_id, stock_key=stock_key).first()
    if not watchlist_entry:
        return {"message": f"{stock_key} is not in your watchlist"}

    watchlist_entry.delete()
    return {"message": f"{stock_key} removed from watchlist"}
