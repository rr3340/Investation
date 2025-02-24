import pandas as pd
import os
from datetime import datetime
from backend.services.cloud_storage.upload_from_db import load_variables_from_s3

PROCESSED_STORAGE = os.getenv("PROCESSED_STORAGE")

def get_processed_data(stock_key):
    variables = {
        'processed_stock': (PROCESSED_STORAGE, f"processed_{stock_key}_stock.csv")
    }

    try:
        variables = load_variables_from_s3(variables)
    except RuntimeError as e:
        return {"error": f"Missing processed data: {e}"}

    processed_df = variables.get('processed_stock')
    
    processed_df['datetime'] = pd.to_datetime(processed_df['datetime'])
    processed_df['datetime'] = processed_df['datetime'].apply(lambda x: x.isoformat())
    return processed_df