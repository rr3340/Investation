import { stockApi } from '../lib/api';

//Real-time data service for managing the stock data updates.
class RealTimeDataService {
  constructor(marketScheduler) {
    // Saves the reference to the market scheduler.
    this.marketScheduler = marketScheduler;
    
    // Caches the stock data.
    this.stockCache = new Map();
    
    // Maps of listeners for the different stock data.
    this.listeners = {
      priceUpdates: new Map(),    //Price updates.
      historicalData: new Map(),  //Historical charts.
      processedData: new Map(),   //Processed stock.
      predictionData: new Map(),  //Predicted data.
    };
    
    // Set the polling timers.
    this.pollingTimers = new Map();
    
    // Track last update.
    this.lastUpdateTimes = new Map();
    
    // Flag to show we're updating.
    this.isUpdatingAll = false;
    
    // Flag to show if the process completes.
    this.batchUpdateCompleted = false;
    
    // Flag to track when the batch update was last completed.
    this.lastBatchUpdateCompletionTime = null;
    
    // The timestamp when the last batch update completed.
    this.lastBatchUpdateTime = null;
    
    // Initializes automatic polling based on market scheduler.
    this.initializePolling();
    
    console.log('RealTimeDataService initialized');
  }
  
  // Initializes polling which is based on market scheduler.
  initializePolling() {
    // Checks every minute if updates are needed.
    this.mainPollingInterval = setInterval(() => {
      const marketStatus = this.marketScheduler.getMarketStatus();
      
      // Only update during open market hours with a recently updated batch.
      if (marketStatus.is_market_open && this.wasRecentlyBatchUpdated()) {
        const now = new Date();
        const nextUpdate = new Date(marketStatus.next_update);
        const timeDiff = Math.abs(nextUpdate - now);
        
        // If we're within 30 seconds of the next scheduled update, or less than 30 seconds after, trigger an update cycle.
        //We take 30 seconds since processing faster on the backend would result in incorrect data due to yfinance's API limitations.
        if (timeDiff < 30000) {
          this.updateAllStockData();
        }
        
        // If the last update was very recent, update the data.
        if (marketStatus.last_update) {
          const lastUpdate = new Date(marketStatus.last_update);
          const timeSinceLastUpdate = now - lastUpdate;
          
          // If the last scheduler update was within the last minute, update the data.
          if (timeSinceLastUpdate < 60000) {
            this.updateAllStockData();
          }
        }
      }
    }, 30000); //Checks every 30 seconds.
  }
  
  // Mark the batch update as completed.
  markBatchUpdateCompleted() {
    const now = new Date();
    this.lastBatchUpdateTime = now.toISOString();
    console.log(`Batch update marked as completed at ${this.lastBatchUpdateTime}`);
    

    console.log('Batch update completed - StockDataRefreshManager will handle data fetching');
  }
  
  // Mark batch update as completed without triggering any immediate updates.
  // This is used to prevent duplicate API calls when StockDataRefreshManager is handling the updates.
  markBatchUpdateCompletedWithoutUpdate() {
    if (this.batchUpdateCompleted) {
      console.log('Batch update already marked as completed - not triggering update');
      return;
    }
    
    this.batchUpdateCompleted = true;
    
    // Track when the batch update was last completed within the current timestamp.
    this.lastBatchUpdateCompletionTime = new Date();
    
    console.log(`Batch update completed at ${this.lastBatchUpdateCompletionTime.toISOString()}, real-time updates enabled`);
  }
  
  // Reset batch update status
  resetBatchUpdateStatus() {
    const wasCompleted = this.batchUpdateCompleted;
    this.batchUpdateCompleted = false;
    this.lastBatchUpdateCompletionTime = null;
    
    if (wasCompleted) {
      console.log('Batch update status reset, waiting for next batch update');
    }
  }
  
  // Check if batch update has been completed
  isBatchUpdateCompleted() {
    return this.batchUpdateCompleted;
  }
  
  // Checks if a batch update has been completed recently
  wasRecentlyBatchUpdated(thresholdSeconds = 65) {
    if (this.lastBatchUpdateTime) {
      try {
        // Safely parses the ISO timestamp.
        const lastUpdateTime = new Date(this.lastBatchUpdateTime);
        if (isNaN(lastUpdateTime.getTime())) {
          console.warn(`Invalid lastBatchUpdateTime: ${this.lastBatchUpdateTime}`);
        } else {
          const now = new Date();
          const elapsedSeconds = (now - lastUpdateTime) / 1000;
          
          return elapsedSeconds <= thresholdSeconds;
        }
      } catch (error) {
        console.error('Error checking recent batch update via lastBatchUpdateTime:', error);
      }
    }
    
    // Backup method, we use the batchUpdateCompleted flag and lastBatchUpdateCompletionTime.
    if (this.batchUpdateCompleted && this.lastBatchUpdateCompletionTime) {
      try {
        const now = new Date();
        const elapsedSeconds = (now - this.lastBatchUpdateCompletionTime) / 1000;
        
        return elapsedSeconds <= thresholdSeconds;
      } catch (error) {
        console.error('Error checking recent batch update via lastBatchUpdateCompletionTime:', error);
      }
    }
    
    // Else, return false.
    return false;
  }
  
  // Gets all the stocks from portfolio and watchlist.
  getAllTrackedStocks() {
    try {
      // Get all of the unique stock keys we're monitoring.
      const monitoredStockKeys = new Set([
        ...this.listeners.priceUpdates.keys(),
        ...this.listeners.historicalData.keys(),
        ...this.listeners.processedData.keys(),
        ...this.listeners.predictionData.keys()
      ]);
      
      // Convert the keys to stock objects with symbol property.
      return Array.from(monitoredStockKeys).map(symbol => ({ symbol }));
    } catch (error) {
      console.error('Error getting tracked stocks:', error);
      return [];
    }
  }
  
  // Get the time in minutes since the last update for a stock.
  getMinutesSinceLastUpdate(symbol) {
    const lastUpdate = this.lastUpdateTimes.get(symbol);
    if (!lastUpdate) {
      return Infinity;
    }
    
    const now = new Date();
    const elapsedMs = now - lastUpdate;
    return Math.floor(elapsedMs / (60 * 1000));
  }
  
  // Update all stock data that's being currently being monitored.
  async updateAllStockData() {
    if (this.isUpdatingAll) {
      console.log('Already updating all stock data, skipping this request');
      return;
    }
    
    this.isUpdatingAll = true;
    
    try {
      console.log('Updating all stock data...');
      const recentlyBatchUpdated = this.wasRecentlyBatchUpdated();
      const batchUpdateStatus = recentlyBatchUpdated ? 'COMPLETED' : 'NOT COMPLETED';
      console.log(`Batch update status: ${batchUpdateStatus} (${this.lastBatchUpdateTime || 'never'})`);
      
      //Get all of the stocks from portfolio and watchlist.
      const allStocks = this.getAllTrackedStocks();
      console.log(`Found ${allStocks.length} stocks to update`);
      
      // Processing each stock.
      const promises = allStocks.map(async (stock) => {
        const minutesSinceLastUpdate = this.getMinutesSinceLastUpdate(stock.symbol);
        
        // Update stocks if they haven't been updated in the last 5 minutes, or a 
        // batch update was recently completed (which means we should get fresh data)
        if (minutesSinceLastUpdate >= 5 || recentlyBatchUpdated) {
          return this.fetchAndBroadcastUpdates(stock.symbol);
        } else {
          console.log(`Skipping update for ${stock.symbol} - updated ${minutesSinceLastUpdate} mins ago`);
          return null;
        }
      });
      
      Promise.all(promises)
        .then(() => {
          console.log('All stock updates completed');
          this.isUpdatingAll = false;
        })
        .catch((error) => {
          console.error('Error updating all stocks:', error);
          this.isUpdatingAll = false;
        });
    } catch (error) {
      console.error('Error in updateAllStockData:', error);
      this.isUpdatingAll = false;
    }
  }
  
  // Fetch and broadcast updates for a specific stock.
  async fetchAndBroadcastUpdates(stockKey) {
    try {
      const currentTime = new Date();
      console.log(`Fetching updates for ${stockKey} at ${currentTime.toISOString()}`);
      const startTime = Date.now();
      
      // Record the attempt as an update to avoid repeated attempts if server is down.
      this.lastUpdateTimes.set(stockKey, currentTime);
      
      // Track if we have a valid batch update timestamp to include with the API requests.
      const batchTimestamp = this.lastBatchUpdateCompletionTime ? 
        this.lastBatchUpdateCompletionTime.getTime() : null;
      
      const updatePromises = [];
      
      // Update the price data if there are listeners.
      if (this.listeners.priceUpdates.has(stockKey) && this.listeners.priceUpdates.get(stockKey).size > 0) {
        updatePromises.push(
          (async () => {
            try {
              const timestamp = Date.now();
              const priceData = await stockApi.getLatestPrice(stockKey, { 
                _nocache: timestamp,
                _batchTime: batchTimestamp
              });
              
              if (priceData) {
                this.stockCache.set(`price_${stockKey}`, priceData);
                this.notifyListeners('priceUpdates', stockKey, priceData);
                return { type: 'price', success: true };
              } else {
                return { type: 'price', success: false, error: 'No data returned' };
              }
            } catch (error) {
              console.error(`Error updating price data for ${stockKey}:`, error);
              return { type: 'price', success: false, error };
            }
          })()
        );
      }
      
      // Update the historical data if there are listeners.
      if (this.listeners.historicalData.has(stockKey) && this.listeners.historicalData.get(stockKey).size > 0) {
        updatePromises.push(
          (async () => {
            try {
              const timestamp = Date.now();
              const historicalOptions = { 
                interval: '1d', 
                period: '6mo',
                _nocache: timestamp,
                _batchTime: batchTimestamp
              };
              
              const historyData = await stockApi.getHistoricalData(stockKey, historicalOptions);
              
              if (historyData && historyData.length > 0) {
                this.stockCache.set(`history_${stockKey}`, historyData);
                this.notifyListeners('historicalData', stockKey, historyData);
                return { type: 'historical', success: true };
              } else {
                return { type: 'historical', success: false, error: 'No data returned' };
              }
            } catch (error) {
              console.error(`Error updating historical data for ${stockKey}:`, error);
              return { type: 'historical', success: false, error };
            }
          })()
        );
      }
      
      if (this.listeners.processedData.has(stockKey) && this.listeners.processedData.get(stockKey).size > 0) {
        updatePromises.push(
          (async () => {
            try {
              const timestamp = Date.now();
              const processedData = await stockApi.getProcessedStockData(stockKey, { 
                _nocache: timestamp,
                _batchTime: batchTimestamp
              });
              
              if (processedData && processedData.length > 0) {
                this.stockCache.set(`processed_${stockKey}`, processedData);
                this.notifyListeners('processedData', stockKey, processedData);
                return { type: 'processed', success: true };
              } else {
                return { type: 'processed', success: false, error: 'No data returned' };
              }
            } catch (error) {
              console.error(`Error updating processed data for ${stockKey}:`, error);
              return { type: 'processed', success: false, error };
            }
          })()
        );
      }
      
      // Update the prediction data if there are listeners.
      if (this.listeners.predictionData.has(stockKey) && this.listeners.predictionData.get(stockKey).size > 0) {
        updatePromises.push(
          (async () => {
            try {
              const timestamp = Date.now();
              const predictionData = await stockApi.getBestPrediction(stockKey, { 
                _nocache: timestamp,
                _batchTime: batchTimestamp
              });
              
              if (predictionData) {
                this.stockCache.set(`prediction_${stockKey}`, predictionData);
                this.notifyListeners('predictionData', stockKey, predictionData);
                return { type: 'prediction', success: true };
              } else {
                return { type: 'prediction', success: false, error: 'No data returned' };
              }
            } catch (error) {
              console.error(`Error updating prediction data for ${stockKey}:`, error);
              return { type: 'prediction', success: false, error };
            }
          })()
        );
      }
      
      // Execute the update promises in parallel.
      const results = await Promise.all(updatePromises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const successfulTypes = results.filter(r => r.success).map(r => r.type);
      const failedTypes = results.filter(r => !r.success).map(r => r.type);

      // Log the successful and failed results.
      console.log(`Updates for ${stockKey} completed in ${duration}ms: ` + 
        (successfulTypes.length ? `SUCCESS: ${successfulTypes.join(', ')}` : '') +
        (failedTypes.length ? ` FAILED: ${failedTypes.join(', ')}` : '')
      );
      
      // Only update the lastUpdateTimes on success.
      if (results.some(r => r.success)) {
        this.lastUpdateTimes.set(stockKey, new Date());
      }
    } catch (error) {
      console.error(`Error updating data for ${stockKey}:`, error);
    }
  }
  
  // Subscribe to price updates for a specific stock
  subscribeToPrice(stockKey, callback) {
    return this.subscribeToData('priceUpdates', stockKey, callback);
  }
  
  // Subscribe to historical data updates for a specific stock
  subscribeToHistoricalData(stockKey, callback) {
    return this.subscribeToData('historicalData', stockKey, callback);
  }
  
  // Subscribe to processed data updates for a specific stock
  subscribeToProcessedData(stockKey, callback) {
    return this.subscribeToData('processedData', stockKey, callback);
  }
  
  // Subscribe to prediction data updates for a specific stock
  subscribeToPredictionData(stockKey, callback) {
    return this.subscribeToData('predictionData', stockKey, callback);
  }
  
  // Generic method to subscribe to any type of data
  subscribeToData(dataType, stockKey, callback) {
    if (!this.listeners[dataType].has(stockKey)) {
      this.listeners[dataType].set(stockKey, new Set());
    }
    
    const listenersSet = this.listeners[dataType].get(stockKey);
    listenersSet.add(callback);
    
    // Setup the immediate data fetch if not in cache.
    const cacheKey = this.getCacheKey(dataType, stockKey);
    if (!this.stockCache.has(cacheKey)) {
      // Then schedule an immediate fetch.
      this.scheduleFetch(dataType, stockKey);
    } else {
      setTimeout(() => {
        callback(this.stockCache.get(cacheKey));
      }, 0);
    }
    
    // Return the unsubscribe function.
    return () => {
      if (this.listeners[dataType].has(stockKey)) {
        this.listeners[dataType].get(stockKey).delete(callback);
        
        // If no more listeners for this stock, clean up
        if (this.listeners[dataType].get(stockKey).size === 0) {
          this.listeners[dataType].delete(stockKey);
          
          // If no more listeners for any data type for this stock, 
          // we can stop polling for it
          if (!this.hasAnyListenersForStock(stockKey)) {
            this.stopPollingForStock(stockKey);
          }
        }
      }
    };
  }
  
  // Schedule a fetch for a specific data type and stock.
  scheduleFetch(dataType, stockKey) {
    // Define which fetch method is used based on data type.
    const fetchMethod = {
      'priceUpdates': async () => await stockApi.getLatestPrice(stockKey),
      'historicalData': async () => {
        const options = { interval: '1d', period: '6mo' };
        return await stockApi.getHistoricalData(stockKey, options);
      },
      'processedData': async () => await stockApi.getProcessedStockData(stockKey),
      'predictionData': async () => await stockApi.getBestPrediction(stockKey)
    };
    
    setTimeout(async () => {
      try {
        const data = await fetchMethod[dataType]();
        const cacheKey = this.getCacheKey(dataType, stockKey);
        this.stockCache.set(cacheKey, data);
        this.notifyListeners(dataType, stockKey, data);
      } catch (error) {
        console.error(`Error fetching ${dataType} for ${stockKey}:`, error);
      }
    }, 0);
  }
  
  // Notify all listeners of a specific data type for a stock.
  notifyListeners(dataType, stockKey, data) {
    if (this.listeners[dataType].has(stockKey)) {
      this.listeners[dataType].get(stockKey).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener callback for ${dataType} ${stockKey}:`, error);
        }
      });
    }
  }
  
  // Get the cache key for a specific data type and stock.
  getCacheKey(dataType, stockKey) {
    const typePrefix = {
      'priceUpdates': 'price_',
      'historicalData': 'history_',
      'processedData': 'processed_',
      'predictionData': 'prediction_'
    };
    
    return `${typePrefix[dataType]}${stockKey}`;
  }
  
  // Check if there are any listeners for a specific stock.
  hasAnyListenersForStock(stockKey) {
    return Object.keys(this.listeners).some(dataType => 
      this.listeners[dataType].has(stockKey) && 
      this.listeners[dataType].get(stockKey).size > 0
    );
  }
  
  // Stop polling for a specific stock.
  stopPollingForStock(stockKey) {
    if (this.pollingTimers.has(stockKey)) {
      clearInterval(this.pollingTimers.get(stockKey));
      this.pollingTimers.delete(stockKey);
    }
  }
  
  // Clean up all of the resources
  cleanup() {
    // Clear polling timers.
    for (const timer of this.pollingTimers.values()) {
      clearInterval(timer);
    }
    this.pollingTimers.clear();
    
    // Clear the main polling interval.
    if (this.mainPollingInterval) {
      clearInterval(this.mainPollingInterval);
    }
    
    // Clear all of the listeners.
    Object.keys(this.listeners).forEach(dataType => {
      this.listeners[dataType].clear();
    });
    
    // Clear the cache.
    this.stockCache.clear();
  }
}

// Exporting the class
export default RealTimeDataService; 