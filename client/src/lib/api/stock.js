import { API_BASE_URL } from '../utils/constants';
import { handleApiError } from './utils';

export const stockApi = {
    getAllStocks: async () => {
        try {   
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
                     
            const response = await fetch(`${API_BASE_URL}/stock`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw { 
                    status: response.status,
                    message: data.message || 'Failed to fetch stocks'
                };
            }
            
            return data;
        } catch (error) {
            console.error('Get all stocks error:', error);
            throw error;
        }
    },
    
    // Get stock details by stock key.
    getStockDetails: async (stockKey) => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                return { name: `Stock ${stockKey}`, sector: 'Unknown' };
            }
            
            const upperStockKey = stockKey.toUpperCase();
            
            console.log(`Fetching stock details for: ${upperStockKey}`);
            
            const response = await fetch(`${API_BASE_URL}/stock/${upperStockKey}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                redirect: 'follow'
            });
            
            if (!response.ok) {
                console.error('Error response from stock API:', response.status, response.statusText);
                return { name: `Stock ${upperStockKey}`, sector: 'Unknown' };
            }
            
            const stockData = await response.json();
            console.log('Stock details:', stockData);
            
            return stockData;
        } catch (error) {
            console.error('Error fetching stock details:', error);
            return { name: `Stock ${stockKey}`, sector: 'Unknown' };
        }
    },
    
    // Get the latest price for a stock.

    getLatestPrice: async (stockKey) => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                return { latest_price: 0, change_percent: 0 };
            }
            
            const upperStockKey = stockKey.toUpperCase();
            
            const response = await fetch(`${API_BASE_URL}/stock/latest_price/${upperStockKey}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw { 
                    status: response.status,
                    message: data.message || `Failed to fetch latest price for ${upperStockKey}`
                };
            }
            
            return data;
        } catch (error) {
            console.error(`Get latest price error for ${stockKey}:`, error);
            return { latest_price: 0, change_percent: 0 };
        }
    },
    
    // Get the historical data for a stock.
    getHistoricalData: async (stockKey, options = {}) => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            const upperStockKey = stockKey.toUpperCase();
            
            console.log(`Fetching historical data for: ${upperStockKey}`, options);
            
            const response = await fetch(`${API_BASE_URL}/histstock/historicdata`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    stock_key: upperStockKey,
                    start_date: options.start_date,
                    end_date: options.end_date,
                    interval: options.interval,
                    limit: options.limit || 100
                }),
                redirect: 'follow'
            });
            
            if (!response.ok) {
                console.error('Error response from historical data API:', response.status, response.statusText);
                throw await handleApiError(response);
            }
            
            const historicalData = await response.json();
            console.log('Historical data:', historicalData);
            
            return historicalData;
        } catch (error) {
            console.error('Error fetching historical data:', error);
            throw error;
        }
    },
    
    // Get the best prediction for a stock.
    getBestPrediction: async (stockKey) => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            const upperStockKey = stockKey.toUpperCase();
            
            console.log(`Fetching prediction for: ${upperStockKey}`);
            
            const response = await fetch(`${API_BASE_URL}/stock/best_prediction/${upperStockKey}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                redirect: 'follow'
            });
            
            if (!response.ok) {
                console.error('Error response from prediction API:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Response body:', errorText);
                throw new Error(`Failed to fetch prediction data: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Received prediction data:', data);
            return data;
        } catch (error) {
            console.error('Error fetching prediction:', error);
            throw error;
        }
    },
    
    // Run the ML pipeline for a stock to generate predictions.
    runMLPipeline: async (stockKey, predictionOnly = false) => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            const upperStockKey = stockKey.toUpperCase();
            
            console.log(`Running ML pipeline for: ${upperStockKey}, prediction only: ${predictionOnly}`);
            
            const response = await fetch(`${API_BASE_URL}/stock/automate_ml_pipeline`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    stocks: [upperStockKey],
                    prediction_only: predictionOnly,
                    max_workers: 3
                }),
                redirect: 'follow'
            });
            
            if (!response.ok) {
                console.error('Error response from ML pipeline API:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Response body:', errorText);
                throw new Error(`Failed to run ML pipeline: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('ML pipeline results:', data);
            return data;
        } catch (error) {
            console.error('Error running ML pipeline:', error);
            throw error;
        }
    },

    // Buy stock.
    buyStock: async (userId, stockKey, quantity) => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            const upperStockKey = stockKey.toUpperCase();
            
            console.log(`Buying ${quantity} shares of ${upperStockKey} for user ${userId}`);
            
            const response = await fetch(`${API_BASE_URL}/stock/buy_stock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: userId,
                    stock_key: upperStockKey,
                    quantity: quantity
                }),
                redirect: 'follow'
            });
            
            if (!response.ok) {
                console.error('Error response from buy stock API:', response.status, response.statusText);
                throw await handleApiError(response);
            }
            
            const result = await response.json();
            console.log('Buy stock result:', result);
            
            return result;
        } catch (error) {
            console.error('Error buying stock:', error);
            throw error;
        }
    },

    // Sell stock.

    sellStock: async (userId, stockKey, quantity) => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            const upperStockKey = stockKey.toUpperCase();
            
            console.log(`Selling ${quantity} shares of ${upperStockKey} for user ${userId}`);
            
            const response = await fetch(`${API_BASE_URL}/stock/sell_stock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: userId,
                    stock_key: upperStockKey,
                    quantity: quantity
                }),
                redirect: 'follow'
            });
            
            if (!response.ok) {
                console.error('Error response from sell stock API:', response.status, response.statusText);
                throw await handleApiError(response);
            }
            
            const result = await response.json();
            console.log('Sell stock result:', result);
            
            return result;
        } catch (error) {
            console.error('Error selling stock:', error);
            throw error;
        }
    },

    // Get processed stock data with technical indicators
    getProcessedStockData: async (stockKey) => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            const upperStockKey = stockKey.toUpperCase();
            
            console.log(`Fetching processed data for: ${upperStockKey}`);
            
            const response = await fetch(`${API_BASE_URL}/histstock/processed_data/${upperStockKey}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                redirect: 'follow'
            });
            
            if (!response.ok) {
                console.error('Error response from processed data API:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Response body:', errorText);
                throw new Error(`Failed to fetch processed data: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Received processed data:', data);
            
            //Ensures we handle both array and object formats.
            if (Array.isArray(data)) {
                console.log(`Received ${data.length} processed data items as array`);
                return data;
            } else {
                console.log('Received processed data as object');
                return [data]; //Wraps in an array for consistent handling.
            }
        } catch (error) {
            console.error('Error fetching processed stock data:', error);
            throw error;
        }
    },

    // Search for the stocks by name or symbol.
    searchStocks: async (query) => {
        try {
            // First try to get stocks from the cache or API.
            // And then use the getStockSymbolsForSuggestions which has caching built in.
            let allStocks = [];
            
            try {
                allStocks = await stockApi.getStockSymbolsForSuggestions();
            } catch (error) {
                console.error('Error fetching stocks for search:', error);
                return [];
            }
            
            if (!query || !query.trim()) {
                return [];
            }
            
            // Filter the stocks by query.
            const formattedQuery = query.toLowerCase().trim();
            
            const filteredStocks = allStocks.filter(stock => 
                stock.stock_key.toLowerCase().includes(formattedQuery) || 
                stock.name.toLowerCase().includes(formattedQuery)
            );
            
            const limitedStocks = filteredStocks.slice(0, 10);
            
            //Fetch additional details for each stock to get the sector information.
            const enhancedStocks = await Promise.all(
                limitedStocks.map(async (stock) => {
                    try {
                        //Get the stock details which includes sector information.
                        const details = await stockApi.getStockDetails(stock.stock_key);
                        
                        return {
                            symbol: stock.stock_key,
                            name: stock.name,
                            sector: details.sector || 'Unknown',
                            type: 'stock'
                        };
                    } catch (error) {
                        console.error(`Error fetching sector for ${stock.stock_key}:`, error);
                        return {
                            symbol: stock.stock_key,
                            name: stock.name,
                            sector: 'Unknown',
                            type: 'stock'
                        };
                    }
                })
            );
            
            return enhancedStocks;
        } catch (error) {
            console.error('Stock search error:', error);
            return [];
        }
    },

    // Get the stock symbols for auto-suggestions with the catching.
    getStockSymbolsForSuggestions: (() => {
        let cachedSymbols = null;
        let lastFetchTime = 0;
        const CACHE_DURATION = 15 * 60 * 1000;
        
        return async () => {
            const currentTime = Date.now();
            
            // Use the cached data if available and not expired.
            if (cachedSymbols && (currentTime - lastFetchTime < CACHE_DURATION)) {
                return cachedSymbols;
            }
            
            try {
                const stocks = await stockApi.getAllStocks();
                
                // Formatting stocks for suggestions display.
                cachedSymbols = stocks.map(stock => ({
                    stock_key: stock.stock_key,
                    name: stock.name,
                    label: `${stock.stock_key} - ${stock.name}`,
                    type: 'stock'
                }));
                
                lastFetchTime = currentTime;
                return cachedSymbols;
            } catch (error) {
                console.error('Error fetching stock symbols for suggestions:', error);
                return cachedSymbols || [];
            }
        };
    })(),

    // Terminate an ongoing ML pipeline process for a stock.
    terminateMLPipeline: async (stockKey) => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            const upperStockKey = stockKey.toUpperCase();
            
            console.log(`Requesting termination of ML pipeline for: ${upperStockKey}`);
            
            const response = await fetch(`${API_BASE_URL}/stock/terminate_ml_pipeline`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    stock_key: upperStockKey
                }),
                redirect: 'follow'
            });
            
            if (!response.ok) {
                console.error('Error response from ML pipeline termination API:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Response body:', errorText);
                throw new Error(`Failed to terminate ML pipeline: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('ML pipeline termination results:', data);
            return data;
        } catch (error) {
            console.error('Error terminating ML pipeline:', error);
            throw error;
        }
    },

    // Update batch stock data within 5 minute.
    updateBatchStockData: async () => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            const response = await fetch(`${API_BASE_URL}/stock/update_batch_stock_data`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to update batch stock data');
            }
            
            return data;
        } catch (error) {
            console.error('Error updating batch stock data:', error);
            return handleApiError(error);
        }
    },
    
    // Process the historical batch data.
    processHistoricalBatch: async () => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            console.log('Starting historical batch processing...');
            
            const response = await fetch(`${API_BASE_URL}/stock/process_historical_batch`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || `Failed to process historical batch data: ${response.status} ${response.statusText}`;
                console.error(errorMessage);
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            console.log('Historical batch processing completed successfully:', data);
            
            return data;
        } catch (error) {
            console.error('Error processing historical batch data:', error);
            throw error;
        }
    }
}; 