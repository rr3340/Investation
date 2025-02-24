import os
import pandas as pd
from backend.models.stock import Stock
from backend.services.cloud_storage.upload_from_db import load_data, save_variables_to_s3
from backend.services.historic_stock.get_processed_stock import process_from_database

PROCESSED_STORAGE = os.getenv("PROCESSED_STORAGE")

def process_database():
    stocks = Stock.query.all()
    for stock in stocks:
        stock_key = stock.stock_key
        df = load_data(stock_key)
        processed_df = process_from_database(df)
        print(processed_df)

        if processed_df is not None:
            variables = {
                'processed_stock': (processed_df, PROCESSED_STORAGE, f"processed_{stock_key}_stock.csv")
                }
            save_variables_to_s3(variables)

    return "Database processed successfully."