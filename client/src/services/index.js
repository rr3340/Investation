// The services must be initialized in the correct order to avoid circular dependencies.
import marketScheduler from './MarketScheduler';
import RealTimeDataServiceClass from './RealTimeDataService';
import StockDataRefreshManagerClass from './StockDataRefreshManager';

// Initialize these services in the correct order with the existing marketScheduler instance.
const realTimeDataService = new RealTimeDataServiceClass(marketScheduler);

const stockDataRefreshManager = new StockDataRefreshManagerClass(
  realTimeDataService,
  marketScheduler
);

// Then export the initialized instances
export {
  marketScheduler,
  realTimeDataService,
  stockDataRefreshManager
}; 