import pandas as pd
import pytz
from datetime import datetime

def update_stock(existing_df, new_df):
    """Updates stock data by combining existing data with new data, ensuring no duplicate timestamps and proper timezone handling."""
    #Ensures new_df has data and clean it
    new_df = new_df.dropna(subset=["datetime"])
    
    # Checks if existing_df is empty if its the first time processing said stock.
    if existing_df.empty:
        #Returns new data if new stock with no records.
        new_df.sort_values(by="datetime", inplace=True)
        return new_df
    
    #Ensure all datetime objects have timezone information.
    #Make copies to avoid modifying the original DataFrames.
    existing_df_copy = existing_df.copy()
    new_df_copy = new_df.copy()
    
    # Process existing_df datetimes to ensure they're timezone aware.
    existing_df_copy['datetime'] = existing_df_copy['datetime'].apply(
        lambda dt: pytz.UTC.localize(dt) if dt.tzinfo is None else dt
    )
    
    # Process new_df datetimes to ensure they're timezone aware
    new_df_copy['datetime'] = new_df_copy['datetime'].apply(
        lambda dt: pytz.UTC.localize(dt) if dt.tzinfo is None else dt
    )
    
    # Convert all datetimes to UTC for consistent comparison.
    existing_df_copy['datetime'] = existing_df_copy['datetime'].apply(
        lambda dt: dt.astimezone(pytz.UTC)
    )
    
    new_df_copy['datetime'] = new_df_copy['datetime'].apply(
        lambda dt: dt.astimezone(pytz.UTC)
    )
    
    # Create a set of existing datetimes for efficient lookup.
    existing_datetimes = set(existing_df_copy['datetime'])
    
    # Filter out records that already exist.
    new_df_filtered = new_df_copy[~new_df_copy['datetime'].isin(existing_datetimes)]
    
    # Combine existing and new filtered data.
    df_final = pd.concat([existing_df_copy, new_df_filtered], ignore_index=True)
    df_final.sort_values(by="datetime", inplace=True)
    
    return df_final