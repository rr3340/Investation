import pandas as pd
import pytz

def process_from_database(df):
    normal_window = 9  #Fast
    slow_d = 3  #Slow
    necessary_columns = ['close', 'high', 'low', 'volume']  #Needed columns

    if not all(col in df.columns for col in necessary_columns):
        print(f"Error: Missing one or more required columns: {necessary_columns}")
        return None

    # Ensure index is datetime with UTC timezone
    df.index = pd.to_datetime(df.index, errors='coerce')
    # Explicitly preserve timezone information by localizing to UTC if naive
    df.index = df.index.map(lambda x: x.tz_localize(pytz.UTC) if x.tzinfo is None else x.astimezone(pytz.UTC))
    
    # Extract date components while preserving the timezone-aware index
    df['date'] = df.index.day  # Per day split so the first 5 will be of NA

    #Nma + Ema calculations
    def ma_calculations(df, window_size=5):
        # No need to convert index again, as we already did it above
        def calculate_nma_roll(set):
            set['Normal Moving Average'] = set['close'].rolling(window=window_size).mean() #calculate rolling set per window size
            return set

        def calculate_ema_roll(set):
            set['Exponential Moving Average'] = set['close'].ewm(span=10, adjust=False).mean()
            return set #Calculates all past the last 10 index, with the rest being dropped

        df = df.groupby('date', group_keys=False).apply(calculate_nma_roll)
        df = df.groupby('date', group_keys=False).apply(calculate_ema_roll)#Run function through per day organization
        df = df.drop(columns='date')
        return df

    df = ma_calculations(df)

    #Rsi calc
    def calculate_rsi(df):
        df['close'] = df['close'].fillna(0)
        delta = df['close'].diff()
        average_gain = (delta.where(delta > 0, 0)).rolling(window=normal_window).mean()
        average_loss = (-delta.where(delta < 0, 0)).rolling(window=normal_window).mean()
        rs = average_gain / average_loss
        df['Relative Strength Index'] = 100 - (100 / (1 + rs))
        return df

    df = calculate_rsi(df)

    #Target shift for rfm
    df["Shift For Target"] = df['close'].shift(-1)
    df["Target"] = (df["Shift For Target"] > df['close']).astype(int)

    #Max + min rolling windows
    df['High_N'] = df['high'].rolling(window=normal_window).max()
    df['Low_N'] = df['low'].rolling(window=normal_window).min()

    #Stochastic oscillator
    df['%K Fast'] = (df['close'] - df['Low_N']) * 100 / (df['High_N'] - df['Low_N'])
    df['%D Slow'] = df['%K Fast'].rolling(window=slow_d).mean()

    #Williams %R
    df['Williams R%'] = -100 * ((df['High_N'] - df['close']) / (df['High_N'] - df['Low_N']))

    #MACD
    df['MACD'] = df['Exponential Moving Average'] - df['Normal Moving Average']

    #Price rate of change
    df["shift_one_forward"] = df['close'].shift(1)
    df["Price Rate of Change"] = ((df['close'] - df["shift_one_forward"]) / df["shift_one_forward"]) * 100

    #On balance volume
    df["Variation"] = df["close"].diff()
    df["On Balance Volume"] = 0
    for i in range(1, len(df)):
        daily_change = df["Variation"].iloc[i]#Subtract or add the day's volumne dependent on if closing price increased or decreased
        volume = df["volume"].iloc[i] if daily_change > 0 else -df["volume"].iloc[i] if daily_change < 0 else 0
        df["On Balance Volume"].iloc[i] = df["On Balance Volume"].iloc[i - 1] + volume

    #Standard deviation and bollinger bands, upper and lower
    df['Moving Standard Deviation'] = df['close'].rolling(window=5).std()
    df['Upper Band'] = df['Normal Moving Average'] + 2 * df['Moving Standard Deviation']
    df['Lower Band'] = df['Normal Moving Average'] - 2 * df['Moving Standard Deviation']

    #% change, moving average, volatility calculations, momentum etc.
    df['Percentange_Change'] = (df['close'] - df['close'].shift(1)) * 100 / df['close'].shift(1)
    df['Moving_Ave'] = df['close'].rolling(window=12).mean()
    df['Close_To_moving_AVG'] = df['close'] / df['Moving_Ave']
    df['Price_Range_Normalization'] = (df['close'] - df['Low_N']) / (df['High_N'] - df['Low_N'])
    df['volatility'] = df['close'].rolling(window=normal_window).std()
    df['momentum'] = df['close'] - df['close'].shift(normal_window)

    #Adx calculations
    def get_adx(high, low, close, window):
        plus_dm = high.diff().clip(lower=0)#positive VS negative directional movement
        minus_dm = low.diff().clip(upper=0).abs()
        atr = pd.concat([high - low, (high - close.shift(1)).abs(), (low - close.shift(1)).abs()], axis=1).max(axis=1) #Largest difference btwn high and low,and prev's closing price
        plus_di = 100 * (plus_dm.ewm(alpha=1 / window).mean() / atr)
        minus_di = 100 * (minus_dm.ewm(alpha=1 / window).mean() / atr).abs()
        dx = (abs(plus_di - minus_di) / (plus_di + minus_di)) * 100#calculate direction
        adx = dx.rolling(window).mean()#Calculate rolling avg of direction to solve
        return plus_di, minus_di, adx

    df['plus_di'], df['minus_di'], df['adx'] = get_adx(df['high'], df['low'], df['close'], normal_window) #get values from function and form columns

    #Clean + drop unnecessary columns
    df = df.drop(columns=['shift_one_forward', "High_N", "Low_N"])

    last_row = df.iloc[-1:].copy()
    last_row = last_row.fillna(0)
    df_without_last = df.iloc[:-1].dropna()
    df = pd.concat([df_without_last, last_row])
    
    print(df.columns)

    return df