import yfinance as yf
import pandas as pd

def stock_refresh(symbol, interval="5m", period="1d"):
    new_df = yf.download(tickers=symbol, interval=interval, period=period)
    if new_df.empty:
        raise ValueError(f"No data returned for symbol {symbol} with interval {interval}.")

    new_df.index = new_df.index.tz_localize(None)
    new_df.reset_index(inplace=True)
    
    if isinstance(new_df.columns, pd.MultiIndex):
        new_df.columns = ['_'.join(col).strip() for col in new_df.columns.values]

    new_df.rename(columns={
        "Datetime_": "datetime",
        f"Open_{symbol}": "open",
        f"High_{symbol}": "high",
        f"Low_{symbol}": "low",
        f"Close_{symbol}": "close",
        f"Volume_{symbol}": "volume"
    }, inplace=True)

    new_df.dropna(subset=["datetime"], inplace=True)

    return new_df