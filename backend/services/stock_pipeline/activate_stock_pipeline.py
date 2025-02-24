from .load_stock import load_data
from .stock_refresh import stock_refresh
from .update_stock import update_stock
from .save_stock import save_to_database

def live_pipeline(key):

    existing_df = load_data(key)

    new_df = stock_refresh(key)

    updated_df = update_stock(existing_df, new_df)

    save_to_database(updated_df, key)