import { stockApi } from '../lib/api';
import { API_BASE_URL } from '../lib/utils/constants';
import { eventBus } from '../lib/eventBus';

/**
 * StockDataRefreshManager
 * This manages the automatic refreshing of stock data according to 5-minute candles.
 * The initial data is still loaded by components as normal, which then the service
 * handles automatic updates on 5-minute candles. When a new candle is available,
 * we fetch the new data triggering the backend batch updates only during market hours. The component
 * subscribes for specific stock and then manually updates capabilities for user-initiated refreshes
 */


// This is the main service that handles the automatic refreshing of stock data according to 5-minute candles.
//It also handles the manual triggering of batch updates.
class StockDataRefreshManager {
  constructor(realTimeDataService, marketScheduler) {
    this.realTimeDataService = realTimeDataService;
    this.marketScheduler = marketScheduler;
    
    // Init flags.
    this.lastBatchUpdateTime = null;
    this._batchUpdateInProgress = false;
    
    // Check for the state consistency immediately.
    setTimeout(() => {
      this._ensureConsistentBatchState();
    }, 1000);
    
    // Define the data types we handle.
    this.dataTypes = ['price', 'historical', 'processed', 'prediction'];
    
    // Cache for the last update times,initialize all data types needed with empty objects.
    this.lastUpdateTimes = {};
    this.dataTypes.forEach(type => {
      this.lastUpdateTimes[type] = {};
    });
    
    // The subscribers for different data type with empty objects.
    this.subscribers = {};
    this.dataTypes.forEach(type => {
      this.subscribers[type] = {};
    });
    // The polling interval id, configuration and endpoint. We check every 3 seconds to ensure we don't miss the window.
    this.pollingIntervalId = null;
    this.checkInterval = 3 * 1000;
    this.isPolling = false;
    
    // This then triggers the batch update endpoint.
    this.batchUpdateEndpoint = `${API_BASE_URL}/stock/update_batch_stock_data`;
    
    console.log('StockDataRefreshManager initialized with data types:', this.dataTypes);
  }
  
  // Automatic polling.
  startPolling() {
    if (this.isPolling) return;
    
    console.log('StockDataRefreshManager: Starting polling');
    this.isPolling = true;
    
    this.pollingIntervalId = setInterval(() => {
      this.checkForUpdates();
    }, this.checkInterval);
    
    // Check for updates immediately.
    this.checkForUpdates();
  }
  
  // Stop the polling.
  stopPolling() {
    if (!this.isPolling) return;
    
    console.log('StockDataRefreshManager: Stopping polling');
    this.isPolling = false;
    
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
  }
  
  // Check if the data should be updated based on 5-minute candle intervals.
  checkForUpdates() {
    // Poll if market is open, or it's been less than 5 minutes since the market closed.
    const marketStatus = this.marketScheduler.getMarketStatus();
    const now = new Date();
    
    let shouldPoll = marketStatus.is_market_open;
    
    if (!shouldPoll && marketStatus.current_time_et) {
      const etNow = new Date(marketStatus.current_time_et);
      const etHour = etNow.getHours();
      const etMinute = etNow.getMinutes();
      
      if (etHour === 16 && etMinute < 5) {
        shouldPoll = true;
      }
    }
    
    if (!shouldPoll) {
      return;
    }

    // Checks if there should be a batch update trigger from the API.
    this.checkAndTriggerBatchUpdate();
    
    // If a batch update is completed, skip the individual updates.
    if (this.lastBatchUpdateTime && (now - this.lastBatchUpdateTime) < 60000) {
      const secondsAgo = Math.floor((now - this.lastBatchUpdateTime) / 1000);
      
      console.log(`Recent batch update detected (${secondsAgo}s ago at ${this.lastBatchUpdateTime.toLocaleTimeString()}), skipping individual data updates`);
      
      // Verify for a valid batch update
      const batchUpdateCompleted = this.realTimeDataService.isBatchUpdateCompleted();
      if (!batchUpdateCompleted) {
        console.warn('WARNING: Batch update timestamp exists but realTimeDataService shows batch not completed - possible state mismatch');
      }
      
      return;
    }
    
    // Check if there were updates for each data type and stocks.
    this.checkDataTypeForUpdates('price');
    this.checkDataTypeForUpdates('historical');
    this.checkDataTypeForUpdates('processed');
    this.checkDataTypeForUpdates('prediction');
  }
  
  // Ensures the batch update state is consistent between services
  //This helps detect and log problems where one service thinks a batch update.
  _ensureConsistentBatchState() {
    // Check for the RealTimeDataService function's availability.
    if (!this.realTimeDataService) {
      console.warn('RealTimeDataService not available for consistency check');
      return;
    }
    
    try {
      const now = new Date();
      
      // Get the current states
      const hasStockManagerTimestamp = !!this.lastBatchUpdateTime;
      const isRecentBatchUpdate = this.realTimeDataService.wasRecentlyBatchUpdated(300); // 5 minutes
      
      //Detect if there is a state mismatch.
      const mismatch1 = hasStockManagerTimestamp && !isRecentBatchUpdate;
      const mismatch2 = !hasStockManagerTimestamp && isRecentBatchUpdate;
      
      if (mismatch1 || mismatch2) {
        console.warn('Detected state mismatch between services:');
        console.warn(`- StockDataRefreshManager has timestamp: ${hasStockManagerTimestamp ? 'YES' : 'NO'}`);
        console.warn(`- RealTimeDataService shows recent: ${isRecentBatchUpdate ? 'YES' : 'NO'}`);
        
        //Take action if theres been a too long period since the last update. Preventing aggressive resets.
        if (hasStockManagerTimestamp) {
          try {
            const lastUpdateDate = new Date(this.lastBatchUpdateTime);
            const diffMs = now.getTime() - lastUpdateDate.getTime();
            const minutesAgo = Math.floor(diffMs / (1000 * 60));
            
            if (minutesAgo > 30) {
              console.warn(`Last batch update was ${minutesAgo} minutes ago - resetting state`);
              //Reset only if it's been over 30 minutes.
              this.lastBatchUpdateTime = null;
              this.realTimeDataService.resetBatchUpdateStatus();
            } 
          } catch (e) {
            console.warn(`Invalid timestamp: ${this.lastBatchUpdateTime} - resetting state`);
            this.lastBatchUpdateTime = null;
            this.realTimeDataService.resetBatchUpdateStatus();
          }
        }
      }
    } catch (error) {
      console.error('Error in _ensureConsistentBatchState:', error);
    }
  }
  
  // Check if there should be a batch update based on the current time and the time since the last batch update.
  async checkAndTriggerBatchUpdate() {
    try {
      // Ensures consistency between the services.
      this._ensureConsistentBatchState();
      
      // Make sure we're not in the middle of an update.
      if (this._batchUpdateInProgress) {
        return;
      }
      
      // This gets the current time in US Eastern Time during open market hours.
      const now = new Date();
      const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const etHour = etNow.getHours();
      const etMinute = etNow.getMinutes();
      const etSeconds = etNow.getSeconds();
      
      // Initialize the lastBatchUpdateTime if its null.
      if (!this.lastBatchUpdateTime) {
        this.lastBatchUpdateTime = new Date(0).toISOString();
        console.log('Initializing lastBatchUpdateTime to epoch time');
      }
      
      try {
        const lastUpdateDate = new Date(this.lastBatchUpdateTime);
        
        // Check if the lastBatchUpdateTime is valid.
        if (isNaN(lastUpdateDate.getTime())) {
          console.warn(`Invalid lastBatchUpdateTime: ${this.lastBatchUpdateTime}, resetting to 6 minutes ago`);
          const sixMinutesAgo = new Date(now.getTime() - 6 * 60 * 1000);
          this.lastBatchUpdateTime = sixMinutesAgo.toISOString();
        }
      } catch (error) {
        console.error('Error parsing lastBatchUpdateTime:', error);
        // Resets to a safe value.
        const sixMinutesAgo = new Date(now.getTime() - 6 * 60 * 1000);
        this.lastBatchUpdateTime = sixMinutesAgo.toISOString();
      }
      
      // Calculates the time since last batch update
      let minutesSinceLastUpdate;
      try {
        const lastUpdateDate = new Date(this.lastBatchUpdateTime);
        const diffMs = now.getTime() - lastUpdateDate.getTime();
        minutesSinceLastUpdate = Math.floor(diffMs / (1000 * 60));
        
        // Log all suspicious values, reset i f needed.
        if (minutesSinceLastUpdate < 0 || minutesSinceLastUpdate > 12 * 60) { // More than 12 hours is suspicious
          console.warn(`Suspicious last batch update time detected (${minutesSinceLastUpdate} mins ago), resetting to 6 minutes ago`);
          const sixMinutesAgo = new Date(now.getTime() - 6 * 60 * 1000);
          this.lastBatchUpdateTime = sixMinutesAgo.toISOString();
          minutesSinceLastUpdate = 6;
          this.realTimeDataService.resetBatchUpdateStatus();
        }
      } catch (error) {
        console.error('Error calculating minutes since last update:', error);
        minutesSinceLastUpdate = 99999; // Force an update here.
      }
      
      console.log(`Current ET time: ${etHour}:${etMinute}:${etSeconds}, Minutes since last batch update: ${minutesSinceLastUpdate}`);
      
      // Determines if we should trigger a batch update.
      let shouldTriggerUpdate = false;
      let isForced = false;
      
      // Check if we are within market hours.
      if (this.marketScheduler.isMarketOpen()) {
        // Check if we are at the start of a new 5-minute interval.
        // There should be a trigger on the update within a window of 2-10 seconds after the interval starts
        const isNewInterval = etMinute % 5 === 0 && etSeconds >= 2 && etSeconds <= 10;
        
        if (isNewInterval) {
          console.log('We are at a 5-minute interval boundary with the 2-10 second trigger window');
          
          // Only skip if theres already updated in this exact 5-minute interval by checking if the last update was within the past 4 minutes
          if (minutesSinceLastUpdate >= 4 || isNewInterval) {
            shouldTriggerUpdate = true;
            console.log(`Triggering batch update in 5-minute interval: ${etHour}:${etMinute}`);
            
            // If it's been more than 7 minutes, log it as a forced update.
            if (minutesSinceLastUpdate >= 7) {
              isForced = true;
            }
          } else {
            console.log(`Skipping batch update: already updated ${minutesSinceLastUpdate} mins ago in this interval`);
          }
        }
        // This is the failsafe trigger. If we haven't updated in 10+ minutes, and we're at a 5-minute mark within the window.
        else if (minutesSinceLastUpdate >= 10 && etMinute % 5 === 0 && etSeconds >= 2 && etSeconds <= 10) {
          console.log('Triggering failsafe batch update due to elapsed time');
          shouldTriggerUpdate = true;
          isForced = true;
        }
      }
      
      if (shouldTriggerUpdate) {
        // Set a flag to prevent concurrent updates.
        this._batchUpdateInProgress = true;
        
        // Create a timestamp for this batch update attempt but don't set it as the lastBatchUpdateTime until we confirm success.
        const batchUpdateRequestTime = new Date();
        
        if (isForced) {
          console.log(`Force triggering batch update - last update was ${minutesSinceLastUpdate} minutes ago (at ${etNow.toLocaleTimeString()} ET)`);
        } else {
          console.log(`Triggering batch update at ${etNow.toLocaleTimeString()} ET for the ${etHour}:${etMinute} interval (${etSeconds}s past interval)`);
        }
        
        try {
          // Resets batch update status before starting.
          this.realTimeDataService.resetBatchUpdateStatus();
          
          // Calls the batch update endpoint.
          const token = localStorage.getItem('accessToken');
          
          if (!token) {
            console.error('No access token found for batch update');
            this._batchUpdateInProgress = false;
            return;
          }
          
          const response = await fetch(this.batchUpdateEndpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              // Add a flag to instruct backend not to insert any duplicate data.
              preventDuplicates: true,
              currentInterval: `${etHour}:${etMinute}`,
              // Adding timestamp helps with debugging
              clientTimestamp: now.toISOString()
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Batch update failed: ${response.status} ${errorText}`);
          }
          
          const result = await response.json();
          console.log(isForced ? 'Batch update successful (force triggered):' : 'Batch update successful:', result);
          
          // Update the last batch update time.
          this.lastBatchUpdateTime = batchUpdateRequestTime.toISOString();
          console.log(`Batch update request completed at ${batchUpdateRequestTime.toISOString()}`);
          
          // Wait for the backend to finish processing, this takes an average of 19 seconds due to yfinance's API limitations. There is a 2 second buffer.
          const waitTime = 18000 + Math.floor(Math.random() * 3000);
          console.log(`Waiting ${waitTime/1000}s for backend processing to complete before marking batch update as completed...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Mark the batch update as completed after waiting for backend processing.
          this.realTimeDataService.markBatchUpdateCompleted();
          
          // Then notify that a batch update has completed
          eventBus.publish('batchUpdateCompleted', {
            timestamp: new Date().toISOString()
          });
          
          // Then fetch the updated data now that the batch update is complete
          this.realTimeDataService.updateAllStockData();
          
          this._batchUpdateInProgress = false;
          
          // Notify the subscribers after data is updated
          console.log('Notifying subscribers that batch update is complete');
          this.notifyAllSubscribers();
        } catch (error) {
          console.error('Error triggering batch update:', error);
          // Reset batch updates status on an error
          this.realTimeDataService.resetBatchUpdateStatus();
          // Don't set lastBatchUpdateTime since the update failed, clearing the in progress flag.
          this._batchUpdateInProgress = false;
        }
      }
    } catch (error) {
      console.error('Error checking batch update time:', error);
      // Clears the in progress flag.
      this._batchUpdateInProgress = false;
    }
  }
  
  // Notify all subscribers that new data is available. This is called after a successful batch update and delay.
  //We notify the data type's subscribers and limit the calls to avoid overloading the API.
  notifyAllSubscribers() {
    let totalCalls = 0;
    const maxCallsPerBatch = 15;
    
    try {
      // Prioritize the types for updating. Put price data first.
      const prioritizedTypes = ['price', 'historical', 'processed', 'prediction'];
      
      // Collect all of the stocks that need updating via stock keys.
      const stocksToUpdate = new Map();
      
      for (const dataType of prioritizedTypes) {
        const stocks = Object.keys(this.subscribers[dataType]);
        
        for (const stockKey of stocks) {
          if (this.subscribers[dataType][stockKey]?.length > 0) {
            if (!stocksToUpdate.has(stockKey)) {
              stocksToUpdate.set(stockKey, []);
            }
            stocksToUpdate.get(stockKey).push(dataType);
          }
        }
      }
      
      console.log(`Found ${stocksToUpdate.size} unique stocks to update after batch update`);
      
      // Process the updates, ensuring each stock is only handled once.
      //We update the price since it is the most important, and then the other data types
      //If there is capacity.
      for (const [stockKey, dataTypes] of stocksToUpdate.entries()) {
        if (totalCalls < maxCallsPerBatch) {
          if (dataTypes.includes('price')) {
            this.fetchAndUpdateData('price', stockKey);
            totalCalls++;
          }
          
          for (const dataType of dataTypes) {
            if (dataType !== 'price' && totalCalls < maxCallsPerBatch) {
              this.fetchAndUpdateData(dataType, stockKey);
              totalCalls++;
            }
          }
        } else {
          console.log(`Skipping updates for ${stockKey} - reached max calls per batch (${maxCallsPerBatch})`);
        }
      }
      
      console.log(`Batch update notification complete - updated ${totalCalls} subscriptions`);
    } catch (error) {
      console.error('Error in notifyAllSubscribers:', error);
    }
  }
  
  // Check if a specific data type needs updating for subscribed stocks
  checkDataTypeForUpdates(dataType) {
    const now = new Date();
    const stocks = Object.keys(this.subscribers[dataType]);
    
    stocks.forEach(stockKey => {
      // Only update it if we have subscribers.
      if (this.subscribers[dataType][stockKey]?.length > 0) {
        // Get the last update time
        const lastUpdateValue = this.lastUpdateTimes[dataType][stockKey];
        
        // Always fetch the data if the stock hasn't been updated before.
        if (!lastUpdateValue) {
          console.log(`No previous update time for ${dataType}/${stockKey}, fetching data...`);
          this.fetchAndUpdateData(dataType, stockKey);
          return;
        }
        
        try {
          // Safely gets the date values. Defaults otherwise to old values that will trigger an update.
          const lastUpdateDate = lastUpdateValue instanceof Date ? lastUpdateValue : new Date(0);
          const lastMinutes = lastUpdateDate.getMinutes();
          const lastHours = lastUpdateDate.getHours();
          const lastDay = lastUpdateDate.getDate();
          
          // Calculates the time since last update.
          const minutesSinceLastUpdate = Math.floor((now - lastUpdateDate) / (1000 * 60));
          
          // Checks for the new 5 minute interval.
          const isNewFiveMinInterval = Math.floor(now.getMinutes() / 5) !== Math.floor(lastMinutes / 5) || 
                                      now.getHours() !== lastHours ||
                                      now.getDate() !== lastDay;
          
          // Updates if in a new 5 minute period, and it's been at least 1 minute since the last update.
          if (isNewFiveMinInterval && minutesSinceLastUpdate >= 1) {
            console.log(`New 5-minute interval detected for ${dataType}/${stockKey}, fetching data...`);
            this.fetchAndUpdateData(dataType, stockKey);
          }
        } catch (error) {
          console.error(`Error checking update time for ${dataType}/${stockKey}:`, error);
          this.lastUpdateTimes[dataType][stockKey] = null;
          this.fetchAndUpdateData(dataType, stockKey);
        }
      }
    });
  }
  
  // Fetch new data to notify the subscribers.

  async fetchAndUpdateData(dataType, stockKey) {
    try {
      console.log(`StockDataRefreshManager: Fetching new ${dataType} data for ${stockKey}`);
      
      let data;
      
      // Fetching the appropriate data based on data type. The params are the same as the
      //initial load.
      switch (dataType) {
        case 'price':
          data = await stockApi.getLatestPrice(stockKey);
          break;
        case 'historical':
          const historicalOptions = { limit: 100 };
          data = await stockApi.getHistoricalData(stockKey, historicalOptions);
          break;
        case 'processed':
          data = await stockApi.getProcessedStockData(stockKey);
          break;
        case 'prediction':
          data = await stockApi.getBestPrediction(stockKey);
          break;
        default:
          throw new Error(`Unknown data type: ${dataType}`);
      }
      
      // Ensuring the data type object exists.
      this.lastUpdateTimes[dataType] = this.lastUpdateTimes[dataType] || {};
      
      // Updates last fetch time with a new date objectt
      const updateTime = new Date();
      this.lastUpdateTimes[dataType][stockKey] = updateTime;
      console.log(`Updated last fetch time for ${dataType}/${stockKey} to ${updateTime.toISOString()}`);
      
      // Notifies the subscribers
      this.notifySubscribers(dataType, stockKey, data);
      
      return data;
    } catch (error) {
      console.error(`StockDataRefreshManager: Error fetching ${dataType} data for ${stockKey}:`, error);
      return null;
    }
  }
  
  // Notifies the subscribers of new data
  notifySubscribers(dataType, stockKey, data) {
    const subscribers = this.subscribers[dataType][stockKey] || [];
    
    subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`StockDataRefreshManager: Error in subscriber callback:`, error);
      }
    });
  }
  
  // Subscribe to updates for a specific data type and stock key.
  subscribe(dataType, stockKey, callback) {
    // Initializes the subscribers array for the data type and stock if it doesn't exist.
    this.subscribers[dataType] = this.subscribers[dataType] || {};
    if (!this.subscribers[dataType][stockKey]) {
      this.subscribers[dataType][stockKey] = [];
      
      // Initializes the the lastupdatetTimes for this data type and stock key
      this.lastUpdateTimes[dataType] = this.lastUpdateTimes[dataType] || {};
      
      // Don't set an initial lastUpdateTime in order to not trigger immediate data fetch when checkDataTypeForUpdates is called.
      console.log(`New subscription for ${dataType}/${stockKey}, initialized structure`);
    }
    
    this.subscribers[dataType][stockKey].push(callback);
    console.log(`Added subscriber for ${dataType}/${stockKey}, now has ${this.subscribers[dataType][stockKey].length} subscriber(s)`);
    
    // Start the polling if we have subscribers.
    if (!this.isPolling) {
      this.startPolling();
    }
    
    // Return the unsubscribe function.
    return () => {
      this.unsubscribe(dataType, stockKey, callback);
    };
  }
  
  // Unsubscribe from the updates.
  unsubscribe(dataType, stockKey, callback) {
    if (!this.subscribers[dataType][stockKey]) return;
    
    // Removes the callback
    this.subscribers[dataType][stockKey] = this.subscribers[dataType][stockKey]
      .filter(cb => cb !== callback);
    
    // Cleans up if no subscribers left for this stock
    if (this.subscribers[dataType][stockKey].length === 0) {
      delete this.subscribers[dataType][stockKey];
    }
    
    // Stops the polling if no subscribers left
    if (this.getTotalSubscriberCount() === 0) {
      this.stopPolling();
    }
  }
  
  // Get the total number of subscribers across all the data types

  getTotalSubscriberCount() {
    let count = 0;
    
    Object.keys(this.subscribers).forEach(dataType => {
      Object.keys(this.subscribers[dataType]).forEach(stockKey => {
        count += this.subscribers[dataType][stockKey].length;
      });
    });
    
    return count;
  }
  
  // Manually trigger a refresh for a specific stock and data type

  async refreshData(dataType, stockKey) {
    return await this.fetchAndUpdateData(dataType, stockKey);
  }
  
  // Records a manual update to prevent the duplicate refreshes

  recordManualUpdate(dataType, stockKey) {
    // Always ensures a valid Date object is stored
    try {
      this.lastUpdateTimes[dataType] = this.lastUpdateTimes[dataType] || {};
      this.lastUpdateTimes[dataType][stockKey] = new Date();
      console.log(`Manual update recorded for ${dataType}/${stockKey} at ${this.lastUpdateTimes[dataType][stockKey].toISOString()}`);
    } catch (error) {
      console.error(`Error recording manual update for ${dataType}/${stockKey}:`, error);
      // Initializes if there was an error
      this.lastUpdateTimes[dataType] = this.lastUpdateTimes[dataType] || {};
      this.lastUpdateTimes[dataType][stockKey] = new Date();
    }
  }
  
  // Manually trigger a batch update on demand.
  async manualTriggerBatchUpdate() {
    try {
      // Ensure the API is in not in the middle of another update.
      if (this._batchUpdateInProgress) {
        console.log('Batch update already in progress, skipping this request');
        return false;
      }
      this._batchUpdateInProgress = true;
      
      console.log('Manually triggering batch update...');
      
      // Calls the backend API to initiates the batch update
      const result = await fetch('/api/update_batch_stock_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString()
        }),
      });
      
      if (result.ok) {
        console.log('Manual batch update successful:', result);
        
        // Waits for the backend to finish processing, ensuring we wait long enough for backend processing to complete.
        // Since the backend takes about 19 seconds, we add a 3 second buffer.
        const waitTime = 18000 + Math.floor(Math.random() * 3000);
        console.log(`Waiting ${waitTime/1000}s for backend processing to complete before fetching updated data...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Updates last batch update time.
        const now = new Date();
        this.lastBatchUpdateTime = now.toISOString();
        
        // Marks the batch update as completed in RealTimeDataService.
        this.realTimeDataService.markBatchUpdateCompleted();
        
        // Fetches updated data after batch update completes.
        this.realTimeDataService.updateAllStockData();
        
        this._batchUpdateInProgress = false;
        return true;
      } else {
        console.error('Manual batch update failed:', await result.text());
        this._batchUpdateInProgress = false;
        return false;
      }
    } catch (error) {
      console.error('Error in manual batch update:', error);
      this._batchUpdateInProgress = false;
      return false;
    }
  }
}

// Exports the class directly.
export default StockDataRefreshManager; 