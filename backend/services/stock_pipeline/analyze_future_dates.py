from backend.models.historicstock import HistoricStock
from backend.exts import db
from datetime import datetime, timedelta
import pytz
import logging
import pandas as pd

#Configure logging
logger = logging.getLogger('stock_analysis')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def analyze_future_dates():
    """Analyze why future dates are being created in the database."""
    logger.info("Starting analysis of future dates in the database")
    now = datetime.now(pytz.UTC)
    
    # Find records with future dates.
    future_records = HistoricStock.query.filter(HistoricStock.datetime > now).all()
    logger.info(f"Found {len(future_records)} records with future dates")
    
    if not future_records:
        return {
            "status": "success",
            "message": "No future dates found in the database",
            "count": 0
        }
    
    # Convert into a DataFrame for easier analysis.
    records_data = []
    for record in future_records:
        records_data.append({
            "record_id": record.record_id,
            "stock_key": record.stock_key,
            "datetime": record.datetime,
            "open": record.open,
            "high": record.high,
            "low": record.low,
            "close": record.close,
            "volume": record.volume,
            "time_difference": (record.datetime - now).total_seconds() / 3600,  # hours in the future
            "null_values": sum(1 for v in [record.open, record.high, record.low, record.close, record.volume] if v is None),
            "has_price_data": not (record.open is None and record.high is None and record.low is None and record.close is None)
        })
    
    df = pd.DataFrame(records_data)
    
    # Analyze the patterns in future dates.
    results = {
        "status": "success",
        "total_future_records": len(df),
        "future_records_by_stock": df.groupby("stock_key").size().to_dict(),
        "null_value_statistics": {
            "records_with_all_nulls": int(df[df["null_values"] == 5].shape[0]),
            "records_with_some_nulls": int(df[(df["null_values"] > 0) & (df["null_values"] < 5)].shape[0]),
            "records_with_no_nulls": int(df[df["null_values"] == 0].shape[0])
        },
        "time_difference_statistics": {
            "min_hours_in_future": float(df["time_difference"].min()),
            "max_hours_in_future": float(df["time_difference"].max()),
            "mean_hours_in_future": float(df["time_difference"].mean()),
            "median_hours_in_future": float(df["time_difference"].median())
        }
    }
    
    # Check for the standard time intervals that might indicate scheduled data.
    interval_counts = {}
    for stock_key, stock_df in df.groupby("stock_key"):
        if len(stock_df) < 2:
            continue
            
        stock_df = stock_df.sort_values("datetime")
        time_diffs = []
        for i in range(1, len(stock_df)):
            delta = (stock_df.iloc[i]["datetime"] - stock_df.iloc[i-1]["datetime"]).total_seconds() / 60
            time_diffs.append(delta)
        
        if time_diffs:
            #Find the most common interval (rounded to nearest 5 minutes)
            rounded_diffs = [round(diff / 5) * 5 for diff in time_diffs]
            from collections import Counter
            common_intervals = Counter(rounded_diffs).most_common(2)
            interval_counts[stock_key] = common_intervals
    
    results["interval_analysis"] = interval_counts
    
    # Analyze patterns by time of day.
    df["hour_of_day"] = df["datetime"].apply(lambda x: x.hour)
    hour_distribution = df.groupby("hour_of_day").size().to_dict()
    results["hour_distribution"] = hour_distribution
    
    # Look for clustered future dates, being the same timestamp for multiple stocks
    timestamp_counts = df.groupby(df["datetime"].apply(lambda x: x.strftime("%Y-%m-%d %H:%M"))).size()
    common_timestamps = timestamp_counts[timestamp_counts > 1].to_dict()
    results["common_timestamps"] = common_timestamps
    
    #Calculate dates falling on standard market intervals.
    market_open_hour = 9  #9 AM Eastern
    market_close_hour = 16  #4 PM Eastern
    market_hours = df[(df["hour_of_day"] >= market_open_hour) & (df["hour_of_day"] <= market_close_hour)]
    off_hours = df[(df["hour_of_day"] < market_open_hour) | (df["hour_of_day"] > market_close_hour)]
    
    results["market_hours_analysis"] = {
        "during_market_hours": len(market_hours),
        "outside_market_hours": len(off_hours),
        "percentage_during_market": round(len(market_hours) / len(df) * 100, 2) if len(df) > 0 else 0
    }
    
    # Look for dates that are exactly 1 day in the future, which might indicate a batch process preparing for the next trading day
    next_day_records = df[df["time_difference"].between(24, 36)]
    results["next_day_records"] = {
        "count": len(next_day_records),
        "stocks": list(next_day_records["stock_key"].unique())
    }
    
    # Provide an assessment of likely causes.
    causes = []
    
    if results["null_value_statistics"]["records_with_all_nulls"] > 0:
        causes.append("Pre-allocated placeholder rows for future trading periods")
    
    if results["market_hours_analysis"]["percentage_during_market"] > 70:
        causes.append("Data includes placeholder entries for expected future trading hours")
    
    if results["next_day_records"]["count"] > 0:
        causes.append("Batch process allocating timestamps for the next trading day")
    
    if interval_counts and any(interval[0][0] == 5 for stock, interval in interval_counts.items()):
        causes.append("5-minute interval data with forecasted future periods")
    
    results["likely_causes"] = causes
    
    # Recommendation based on analysis.
    if causes:
        recommendations = [
            "Use explicit end date in Yahoo Finance API calls to prevent future data",
            "Add strict validation to filter out any timestamps beyond current time",
            "Add logging to identify which pipeline step is introducing future dates"
        ]
        
        if "5-minute interval data" in str(causes):
            recommendations.append("Consider using a longer interval (e.g., 15m instead of 5m) if you don't need the highest frequency")
            
        results["recommendations"] = recommendations
    
    logger.info(f"Analysis complete: Found {len(df)} future records with {len(causes)} likely causes")
    return results

def get_future_dates_by_stock(stock_key):
    """Get detailed information about future dates for a specific stock"""
    logger.info(f"Analyzing future dates for stock: {stock_key}")
    now = datetime.now(pytz.UTC)
    
    #Find future records for this stock.
    future_records = HistoricStock.query.filter(
        HistoricStock.stock_key == stock_key,
        HistoricStock.datetime > now
    ).all()
    
    if not future_records:
        return {
            "status": "success",
            "message": f"No future dates found for {stock_key}",
            "count": 0
        }
    
    # Convert to a DataFrame.
    records_data = []
    for record in future_records:
        records_data.append({
            "record_id": record.record_id,
            "datetime": record.datetime.isoformat(),
            "open": record.open,
            "high": record.high,
            "low": record.low,
            "close": record.close,
            "volume": record.volume,
            "hours_in_future": round((record.datetime - now).total_seconds() / 3600, 2),
            "has_nulls": any(v is None for v in [record.open, record.high, record.low, record.close, record.volume])
        })
    
    # Sort by datetime.
    records_data.sort(key=lambda x: x["datetime"])
    
    # Compute the intervals
    intervals = []
    for i in range(1, len(records_data)):
        dt1 = datetime.fromisoformat(records_data[i-1]["datetime"])
        dt2 = datetime.fromisoformat(records_data[i]["datetime"])
        interval_minutes = round((dt2 - dt1).total_seconds() / 60, 1)
        intervals.append(interval_minutes)
    
    common_interval = None
    if intervals:
        from collections import Counter
        interval_counts = Counter(intervals)
        most_common = interval_counts.most_common(1)
        if most_common:
            common_interval = most_common[0][0]
    
    result = {
        "status": "success",
        "stock": stock_key,
        "future_records_count": len(records_data),
        "data": records_data,
        "min_hours_in_future": min(r["hours_in_future"] for r in records_data),
        "max_hours_in_future": max(r["hours_in_future"] for r in records_data),
        "records_with_nulls": sum(1 for r in records_data if r["has_nulls"]),
        "common_interval_minutes": common_interval
    }
    
    # Add recommendations.
    if common_interval and common_interval in [5, 15, 30, 60]:
        result["recommendation"] = (
            f"Data appears to follow a {common_interval}-minute interval pattern. "
            "Consider using a custom end date or more restrictive period in API calls."
        )
    
    logger.info(f"Analysis complete for {stock_key}: Found {len(records_data)} future records")
    return result