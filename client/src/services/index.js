// The services must be initialized in the correct order to avoid circular dependencies.
import marketScheduler from './MarketScheduler';
import RealTimeDataServiceClass from './RealTimeDataService';
import StockDataRefreshManagerClass from './StockDataRefreshManager';

const realTimeDataService = new RealTimeDataServiceClass(marketScheduler);

const stockDataRefreshManager = new StockDataRefreshManagerClass(
  realTimeDataService,
  marketScheduler
);

export {
  marketScheduler,
  realTimeDataService,
  stockDataRefreshManager
}; 