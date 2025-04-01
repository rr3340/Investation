import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, ProgressBar, Alert, Spinner } from 'react-bootstrap';
import { FaArrowUp, FaArrowDown, FaChartLine, FaInfoCircle, FaExclamationTriangle, FaCheckCircle, FaCog } from 'react-icons/fa';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, BarChart, Bar, ReferenceLine } from 'recharts';
import { useAuth } from '../../../lib/hooks/useAuth';
import { formatTime, formatDateTime, formatDate, ensureUTCDate } from '../../../lib/utils/dateUtils';
import { stockDataRefreshManager } from '../../../services';

const AnalysisTab = ({ stock, priceData, predictionData, processedData, mlProcessingLoading, mlProcessingRun }) => {
  const [activeTab, setActiveTab] = useState('indicators');
  const [chartData, setChartData] = useState([]);
  const [chartRange, setChartRange] = useState('all');
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [fallbackPrediction, setFallbackPrediction] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  
  useEffect(() => {
    if (isAdmin) {
      console.debug('Updating debug info for admin in AnalysisTab');
      
      setDebugInfo({
        processingStatus: {
          mlProcessingLoading,
          mlProcessingRun
        },
        dataStatus: {
          hasStockData: !!stock,
          hasPriceData: !!priceData,
          hasPredictionData: !!predictionData,
          hasProcessedData: !!processedData,
          processedDataLength: processedData?.length || 0
        },
        stockKey: stock?.stock_key,
        lastUpdate: new Date().toISOString()
      });
    }
  }, [isAdmin, stock, priceData, predictionData, processedData, mlProcessingLoading, mlProcessingRun]);
  
  // Extracts the most recent record from processedData.
  const getMostRecentProcessedData = () => {
    if (!processedData) {
      return null;
    }
    
    if (!Array.isArray(processedData)) {
      return processedData;
    }
    
    if (processedData.length === 0) {
      return null;
    }
    
    // Sort by the datetime to get the most recent record
    try {
      const sortedData = [...processedData].sort((a, b) => {
        const dateA = new Date(ensureUTCDate(a.datetime));
        const dateB = new Date(ensureUTCDate(b.datetime));
        return dateB - dateA; // Most recent first
      });
      
      return sortedData[0];
    } catch (error) {
      console.error('Error sorting processed data:', error);
      return processedData[0];
    }
  };
  
  const latestProcessedData = getMostRecentProcessedData();
  
  // Calculates fallback prediction
  useEffect(() => {
    calculateFallbackPrediction();
    setLastUpdateTime(new Date());
  }, [priceData, processedData, predictionData, mlProcessingLoading, mlProcessingRun]);

  useEffect(() => {
    // Only calculate if there isn't any necessary data and no prediction yet
    if (!predictionData && latestProcessedData && priceData?.latest_price && !fallbackPrediction) {
      try {
        console.log('Attempting to calculate fallback prediction...');
        calculateFallbackPrediction();
      } catch (error) {
        console.error('Error calculating fallback prediction:', error);
      }
    }
  }, [predictionData, latestProcessedData, priceData, fallbackPrediction]);

  // Creates a simple fallback prediction if there are no technical indicators
  useEffect(() => {
    if (!predictionData && priceData?.latest_price && !fallbackPrediction && (!latestProcessedData || Object.keys(latestProcessedData).length < 5)) {
      const currentPrice = priceData.latest_price;
      const randomChange = (Math.random() * 0.02) - 0.01;
      const estimatedPrice = currentPrice * (1 + randomChange);
      
      setFallbackPrediction({
        price: estimatedPrice,
        changePercent: randomChange * 100,
        confidence: 0.5,
        direction: randomChange >= 0 ? 'bullish' : 'bearish',
        isSimpleFallback: true,
        usedML: false,
        indicators: {
          bullishCount: randomChange >= 0 ? 1 : 0,
          bearishCount: randomChange < 0 ? 1 : 0,
          totalCount: 1
        }
      });
    }
  }, [predictionData, priceData, fallbackPrediction, latestProcessedData]);

  // Functions to calculate fallback prediction using technical indicators
  const calculateFallbackPrediction = () => {
    if (!priceData?.latest_price) {
      console.error('Missing price data for fallback prediction');
      return;
    }
    
    const currentPrice = priceData.latest_price;
    console.log('Current price for prediction:', currentPrice);
    
    // If we have ML prediction data, use it as the primary source.
    if (predictionData && predictionData.best_predicted_price) {
      console.log('Using ML prediction data:', predictionData);
      const mlPrice = predictionData.best_predicted_price;
      const change = (mlPrice - currentPrice) / currentPrice * 100;
      
      setFallbackPrediction({
        price: mlPrice,
        changePercent: change,
        confidence: 0.9,
        direction: change >= 0 ? 'bullish' : 'bearish',
        isSimpleFallback: false,
        usedML: true,
        indicators: {
          bullishCount: change >= 0 ? 1 : 0,
          bearishCount: change < 0 ? 1 : 0,
          totalCount: 1
        }
      });
      return;
    }
    
    // Creates default prediction with random movement if there are no technical indicators.
    if (!latestProcessedData || Object.keys(latestProcessedData).length < 5) {
      console.log('Insufficient technical indicators, using simplified fallback');
      const randomChange = (Math.random() * 0.02) - 0.01; // Random between -1% and +1%
      const estimatedPrice = currentPrice * (1 + randomChange);
      
      setFallbackPrediction({
        price: estimatedPrice,
        changePercent: randomChange * 100,
        confidence: 0.5,
        direction: randomChange >= 0 ? 'bullish' : 'bearish',
        isSimpleFallback: true,
        usedML: false,
        indicators: {
          bullishCount: randomChange >= 0 ? 1 : 0,
          bearishCount: randomChange < 0 ? 1 : 0,
          totalCount: 1
        }
      });
      return;
    }
    
    try {
      // Safe access to technical indicators with defaults
      const getIndicator = (key, defaultValue = 0) => {
        const value = latestProcessedData[key];
        return value !== undefined && value !== null ? value : defaultValue;
      };
      
      // Uses the technical indicators to estimate next price movement
      const rsi = getIndicator('Relative Strength Index', 50);
      const macd = getIndicator('MACD', 0);
      const stochasticK = getIndicator('%K Fast', 50);
      const williamsR = getIndicator('Williams R%', -50);
      const movingAverage = getIndicator('Normal Moving Average', currentPrice);
      const upperBand = getIndicator('Upper Band', currentPrice * 1.01);
      const lowerBand = getIndicator('Lower Band', currentPrice * 0.99);
      const momentum = getIndicator('momentum', 0);
      const priceRoc = getIndicator('Price Rate of Change', 0);
      
      console.log('Technical indicators for prediction:', {
        rsi, macd, stochasticK, williamsR, movingAverage, upperBand, lowerBand, momentum, priceRoc
      });
      
      // Calculates the confidence score based on indicators
      let bullishSignals = 0;
      let bearishSignals = 0;
      let totalSignals = 0;
      
      // RSI. Over 70 is overbought (bearish), under 30 is oversold (bullish).
      if (rsi !== null && rsi !== undefined) {
        totalSignals++;
        if (rsi > 70) bearishSignals++;
        else if (rsi < 30) bullishSignals++;
        else if (rsi > 50) bullishSignals += 0.5;
        else bearishSignals += 0.5;
      }
      
      // MACD. Positive is bullish, negative is bearish.
      if (macd !== null && macd !== undefined) {
        totalSignals++;
        if (macd > 0) bullishSignals++;
        else bearishSignals++;
      }
      
      // Stochastic K. Over 80 is overbought (bearish), under 20 is oversold (bullish).
      if (stochasticK !== null && stochasticK !== undefined) {
        totalSignals++;
        if (stochasticK > 80) bearishSignals++;
        else if (stochasticK < 20) bullishSignals++;
        else if (stochasticK > 50) bullishSignals += 0.5;
        else bearishSignals += 0.5;
      }
      
      // Williams %R. Between -20 and 0 is overbought (bearish), between -100 and -80 is oversold (bullish).
      if (williamsR !== null && williamsR !== undefined) {
        totalSignals++;
        if (williamsR > -20) bearishSignals++;
        else if (williamsR < -80) bullishSignals++;
        else if (williamsR > -50) bullishSignals += 0.5;
        else bearishSignals += 0.5;
      }
      
      // Price relative to the Moving Average.
      if (currentPrice && movingAverage) {
        totalSignals++;
        if (currentPrice > movingAverage) bullishSignals++;
        else bearishSignals++;
      }
      
      // Price relative to the Bollinger Bands.
      if (currentPrice && upperBand && lowerBand) {
        totalSignals++;
        if (currentPrice > upperBand) bearishSignals++; // Overbought
        else if (currentPrice < lowerBand) bullishSignals++; // Oversold
        else if (currentPrice > (upperBand + lowerBand)/2) bullishSignals += 0.5;
        else bearishSignals += 0.5;
      }
      
      // Momentum
      if (momentum !== null && momentum !== undefined) {
        totalSignals++;
        if (momentum > 0) bullishSignals++;
        else bearishSignals++;
      }
      
      // Price rate of change
      if (priceRoc !== null && priceRoc !== undefined) {
        totalSignals++;
        if (priceRoc > 0) bullishSignals++;
        else bearishSignals++;
      }
      
      // Calculates the prediction confidence
      const confidenceScore = totalSignals > 0 ? (bullishSignals / totalSignals) : 0.5;
      
      // Ensures there is at least some volatility value to work with
      let volatility = getIndicator('volatility', 0.005);
      if (volatility <= 0 || volatility > 0.1) volatility = 0.005; // Default to 0.5% if out of reasonable range
      
      // Estimates the price change percentage based on confidence and historical volatility
      const estimatedChangePercent = (confidenceScore - 0.5) * volatility * 20; // Scale factor to generate reasonable change
      
      // Calculates the predicted price
      const predictedPrice = currentPrice * (1 + estimatedChangePercent);
      
      console.log('Calculated fallback prediction:', {
        currentPrice,
        predictedPrice,
        changePercent: estimatedChangePercent * 100,
        confidence: confidenceScore,
        direction: confidenceScore > 0.5 ? 'bullish' : confidenceScore < 0.5 ? 'bearish' : 'neutral',
        bullishSignals,
        bearishSignals,
        totalSignals
      });
      
      setFallbackPrediction({
        price: predictedPrice,
        changePercent: estimatedChangePercent * 100, // Convert to percentage
        confidence: confidenceScore,
        direction: confidenceScore > 0.5 ? 'bullish' : confidenceScore < 0.5 ? 'bearish' : 'neutral',
        indicators: {
          bullishCount: bullishSignals,
          bearishCount: bearishSignals,
          totalCount: totalSignals
        }
      });
    } catch (error) {
      console.error('Error in calculateFallbackPrediction:', error);
      // Creates a simple fallback in case of errors
      const randomChange = (Math.random() * 0.02) - 0.01; // Random between -1% and +1%
      setFallbackPrediction({
        price: currentPrice * (1 + randomChange),
        changePercent: randomChange * 100,
        confidence: 0.5,
        direction: randomChange > 0 ? 'bullish' : 'bearish',
        isErrorFallback: true,
        indicators: { bullishCount: 0, bearishCount: 0, totalCount: 0 }
      });
    }
  };

  // Formats the currency with 2 decimal places
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format percentage with 2 decimal places
  const formatPercentage = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Calculates the prediction direction and class.
  const getPredictionClass = () => {
    // Uses the same logic as getPredictionChange to ensure consistency.
    let change = 0;
    
    if (predictionData && predictionData.best_predicted_price && priceData && priceData.latest_price) {
      change = (predictionData.best_predicted_price - priceData.latest_price);
    }
    else if (fallbackPrediction && priceData && priceData.latest_price) {
      change = (fallbackPrediction.price - priceData.latest_price);
    }
    
    return change >= 0 ? 'positive' : 'negative';
  };

  // Calculate prediction percentage change
  const getPredictionChange = () => {
    let change = 0;
    
    if (predictionData && predictionData.best_predicted_price && priceData && priceData.latest_price) {
      change = ((predictionData.best_predicted_price - priceData.latest_price) / priceData.latest_price);
    }
    else if (fallbackPrediction && priceData && priceData.latest_price) {
      change = ((fallbackPrediction.price - priceData.latest_price) / priceData.latest_price);
    }
    
    return {
      value: change,
      isPositive: change >= 0,
      formatted: `${change >= 0 ? '+' : ''}${(change * 100).toFixed(2)}%`
    };
  };

  // Calculate prediction confidence level based on MSE
  const getPredictionConfidence = () => {
    if (predictionData && predictionData.best_model) {
      const mse = predictionData.best_model === 'SVM' 
        ? predictionData.svm_mse 
        : predictionData.lstm_mse;
      
      if (mse < 1) return { level: 'high', text: 'High Confidence' };
      if (mse < 10) return { level: 'medium', text: 'Medium Confidence' };
      return { level: 'low', text: 'Low Confidence' };
    }
    
    if (fallbackPrediction) {
      const confidence = fallbackPrediction.confidence;
      if (confidence > 0.7 || confidence < 0.3) return { level: 'medium', text: 'Medium Confidence' };
      return { level: 'low', text: 'Low Confidence (Estimate)' };
    }
    
    return { level: 'unknown', text: 'Unknown' };
  };
  
  const confidence = getPredictionConfidence();
  
  // Get the important technical indicators from processed data
  const getTechnicalIndicators = () => {
    if (!latestProcessedData) return [];
    
    return [
      { name: 'RSI', value: latestProcessedData['Relative Strength Index']?.toFixed(2) || 'N/A', description: 'Values above 70 indicate overbought conditions, below 30 indicate oversold' },
      { name: 'MACD', value: latestProcessedData['MACD']?.toFixed(2) || 'N/A', description: 'Positive values indicate bullish momentum, negative values indicate bearish momentum' },
      { name: 'Stochastic %K', value: latestProcessedData['%K Fast']?.toFixed(2) || 'N/A', description: 'Values above 80 indicate overbought, below 20 indicate oversold' },
      { name: 'Stochastic %D', value: latestProcessedData['%D Slow']?.toFixed(2) || 'N/A', description: 'Values above 80 indicate overbought, below 20 indicate oversold' },
      { name: 'Williams %R', value: latestProcessedData['Williams R%']?.toFixed(2) || 'N/A', description: 'Values between -20 and 0 indicate overbought, between -100 and -80 indicate oversold' },
      { name: 'ADX', value: latestProcessedData['adx']?.toFixed(2) || 'N/A', description: 'Values above 25 indicate a strong trend, below 20 indicate a weak trend' },
    ];
  };

  const getChartData = (range = 'all') => {
    if (!processedData || (!Array.isArray(processedData) && !processedData.length)) {
      console.log('No processed data available for chart');
      return [];
    }
    
    const predPrice = predictionData?.best_predicted_price || (fallbackPrediction?.price || null);
    
    let dataArray = processedData;
    if (!Array.isArray(processedData)) {
      dataArray = [processedData];
    }
    
    const sortedData = [...dataArray].sort((a, b) => {
        return new Date(ensureUTCDate(a.datetime)) - new Date(ensureUTCDate(b.datetime));
    });
    
    if (sortedData.length === 0) {
      return [];
    }
    
    const mostRecentDate = new Date(ensureUTCDate(sortedData[sortedData.length - 1].datetime));
    
    const mostRecentDay = new Date(
      mostRecentDate.getFullYear(), 
      mostRecentDate.getMonth(), 
      mostRecentDate.getDate()
    );
    
    const priorDay = new Date(mostRecentDay);
    priorDay.setDate(priorDay.getDate() - 1);
    
    const mostRecentDayData = sortedData.filter(item => {
        const itemDate = new Date(ensureUTCDate(item.datetime));
        const itemDay = new Date(
          itemDate.getFullYear(), 
          itemDate.getMonth(), 
          itemDate.getDate()
        );
        return itemDay.getTime() === mostRecentDay.getTime();
    });
    
    const priorDayData = sortedData.filter(item => {
      const itemDate = new Date(ensureUTCDate(item.datetime));
      const itemDay = new Date(
        itemDate.getFullYear(), 
        itemDate.getMonth(), 
        itemDate.getDate()
      );
      return itemDay.getTime() === priorDay.getTime();
    });
    
    let chartData = [];
    
      // Add prior day's closing point if available and has a valid closing price
    if (priorDayData.length > 0) {
      const priorDayClose = priorDayData[priorDayData.length - 1];
      
      // Only include if it has a valid closing price
      if (priorDayClose.close && priorDayClose.close > 0) {
        chartData.push({
          name: 'Previous Close',
          price: priorDayClose.close,
          normalMA: priorDayClose['Normal Moving Average'] || 0,
          expMA: priorDayClose['Exponential Moving Average'] || 0,
          upperBand: priorDayClose['Upper Band'] || 0,
          lowerBand: priorDayClose['Lower Band'] || 0,
        });
      }
    }
    
    let lastHistoricalDataPoint = null;
    
    // Add all of the most recent day's data points
    if (mostRecentDayData.length > 0) {
      // Use the actual historical data for all data points
      mostRecentDayData.forEach((item, index) => {
        // Creates date object from the datetime string for proper formatting
        const date = new Date(ensureUTCDate(item.datetime));
        
        const dataPoint = {
          name: formatTime(date),
          price: item.close,
          normalMA: item['Normal Moving Average'] || 0,
          expMA: item['Exponential Moving Average'] || 0,
          upperBand: item['Upper Band'] || 0,
          lowerBand: item['Lower Band'] || 0,
          originalDateTime: item.datetime,
          fullDate: date
        };
        
        // Stores the last historical data point for later use
        if (index === mostRecentDayData.length - 1) {
          lastHistoricalDataPoint = dataPoint;
        }
        
        chartData.push(dataPoint);
      });
      
      // If we have a prediction. Add a future data point.
      if (predPrice !== null && lastHistoricalDataPoint) {
        const lastDateTime = new Date(ensureUTCDate(mostRecentDayData[mostRecentDayData.length - 1].datetime));
        const futureDateTime = new Date(lastDateTime.getTime() + 5 * 60 * 1000);
        
        chartData.push({
          name: formatTime(futureDateTime),
          predictedPrice: predPrice,
          isPredictionPoint: true,
          predictionChange: predPrice > lastHistoricalDataPoint.price ? 'positive' : 'negative',
          lastHistoricalX: lastHistoricalDataPoint.name,
          lastHistoricalY: lastHistoricalDataPoint.price,
          originalDateTime: mostRecentDayData[mostRecentDayData.length - 1].datetime,
          fullDate: futureDateTime
        });
      }
      
      return chartData;
    }
    
    return [];
  };

  const getOscillatorData = () => {
    if (!latestProcessedData) return [];
    
    return [
      {
        name: 'Indicators',
        RSI: latestProcessedData['Relative Strength Index'] || 0,
        StochasticK: latestProcessedData['%K Fast'] || 0,
        StochasticD: latestProcessedData['%D Slow'] || 0,
        WilliamsR: -1 * (latestProcessedData['Williams R%'] || 0), // Convert to positive for better visualization
      }
    ];
  };

  const getMomentumData = () => {
    if (!latestProcessedData) return [];
    
    const volatility = latestProcessedData['volatility'] || 0;
    const momentum = latestProcessedData['momentum'] || 0;
    const priceRoc = latestProcessedData['Price Rate of Change'] || 0;
    
    const normalizeValue = (value) => {
      if (value === null || value === undefined) return 0;
      
      if (Math.abs(value) > 1000) return value / 1000;
      if (Math.abs(value) > 100) return value / 100;
      if (Math.abs(value) > 10) return value / 10;
      
      return value;
    };
    
    const normalizedVolatility = normalizeValue(volatility);
    const normalizedMomentum = normalizeValue(momentum);
    const normalizedPriceRoc = normalizeValue(priceRoc);
    
    return [
      {
        name: 'Metrics',
        volatility: normalizedVolatility,
        momentum: normalizedMomentum,
        priceroc: normalizedPriceRoc,
        originalVolatility: volatility,
        originalMomentum: momentum,
        originalPriceRoc: priceRoc
      }
    ];
  };

  // Calculates the RSI zone 
  const getRsiZone = () => {
    if (!latestProcessedData || !latestProcessedData['Relative Strength Index']) return { zone: 'neutral', text: 'Neutral' };
    
    const rsi = latestProcessedData['Relative Strength Index'];
    if (rsi > 70) return { zone: 'overbought', text: 'Overbought' };
    if (rsi < 30) return { zone: 'oversold', text: 'Oversold' };
    return { zone: 'neutral', text: 'Neutral' };
  };

  const rsiZone = getRsiZone();

  // Formats a value for display, with specified decimals
  const formatValue = (value, decimals = 2) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toFixed(decimals);
  };

  // Renders the ML processing status
  const renderMlProcessingStatus = () => {
    if (mlProcessingLoading) {
      return (
        <Alert variant="info" className="my-2">
          <Spinner animation="border" size="sm" className="me-2" />
          Processing ML predictions for {stock.stock_key}... This may take a moment.
        </Alert>
      );
    }
    
    if (mlProcessingRun && predictionData) {
      return (
        <Alert variant="success" className="my-2">
          <FaCheckCircle className="me-2" />
          ML predictions are up-to-date for {stock.stock_key}.
        </Alert>
      );
    }
    
    return null;
  };

  // Sets up the real-time updates for processed data and prediction data.
  useEffect(() => {
    if (!stock || !stock.stock_key) return;
    
    console.log(`Setting up real-time updates for analysis data for ${stock.stock_key}`);
    
    // Subscribe to the processed data updates
    const processedUnsubscribe = stockDataRefreshManager.subscribe(
      'processed',
      stock.stock_key,
      (newProcessedData) => {
        console.log(`Received real-time processed data update for ${stock.stock_key}`);
        const dataArray = Array.isArray(newProcessedData) ? newProcessedData : [newProcessedData];
        
        if (dataArray.length > 0) {
          setLastUpdateTime(new Date());
        }
      }
    );
    
    // Subscribe to the prediction data updates
    const predictionUnsubscribe = stockDataRefreshManager.subscribe(
      'prediction',
      stock.stock_key,
      (newPredictionData) => {
        console.log(`Received real-time prediction data update for ${stock.stock_key}`);
        setFallbackPrediction(newPredictionData);
        setLastUpdateTime(new Date());
      }
    );
    
    // Cleans up subscriptions
    return () => {
      processedUnsubscribe();
      predictionUnsubscribe();
      console.log(`Cleaned up real-time updates for analysis data for ${stock.stock_key}`);
    };
  }, [stock]);

  return (
    <div className="analysis-tab">
      <Card className="prediction-card mb-3">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Price Prediction</h5>
          {isAdmin && fallbackPrediction && (
            <Badge 
              bg={fallbackPrediction.usedML ? "primary" : "warning"} 
              text="light"
            >
              {fallbackPrediction.usedML ? "ML Model" : 
               (fallbackPrediction.isSimpleFallback ? "Low Confidence (Estimate)" : "Medium Confidence (Technical)")}
            </Badge>
          )}
        </Card.Header>
        <Card.Body>
          {/* ML Processing Status */}
          {renderMlProcessingStatus()}
          
          {/* Information message - only show detailed info to admins */}
          {isAdmin && fallbackPrediction && (
            <Alert variant="info" className="my-2">
              <FaInfoCircle className="me-2" />
              {fallbackPrediction.usedML ? 
                `Using ${predictionData?.best_model || 'machine learning'} model for the next 5-minute candle.` : 
                (fallbackPrediction.isSimpleFallback ? 
                  `ML prediction unavailable. Using simplified estimate for the next 5-minute candle.` :
                  `ML prediction unavailable. Using technical indicators for the next 5-minute candle.`
                )
              }
            </Alert>
          )}
          
          {/* For regular users, show a simpler info message */}
          {!isAdmin && fallbackPrediction && (
            <Alert variant="info" className="my-2">
              <FaInfoCircle className="me-2" />
              Showing predicted price for the next 5-minute candle.
            </Alert>
          )}

          {predictionData && predictionData.best_predicted_price ? (
            <>
            <Row className="mb-4">
                  <Col md={12}>
                    <h5>Price Prediction</h5>
                    <div className={`prediction-value ${getPredictionClass()}`}>
                      {formatCurrency(predictionData.best_predicted_price)} ({getPredictionChange().formatted})
                      {getPredictionClass() === 'positive' ? (
                        <FaArrowUp className="ms-2" />
                      ) : (
                        <FaArrowDown className="ms-2" />
                      )}
                    </div>
                <div className="current-price mt-3 p-2 bg-light rounded">
                  <div className="d-flex justify-content-between">
                    <span className="current-price-label">Current Price:</span>
                    <span className="current-price-value">{formatCurrency(priceData?.latest_price)}</span>
                  </div>
                </div>
              </Col>
            </Row>
            
            {/* Price Prediction Chart */}
            {getChartData().length > 0 && (
              <Row>
                <Col xs={12}>
                  <h5 className="mb-3">Historical Price with Prediction</h5>
                  <div className="prediction-chart-container">
                    <div className="prediction-chart mb-3" style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={getChartData()}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            tickLine={true}
                            tick={{fontSize: 12}}
                          />
                          <YAxis 
                            domain={['auto', 'auto']}
                            tickFormatter={(value) => value.toFixed(0)}
                          />
                          <Tooltip 
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                // Check if this tooltip is for a prediction point
                                const isPredictionPoint = payload[0]?.payload?.isPredictionPoint;
                                const predictionChange = payload[0]?.payload?.predictionChange;
                                const fullDate = payload[0]?.payload?.fullDate;
                                
                                // Determine the text color for the prediction value
                                const predictionColor = isPredictionPoint && predictionChange 
                                  ? (predictionChange === 'positive' ? '#28a745' : '#dc3545') 
                                  : 'inherit';
                                
                                return (
                                  <div className="recharts-custom-tooltip" style={{
                                    backgroundColor: '#f8f9fa',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    padding: '10px',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                                  }}>
                                    <p className="recharts-tooltip-label" style={{ margin: '0 0 10px 0' }}>
                                      {fullDate ? formatDateTime(fullDate) : label}
                                    </p>
                                    {payload.map((entry, index) => {
                                      // Use special styling for prediction values
                                      const isPredict = entry.name === 'Predicted Price' || entry.name === 'Estimated Price';
                                      
                                      if (entry.value === null || entry.value === undefined) return null;
                                      
                                      return (
                                        <p key={`item-${index}`} style={{ 
                                          margin: '5px 0',
                                          color: isPredict && isPredictionPoint ? predictionColor : 'inherit',
                                          backgroundColor: isPredict && isPredictionPoint ? `${predictionColor}15` : 'transparent',
                                          padding: isPredict && isPredictionPoint ? '5px' : '0',
                                          borderRadius: isPredict && isPredictionPoint ? '4px' : '0',
                                          fontWeight: isPredict && isPredictionPoint ? 'bold' : 'normal'
                                        }}>
                                          <span style={{ 
                                            display: 'inline-block', 
                                            width: '10px', 
                                            height: '10px', 
                                            backgroundColor: isPredict && isPredictionPoint ? predictionColor : entry.color,
                                            marginRight: '5px'
                                          }}></span>
                                          <span>
                                            {entry.name}: {formatCurrency(entry.value)}
                                            {isPredict && isPredictionPoint && (
                                              <span style={{ marginLeft: '5px', color: predictionColor }}>
                                                {predictionChange === 'positive' ? '▲' : '▼'}
                                              </span>
                                            )}
                                          </span>
                                        </p>
                                      );
                                    })}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend verticalAlign="top" height={36} />
                          <Line 
                            type="monotone" 
                            dataKey="price" 
                            stroke="#8884d8" 
                            name="Historical Price" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                            isAnimationActive={true}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="predictedPrice" 
                            stroke={getPredictionClass() === 'positive' ? '#28a745' : '#dc3545'} 
                            name="Predicted Price" 
                            strokeWidth={3}
                            strokeDasharray="5 5"
                            dot={(props) => {
                              const { cx, cy, payload } = props;
                              if (payload.isPredictionPoint) {
                                const fill = payload.predictionChange === 'positive' ? '#28a745' : '#dc3545';
                                
                                const lastPoints = getChartData().filter(p => !p.isPredictionPoint);
                                const lastPoint = lastPoints[lastPoints.length - 1];
                                
                                if (lastPoint) {
                                  // Coordinates are in the local chart coordinate system
                                  const lastX = props.points?.find(p => p.payload.name === lastPoint.name)?.x;
                                  const lastY = props.points?.find(p => p.payload.name === lastPoint.name)?.y;
                                  
                                  if (lastX !== undefined && lastY !== undefined) {
                                    return (
                                      <g>
                                        <line 
                                          x1={lastX} 
                                          y1={lastY} 
                                          x2={cx} 
                                          y2={cy} 
                                          stroke={fill} 
                                          strokeWidth={3} 
                                          strokeDasharray="5 5" 
                                        />
                                        <circle 
                                          cx={cx} 
                                          cy={cy} 
                                          r={6} 
                                          fill={fill} 
                                          stroke="#fff" 
                                          strokeWidth={2} 
                                        />
                                      </g>
                                    );
                                  }
                                }
                                
                                return (
                                  <circle 
                                    cx={cx} 
                                    cy={cy} 
                                    r={6} 
                                    fill={fill} 
                                    stroke="#fff" 
                                    strokeWidth={2} 
                                  />
                                );
                              }
                              return null;
                            }}
                            activeDot={(props) => {
                              const { cx, cy, payload } = props;
                              if (payload.isPredictionPoint) {
                                const fill = payload.predictionChange === 'positive' ? '#28a745' : '#dc3545';
                                return (
                                  <circle 
                                    cx={cx} 
                                    cy={cy} 
                                    r={8} 
                                    fill={fill} 
                                    stroke="#fff" 
                                    strokeWidth={2} 
                                  />
                                );
                              }
                              return null;
                            }}
                          />
                          <Line type="monotone" dataKey="normalMA" stroke="#82ca9d" name="Moving Average" dot={false} connectNulls />
                          <Line type="monotone" dataKey="upperBand" stroke="#607d8b" name="Upper Band" dot={false} strokeDasharray="3 3" connectNulls />
                          <Line type="monotone" dataKey="lowerBand" stroke="#607d8b" name="Lower Band" dot={false} strokeDasharray="3 3" connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                    </div>
                    <div className="chart-source text-muted small text-end mb-2">
                      {Array.isArray(processedData) && processedData.length > 0 ? 
                        `Showing most recent trading day${getChartData().length > 0 && getChartData()[0].name === 'Previous Close' ? ' with prior day closing price' : ''} (${getChartData().length} points)` : 
                        'No historical data available'}
                    </div>
                  </div>
                </Col>
              </Row>
            )}
            </>
          ) : fallbackPrediction ? (
            <>
            <Row className="mb-4">
              <Col md={12}>
                <h5>Estimated Next Candle</h5>
                <div className={`prediction-value ${getPredictionClass()}`}>
                  {formatCurrency(fallbackPrediction.price)} ({getPredictionChange().formatted})
                  {getPredictionClass() === 'positive' ? (
                    <FaArrowUp className="ms-2" />
                  ) : (
                    <FaArrowDown className="ms-2" />
                  )}
                </div>
                <div className="current-price mt-3 p-2 bg-light rounded">
                  <div className="d-flex justify-content-between">
                    <span className="current-price-label">Current Price:</span>
                    <span className="current-price-value">{formatCurrency(priceData?.latest_price)}</span>
                  </div>
                </div>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <Card className="mb-3">
                  <Card.Header>
                    <h5 className="mb-0">Technical Analysis</h5>
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        Based on {fallbackPrediction?.isSimpleFallback ? 'simplified market estimate' : 'technical indicators'}
                      </small>
                      <small className="text-muted">
                        Last updated: {formatTime(lastUpdateTime)}
                      </small>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6} className="mb-3">
                        <h6>Market Sentiment</h6>
                        <div className="metric-item d-flex justify-content-between mb-2 pb-2 border-bottom">
                          <span className="metric-value d-flex align-items-center">
                            {fallbackPrediction.direction === 'bullish' ? 'Bullish' : fallbackPrediction.direction === 'bearish' ? 'Bearish' : 'Neutral'}
                            <Badge 
                              bg={fallbackPrediction.direction === 'bullish' ? 'success' : fallbackPrediction.direction === 'bearish' ? 'danger' : 'secondary'} 
                              className="ms-2"
                            >
                              {(fallbackPrediction.confidence * 100).toFixed(0)}%
                            </Badge>
                          </span>
                        </div>
                      </Col>
                      {!fallbackPrediction.isSimpleFallback && !fallbackPrediction.isErrorFallback && (
                        <>
                          <Col md={6} className="mb-3">
                            <h6>Bullish Signals</h6>
                            <div className="metric-item d-flex justify-content-between mb-2 pb-2 border-bottom">
                              <span className="metric-value">{fallbackPrediction.indicators.bullishCount.toFixed(1)}</span>
                            </div>
                          </Col>
                          <Col md={6} className="mb-3">
                            <h6>Bearish Signals</h6>
                            <div className="metric-item d-flex justify-content-between mb-2 pb-2 border-bottom">
                              <span className="metric-value">{fallbackPrediction.indicators.bearishCount.toFixed(1)}</span>
                            </div>
                          </Col>
                        </>
                      )}
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
            
            {/* Price Prediction Chart */}
            {getChartData().length > 0 && !fallbackPrediction.isSimpleFallback && !fallbackPrediction.isErrorFallback && (
              <Row>
                <Col xs={12}>
                  <h5 className="mb-3">Historical Price with Technical Estimate</h5>
                  <div className="prediction-chart-container">
                    <div className="prediction-chart mb-3" style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={getChartData()}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            tickLine={true}
                            tick={{fontSize: 12}}
                          />
                          <YAxis 
                            domain={['auto', 'auto']}
                            tickFormatter={(value) => value.toFixed(0)}
                          />
                          <Tooltip 
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                const isPredictionPoint = payload[0]?.payload?.isPredictionPoint;
                                const predictionChange = payload[0]?.payload?.predictionChange;
                                const fullDate = payload[0]?.payload?.fullDate;
                                
                                const predictionColor = isPredictionPoint && predictionChange 
                                  ? (predictionChange === 'positive' ? '#4caf50' : '#f44336') 
                                  : 'inherit';
                                
                                return (
                                  <div className="recharts-custom-tooltip" style={{
                                    backgroundColor: '#f8f9fa',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    padding: '10px',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                                  }}>
                                    <p className="recharts-tooltip-label" style={{ margin: '0 0 10px 0' }}>
                                      {fullDate ? formatDateTime(fullDate) : label}
                                    </p>
                                    {payload.map((entry, index) => {
                                      const isPredict = entry.name === 'Predicted Price' || entry.name === 'Estimated Price';
                                      
                                      if (entry.value === null || entry.value === undefined) return null;
                                      
                                      return (
                                        <p key={`item-${index}`} style={{ 
                                          margin: '5px 0',
                                          color: isPredict && isPredictionPoint ? predictionColor : 'inherit',
                                          backgroundColor: isPredict && isPredictionPoint ? `${predictionColor}15` : 'transparent',
                                          padding: isPredict && isPredictionPoint ? '5px' : '0',
                                          borderRadius: isPredict && isPredictionPoint ? '4px' : '0',
                                          fontWeight: isPredict && isPredictionPoint ? 'bold' : 'normal'
                                        }}>
                                          <span style={{ 
                                            display: 'inline-block', 
                                            width: '10px', 
                                            height: '10px', 
                                            backgroundColor: isPredict && isPredictionPoint ? predictionColor : entry.color,
                                            marginRight: '5px'
                                          }}></span>
                                          <span>
                                            {entry.name}: {formatCurrency(entry.value)}
                                            {isPredict && isPredictionPoint && (
                                              <span style={{ marginLeft: '5px', color: predictionColor }}>
                                                {predictionChange === 'positive' ? '▲' : '▼'}
                                              </span>
                                            )}
                                          </span>
                                        </p>
                                      );
                                    })}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend verticalAlign="top" height={36} />
                          <Line 
                            type="monotone" 
                            dataKey="price" 
                            stroke="#8884d8" 
                            name="Historical Price" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                            isAnimationActive={true}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="predictedPrice" 
                            stroke="#ff9800" 
                            name="Estimated Price" 
                            strokeWidth={3}
                            strokeDasharray="5 5"
                            dot={(props) => {
                              const { cx, cy, payload } = props;
                              if (payload.isPredictionPoint) {
                                const fill = payload.predictionChange === 'positive' ? '#4caf50' : '#f44336';
                                
                                const lastPoints = getChartData().filter(p => !p.isPredictionPoint);
                                const lastPoint = lastPoints[lastPoints.length - 1];
                                
                                if (lastPoint) {
                                  const lastX = props.points?.find(p => p.payload.name === lastPoint.name)?.x;
                                  const lastY = props.points?.find(p => p.payload.name === lastPoint.name)?.y;
                                  
                                  if (lastX !== undefined && lastY !== undefined) {
                                    return (
                                      <g>
                                        <line 
                                          x1={lastX} 
                                          y1={lastY} 
                                          x2={cx} 
                                          y2={cy} 
                                          stroke={fill} 
                                          strokeWidth={3} 
                                          strokeDasharray="5 5" 
                                        />
                                        <circle 
                                          cx={cx} 
                                          cy={cy} 
                                          r={6} 
                                          fill={fill} 
                                          stroke="#fff" 
                                          strokeWidth={2} 
                                        />
                                      </g>
                                    );
                                  }
                                }
                                
                                return (
                                  <circle 
                                    cx={cx} 
                                    cy={cy} 
                                    r={6} 
                                    fill={fill} 
                                    stroke="#fff" 
                                    strokeWidth={2} 
                                  />
                                );
                              }
                              return null;
                            }}
                            activeDot={(props) => {
                              const { cx, cy, payload } = props;
                              if (payload.isPredictionPoint) {
                                const fill = payload.predictionChange === 'positive' ? '#4caf50' : '#f44336';
                                return (
                                  <circle 
                                    cx={cx} 
                                    cy={cy} 
                                    r={8} 
                                    fill={fill} 
                                    stroke="#fff" 
                                    strokeWidth={2} 
                                  />
                                );
                              }
                              return null;
                            }}
                          />
                          <Line type="monotone" dataKey="normalMA" stroke="#82ca9d" name="Moving Average" dot={false} connectNulls />
                          <Line type="monotone" dataKey="upperBand" stroke="#607d8b" name="Upper Band" dot={false} strokeDasharray="3 3" connectNulls />
                          <Line type="monotone" dataKey="lowerBand" stroke="#607d8b" name="Lower Band" dot={false} strokeDasharray="3 3" connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                    </div>
                    <div className="chart-source text-muted small text-end mb-2">
                      {Array.isArray(processedData) && processedData.length > 0 ? 
                        `Showing most recent trading day${getChartData().length > 0 && getChartData()[0].name === 'Previous Close' ? ' with prior day closing price' : ''} (${getChartData().length} points)` : 
                        'No historical data available'}
                    </div>
                  </div>
                </Col>
              </Row>
            )}
            </>
          ) : (
            <div className="text-center py-4">
              <FaExclamationTriangle className="mb-3 text-warning" style={{ fontSize: '2rem' }} />
              <p>Unable to generate any price prediction</p>
              <p className="text-muted small">
                {priceData?.latest_price ? 
                  "Attempting to create prediction, please wait..." : 
                  "Missing current price data required for prediction"}
              </p>
            </div>
          )}

          {/*Model details section removed as requested */}
        </Card.Body>
      </Card>

      {/* Technical Indicators Section */}
      {latestProcessedData && (
        <Row className="mb-4">
          <Col>
            <Card className="technical-indicators-card">
              <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                  <span>Technical Indicators</span>
                  <Badge 
                    bg={rsiZone.zone === 'overbought' ? 'danger' : rsiZone.zone === 'oversold' ? 'success' : 'info'}
                  >
                    {rsiZone.text}
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col lg={6}>
                    <h5 className="mb-3">Key Indicators</h5>
                    <Table bordered hover size="sm" className="indicator-table">
                      <thead>
                        <tr>
                          <th>Indicator</th>
                          <th>Value</th>
                          <th>Interpretation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getTechnicalIndicators().map((indicator, index) => (
                          <tr key={index}>
                            <td>{indicator.name}</td>
                            <td>{indicator.value}</td>
                            <td>
                              <small>{indicator.description}</small>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Col>
                  <Col lg={6}>
                    <h5 className="mb-3">Oscillators</h5>
                    <div className="oscillator-chart" style={{ height: '180px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={getOscillatorData()}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip 
                            position={{ x: 'auto', y: 0 }} 
                            cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                            wrapperStyle={{ 
                              backgroundColor: '#fff', 
                              border: '1px solid #ddd',
                              borderRadius: '3px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                              right: 0
                            }}
                          />
                          <Legend />
                          <Bar dataKey="RSI" fill="#8884d8" name="RSI" />
                          <Bar dataKey="StochasticK" fill="#82ca9d" name="Stochastic %K" />
                          <Bar dataKey="StochasticD" fill="#ffc658" name="Stochastic %D" />
                          <Bar dataKey="WilliamsR" fill="#ff8042" name="Williams %R" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <h5 className="mt-4 mb-3">Momentum & Volatility</h5>
                    <div className="momentum-chart" style={{ height: '120px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={getMomentumData()}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis 
                            tickFormatter={(value) => value.toFixed(2)} 
                            domain={[dataMin => Math.min(-0.5, dataMin * 1.1), dataMax => Math.max(0.5, dataMax * 1.1)]} 
                          />
                          <Tooltip 
                            formatter={(value, name, props) => {
                              // Show original values in tooltip
                              if (name === 'Volatility') return props.payload.originalVolatility.toFixed(4);
                              if (name === 'Momentum') return props.payload.originalMomentum.toFixed(4);
                              if (name === 'Price Rate of Change') return props.payload.originalPriceRoc.toFixed(4);
                              return value.toFixed(4);
                            }}
                            position={{ x: 'auto', y: 0 }}
                            cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                            wrapperStyle={{ 
                              backgroundColor: '#fff', 
                              border: '1px solid #ddd',
                              borderRadius: '3px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                              right: 0
                            }}
                          />
                          <Legend />
                          <ReferenceLine y={0} stroke="#000" strokeWidth={1} />
                          <Bar dataKey="volatility" fill="#8884d8" name="Volatility" />
                          <Bar dataKey="momentum" fill="#82ca9d" name="Momentum" />
                          <Bar dataKey="priceroc" fill="#ffc658" name="Price Rate of Change" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Col>
                </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      )}

      {/* Admin Debug Panel*/}
      {isAdmin && (
        <Row className="mb-4">
          <Col>
            <Card className="debug-card border-info">
              <Card.Header className="bg-info text-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0"><FaCog className="me-2" /> Admin Debug Panel</h5>
                <Badge bg="light" text="dark">{new Date(debugInfo.lastUpdate || Date.now()).toLocaleTimeString()}</Badge>
              </Card.Header>
              <Card.Body>
                <h6>Data Status</h6>
                <Table striped bordered size="sm" className="mb-4">
                  <tbody>
                    <tr>
                      <td width="30%">Stock Data</td>
                      <td>{debugInfo.dataStatus?.hasStockData ? '✅' : '❌'}</td>
                    </tr>
                    <tr>
                      <td>Price Data</td>
                      <td>{debugInfo.dataStatus?.hasPriceData ? '✅' : '❌'}</td>
                    </tr>
                    <tr>
                      <td>Prediction Data</td>
                      <td>{debugInfo.dataStatus?.hasPredictionData ? '✅' : '❌'}</td>
                    </tr>
                    <tr>
                      <td>Processed Data</td>
                      <td>
                        {debugInfo.dataStatus?.hasProcessedData ? '✅' : '❌'} 
                        {debugInfo.dataStatus?.hasProcessedData && 
                          <span className="ms-2">({debugInfo.dataStatus?.processedDataLength} records)</span>
                        }
                      </td>
                    </tr>
                  </tbody>
                </Table>
                
                <h6>ML Processing Status</h6>
                <Table striped bordered size="sm" className="mb-4">
                  <tbody>
                    <tr>
                      <td width="30%">ML Loading</td>
                      <td>{debugInfo.processingStatus?.mlProcessingLoading ? '⏳' : '✅'}</td>
                    </tr>
                    <tr>
                      <td>ML Run Complete</td>
                      <td>{debugInfo.processingStatus?.mlProcessingRun ? '✅' : '❌'}</td>
                    </tr>
                  </tbody>
                </Table>
                
                <h6>Prediction Source</h6>
                <Alert variant={fallbackPrediction?.usedML ? 'primary' : (fallbackPrediction?.isSimpleFallback ? 'warning' : 'info')}>
                  {fallbackPrediction?.usedML ? 
                    `Using ML model (${predictionData?.best_model || 'unknown'})` : 
                    (fallbackPrediction?.isSimpleFallback ? 
                      'Using simplified estimation (LOW CONFIDENCE)' : 
                      'Using technical indicators (MEDIUM CONFIDENCE)'
                    )
                  }
                </Alert>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Row>
        <Col>
          <Card className="info-card">
            <Card.Header>About Our Analysis</Card.Header>
            <Card.Body>
              <p>
                Our analysis combines machine learning price predictions with traditional technical indicators to provide a comprehensive view of {stock?.name || 'this stock'}.
                When available, we use two machine learning models (SVM and LSTM) and select the best one based on Mean Squared Error (MSE).
                When ML predictions are unavailable, we calculate estimates based on technical indicators.
              </p>
              <div className="mt-3 p-2 bg-light border rounded">
                <h6><FaExclamationTriangle className="me-2 text-warning" /> Important Disclaimer</h6>
                <p className="mb-0">
                  These predictions and indicators are based on historical data analysis and should not be the sole basis for investment decisions. 
                  Past performance is not indicative of future results. Always conduct additional research before making any investment.
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AnalysisTab; 