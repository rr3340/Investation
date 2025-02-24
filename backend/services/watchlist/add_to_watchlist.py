from datetime import datetime
from backend.models.watchlist import Watchlist
from backend.models.users import User

def add_to_watchlist(user_id, stock_key):
    user = User.query.get(user_id)
    if not user:
        raise Exception("User not found")

    watchlist_entry = Watchlist.query.filter_by(user_id=user_id, stock_key=stock_key).first()
    if watchlist_entry:
        return {"message": f"{stock_key} is already in your watchlist"}

    new_watchlist_entry = Watchlist(
        user_id=user_id,
        stock_key=stock_key,
        added_date=datetime.now()  #Add current date and time.
    )
    new_watchlist_entry.save()

    return {"message": f"{stock_key} added to watchlist"}