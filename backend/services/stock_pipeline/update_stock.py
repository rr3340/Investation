import pandas as pd

def update_stock(existing_df, new_df):
    new_df = new_df.dropna(subset=["datetime"])

    new_df_filtered = new_df[~new_df["datetime"].isin(existing_df["datetime"])]
    
    df_final = pd.concat([existing_df, new_df_filtered], ignore_index=True)
    df_final.sort_values(by="datetime", inplace=True)
    return df_final