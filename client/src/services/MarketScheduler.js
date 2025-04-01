import { stockApi } from '../lib/api';

class MarketScheduler {
  constructor() {
    this.isRunning = false;
    this.updateTimer = null;
    this.lastUpdateTime = null;
  }

  // Starts the scheduler.
  start() {
    if (this.isRunning) {
      console.log('Market scheduler already running');
      return;
    }

    this.isRunning = true;
    this.scheduleNextUpdate();
    console.log('US market scheduler started');
  }

  // Stops the scheduler.
  stop() {
    if (!this.isRunning) {
      return;
    }

    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    
    this.isRunning = false;
    console.log('US market scheduler stopped');
  }

  // Schedules the next update.
  scheduleNextUpdate() {
    if (!this.isRunning) {
      return;
    }

    const now = new Date();
    const nextUpdateTime = this.calculateNextUpdateTime(now);
    const delay = nextUpdateTime - now;

    // Clears any existing timer.
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    // Sets the timer for the next update.
    this.updateTimer = setTimeout(() => {
      this.triggerUpdate();
    }, delay);
  }

  // Calculates the next update time based on US Eastern Time market hours.
  calculateNextUpdateTime(currentTime) {
    const now = currentTime || new Date();
    
    const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    
    // Check if it's a weekday, with 0 and 6 being saturday or sunday.
    const dayOfWeek = etNow.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const daysToMonday = dayOfWeek === 0 ? 1 : 2;
      const nextMonday = new Date(etNow);
      nextMonday.setDate(nextMonday.getDate() + daysToMonday);
      nextMonday.setHours(9, 30, 0, 0);
      
      return this._convertETtoLocal(nextMonday);
    }

    //Checking for market hours.
    const hour = etNow.getHours();
    const minute = etNow.getMinutes();
    
    if (hour < 9 || (hour === 9 && minute < 30)) {
      const marketOpen = new Date(etNow);
      marketOpen.setHours(9, 30, 0, 0);
      return this._convertETtoLocal(marketOpen);
    }
    
    if (hour > 16 || (hour === 16 && minute >= 0)) {
      const tomorrow = new Date(etNow);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 30, 0, 0);
      
      //Handles Friday to Monday.
      if (tomorrow.getDay() === 6) {
        tomorrow.setDate(tomorrow.getDate() + 2);
      }
      
      return this._convertETtoLocal(tomorrow);
    }
    
    // During market hours, calculate the next 5-minute boundary.
    const nextBoundary = Math.ceil(minute / 5) * 5;
    const nextUpdateMinute = nextBoundary === minute ? nextBoundary + 5 : nextBoundary;
    
    // Create the next update time.
    const nextUpdate = new Date(etNow);
    
    if (nextUpdateMinute >= 60) {
      //Handle hour rollovers.
      nextUpdate.setHours(hour + 1, nextUpdateMinute - 60, 0, 0);
    } else {
      nextUpdate.setMinutes(nextUpdateMinute, 0, 0);
    }
    
    // Convert back to the local time.
    return this._convertETtoLocal(nextUpdate);
  }

  // Utility to convert ET time to the local time.
  _convertETtoLocal(etDate) {
    // Converts the ET date to ISO string without the timezone info.
    const etString = etDate.toLocaleString('en-US', { 
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const [datePart, timePart] = etString.split(', ');
    const [month, day, year] = datePart.split('/');
    const [hour, minute, second] = timePart.split(':');
    
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  }

  // Trigger the stock update in a new interval.
  //Update the stock data, and then have a small delay to make sure it is updated before being processed.
  //Then process the historical data. And schedule the next interval no matter if it fails.
  async triggerUpdate() {
    if (!this.isRunning) {
      return;
    }

    try {
      const now = new Date();
      const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      
      console.log(`Triggering stock update at ET: ${etNow.toLocaleTimeString()}`);
      
      // First, update the batch stock data.
      const updateResponse = await stockApi.updateBatchStockData();
      console.log('Stock data update response:', updateResponse);
      
      // Then, wait for 3 seconds to ensure the update is fully processed on the server
      console.log('Waiting for server to process updates before processing historical data...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Then, process the historical data.
      try {
        const processResponse = await stockApi.processHistoricalBatch();
        console.log('Historical data processing response:', processResponse);
      } catch (processingError) {
        console.error('Error processing historical batch data:', processingError);
      }
      
      this.lastUpdateTime = now;
      console.log('Stock update cycle complete at:', now.toLocaleTimeString());
    } catch (error) {
      console.error('Error during stock update cycle:', error);
    } finally {
      this.scheduleNextUpdate();
    }
  }

  // Check if the market is open. US EST.
  isMarketOpen() {
    const now = new Date();
    const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    
    // Checks weekday.
    const dayOfWeek = etNow.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false; // Weekend
    }
    
    // Checks time.
    const hour = etNow.getHours();
    const minute = etNow.getMinutes();
    
    // Before the market opens.
    if (hour < 9 || (hour === 9 && minute < 30)) {
      return false;
    }
    
    // After the market closes.
    if (hour >= 16) {
      return false;
    }
    
    return true;
  }

  // Get the market status information.
  getMarketStatus() {
    const now = new Date();
    const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const isOpen = this.isMarketOpen();
    const nextUpdate = this.calculateNextUpdateTime(now);
    
    // Calculates the minutes to next candle.
    const minutesToNextCandle = isOpen ? 
      Math.ceil((nextUpdate - now) / 60000) : // Converts ms to minutes.
      null;
    
    // Calculate the minutes since market open.
    let minutesSinceOpen = null;
    if (isOpen) {
      const marketOpen = new Date(etNow);
      marketOpen.setHours(9, 30, 0, 0);
      minutesSinceOpen = Math.floor((etNow - marketOpen) / 60000);
    }
    
    return {
      current_time: now.toISOString(),
      current_time_et: etNow.toISOString(),
      is_market_open: isOpen,
      next_update: nextUpdate.toISOString(),
      minutes_to_next_candle: minutesToNextCandle,
      minutes_since_market_open: minutesSinceOpen,
      last_update: this.lastUpdateTime ? this.lastUpdateTime.toISOString() : null
    };
  }
}

// Creates the singleton instance.
const marketScheduler = new MarketScheduler();

// Autostarts the scheduler when imported.
if (process.env.NODE_ENV !== 'test') {
  marketScheduler.start();
  console.log('Market scheduler auto-started on application load');
}

// Exports the singleton instance.
export default marketScheduler; 