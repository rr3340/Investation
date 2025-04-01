import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, Tooltip, YAxis, ReferenceLine, XAxis } from 'recharts';
import { stockApi } from '../../lib/api';
import { formatTime, formatDateTime, ensureUTCDate } from '../../lib/utils/dateUtils';
import { stockDataRefreshManager } from '../../services';

const MiniStockChart = ({ 
  stockKey, 
  width = '100%', 
  height = 70, 
  refreshTrigger
}) => {
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [priceInfo, setPriceInfo] = useState({ currentPrice: null, priceChange: null, changeDirection: null });

  // Memoize the formatter in order to get a better performance. This is defined early to avoid linter errors.
  const formatCurrency = useMemo(() => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    });
    
    return (value) => {
      if (value === undefined || value === null) return 'N/A';
      return formatter.format(value);
    };
  }, []);

  // Memoizes chart data preparation, this avoids recalculating on every render. The chart is sorted by ascending.
  // Data formatted for recharts, displaying the time and stocks for the day's candles.
  const chartData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) {
      return [];
    }

    const sortedData = [...historicalData].sort((a, b) => 
      a.date - b.date
    );
    
    const firstDay = sortedData.length > 0 ? sortedData[0].date.getDate() : null;
    
    return sortedData.map((item, index) => {
      const date = item.date || new Date(ensureUTCDate(item.datetime));
      const currentDay = date.getDate();
      
      let formattedTime;
      if (firstDay !== null && currentDay !== firstDay) {
        formattedTime = `${date.getMonth() + 1}/${date.getDate()}`;
      } else {
        formattedTime = formatTime(date, true);
      }
      
      // For the first and last points, ensure it always shows the time.
      const isFirstOrLast = index === 0 || index === sortedData.length - 1;
      
      return {
        name: formattedTime,
        price: item.close,
        open: item.open,
        high: item.high,
        low: item.low,
        volume: item.volume,
        datetime: item.datetime,
        fullDate: date,
        isFirstOrLast
      };
    });
  }, [historicalData]);

  const CustomTooltip = useMemo(() => {
    return ({ active, payload, label }) => {
      if (active && payload && payload.length > 0) {
        const dataPoint = payload[0].payload;
        
        return (
          <div className="recharts-custom-tooltip" style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '6px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            fontSize: '12px'
          }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>{formatCurrency(dataPoint.price)}</p>
            <p style={{ margin: 0, color: '#666' }}>
              {dataPoint.fullDate ? formatDateTime(dataPoint.fullDate) : label}
            </p>
          </div>
        );
      }
      return null;
    };
  }, [formatCurrency]);

  // Fetch the historical data when component mounts or when stockKey changes.
  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (!stockKey) return;
      
      setLoading(true);
      setError(null);
      
      try {
        console.log(`Fetching historical data for ${stockKey}`);
        
        const endDate = new Date();
        const startDate = new Date(endDate);
        startDate.setHours(endDate.getHours() - 1);
        
        //Fetch the historical data with a limit of 12 data points, 1 hr per 5 minute candles.
        const data = await stockApi.getHistoricalData(stockKey, {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          limit: 12
        });
        
        if (data && Array.isArray(data) && data.length > 0) {
          console.log(`Received ${data.length} data points for ${stockKey}`);
          
          const sortedData = [...data].sort((a, b) => new Date(ensureUTCDate(a.datetime)) - new Date(ensureUTCDate(b.datetime)));
          
          const limitedData = sortedData.length > 12 ? sortedData.slice(-12) : sortedData;
          
          const processedData = limitedData.map(item => ({
            ...item,
            date: new Date(ensureUTCDate(item.datetime))
          }));
          
          setHistoricalData(processedData);
          
          stockDataRefreshManager.recordManualUpdate('historical', stockKey);
          
          if (processedData.length >= 2) {
            const firstPrice = processedData[0].close;
            const lastPrice = processedData[processedData.length - 1].close;
            const priceDiff = lastPrice - firstPrice;
            
            setPriceInfo({
              currentPrice: lastPrice,
              priceChange: priceDiff,
              changeDirection: priceDiff >= 0 ? 'up' : 'down'
            });
          }
        } else {
          console.warn(`No historical data received for ${stockKey}`);
          const fallbackData = await stockApi.getHistoricalData(stockKey, {
            limit: 12
          });
          
          if (fallbackData && Array.isArray(fallbackData) && fallbackData.length > 0) {
            const sortedData = [...fallbackData].sort((a, b) => new Date(ensureUTCDate(a.datetime)) - new Date(ensureUTCDate(b.datetime)));
            const limitedData = sortedData.length > 12 ? sortedData.slice(-12) : sortedData;
            const processedData = limitedData.map(item => ({
              ...item,
              date: new Date(ensureUTCDate(item.datetime))
            }));
            
            setHistoricalData(processedData);
            
            stockDataRefreshManager.recordManualUpdate('historical', stockKey);
            
            if (processedData.length >= 2) {
              const firstPrice = processedData[0].close;
              const lastPrice = processedData[processedData.length - 1].close;
              const priceDiff = lastPrice - firstPrice;
              
              setPriceInfo({
                currentPrice: lastPrice,
                priceChange: priceDiff,
                changeDirection: priceDiff >= 0 ? 'up' : 'down'
              });
            }
          } else {
            setError('No historical data available');
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error(`Error fetching historical data for ${stockKey}:`, error);
        setError('Error loading chart data');
        setLoading(false);
      }
    };
    
    fetchHistoricalData();
  }, [stockKey, refreshTrigger]);
  
  // Set up the real-time updates for historical data.
  useEffect(() => {
    if (!stockKey) return;
    
    // Subscribe to the historical data updates.
    const unsubscribe = stockDataRefreshManager.subscribe(
      'historical',
      stockKey,
      (newHistoricalData) => {
        if (newHistoricalData && Array.isArray(newHistoricalData) && newHistoricalData.length > 0) {
          console.log(`Received real-time historical data update for ${stockKey}`);
          
          //Sort the data by datetime (oldest first)
          const sortedData = [...newHistoricalData].sort((a, b) => 
            new Date(ensureUTCDate(a.datetime)) - new Date(ensureUTCDate(b.datetime))
          );
          
          // Take only the 12 most recent data points.
          const limitedData = sortedData.length > 12 ? sortedData.slice(-12) : sortedData;
          
          // Process the data with date objects for consistent formatting.
          const processedData = limitedData.map(item => ({
            ...item,
            date: new Date(ensureUTCDate(item.datetime))
          }));
          
          setHistoricalData(processedData);
          
          // Calculate the price change.
          if (processedData.length >= 2) {
            const firstPrice = processedData[0].close;
            const lastPrice = processedData[processedData.length - 1].close;
            const priceDiff = lastPrice - firstPrice;
            
            setPriceInfo({
              currentPrice: lastPrice,
              priceChange: priceDiff,
              changeDirection: priceDiff >= 0 ? 'up' : 'down'
            });
          }
        }
      }
    );
    
    return () => {
      unsubscribe();
      console.log(`Cleaned up real-time historical data updates for ${stockKey}`);
    };
  }, [stockKey]);
  
  // Render the loading placeholder.
  if (loading) {
    return (
      <div className="mini-chart-placeholder loading" style={{ height }}>
        {/* Empty */}
      </div>
    );
  }
  
  if (!historicalData || historicalData.length === 0) {
    return (
      <div className="mini-chart-placeholder no-data" style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <small className="text-muted">No data available</small>
      </div>
    );
  }
  
  const priceChangeColor = priceInfo.changeDirection === 'up' 
    ? "#28a745"
    : priceInfo.changeDirection === 'down' 
      ? "#dc3545"
      : "#8884d8";
  
  // Return the chart using Recharts.
  return (
    <div className="mini-stock-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <YAxis domain={['auto', 'auto']} hide={true} />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 9, fill: '#666' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            ticks={chartData.filter(d => d.isFirstOrLast).map(d => d.name)}
            minTickGap={15}
            height={15}
          />
          <Tooltip content={CustomTooltip} />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke={priceChangeColor}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3 }}
            isAnimationActive={false}
            connectNulls={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MiniStockChart; 