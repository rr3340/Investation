import { API_BASE_URL } from '../utils/constants';
import { handleApiError } from './utils';

// Watchlist API service

export const watchlistApi = {
    
    getUserWatchlist: async (userId) => {
        try {
            const numericUserId = Number(userId);
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                console.error('No access token found');
                return [];
            }
            
            console.log(`Fetching watchlist for user ID: ${numericUserId}`);
            
            // Uses the main watchlist endpoint with trailing slash to avoid redirects.
            const response = await fetch(`${API_BASE_URL}/watchlist/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                redirect: 'follow'
            });
            
            if (!response.ok) {
                console.error('Error response from watchlist API:', response.status, response.statusText);
                return [];
            }
            
            const allWatchlistItems = await response.json();
            console.log('All watchlist items from API:', allWatchlistItems);
            
            const userWatchlistItems = Array.isArray(allWatchlistItems) 
                ? allWatchlistItems.filter(item => Number(item.user_id) === numericUserId)
                : [];
            
            console.log('Filtered watchlist items for user:', userWatchlistItems);
            
            const enrichedWatchlist = await Promise.all(
                userWatchlistItems.map(async (item) => {
                    try {
                        let stockDetails = {};
                        try {
                            const stockData = await fetch(`${API_BASE_URL}/stock/${item.stock_key}`, {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                redirect: 'follow'
                            });
                            
                            if (stockData.ok) {
                                stockDetails = await stockData.json();
                                console.log(`Stock details for ${item.stock_key}:`, stockDetails);
                            } else {
                                console.error(`Error fetching stock details for ${item.stock_key}:`, stockData.status);
                                stockDetails = { name: `Stock ${item.stock_key}`, sector: 'Unknown' };
                            }
                        } catch (stockErr) {
                            console.error(`Error fetching stock details for ${item.stock_key}:`, stockErr);
                            stockDetails = { name: `Stock ${item.stock_key}`, sector: 'Unknown' };
                        }
                        
                        let latestPrice = 0;
                        let changePercent = 0;
                        try {
                            const priceData = await fetch(`${API_BASE_URL}/stock/latest_price/${item.stock_key}`, {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                redirect: 'follow'
                            });
                            
                            if (priceData.ok) {
                                const priceJson = await priceData.json();
                                console.log(`Latest price for ${item.stock_key}:`, priceJson);
                                latestPrice = priceJson.latest_price || 0;
                                
                                if (priceJson.previous_close && priceJson.latest_price) {
                                    changePercent = ((priceJson.latest_price - priceJson.previous_close) / priceJson.previous_close) * 100;
                                }
                            } else {
                                console.error(`Error fetching latest price for ${item.stock_key}:`, priceData.status);
                            }
                        } catch (priceErr) {
                            console.error(`Error fetching latest price for ${item.stock_key}:`, priceErr);
                        }
                        
                        return {
                            id: item.id,
                            stock_key: item.stock_key,
                            name: stockDetails.name || `Stock ${item.stock_key}`,
                            current_price: latestPrice,
                            change_percentage: changePercent,
                            sector: stockDetails.sector || 'Unknown',
                            added_date: item.added_date || new Date().toISOString().split('T')[0]
                        };
                    } catch (err) {
                        console.error(`Error processing watchlist item ${item.stock_key}:`, err);
                        return {
                            id: item.id,
                            stock_key: item.stock_key,
                            name: `Stock ${item.stock_key}`,
                            current_price: 0,
                            change_percentage: 0,
                            sector: 'Unknown',
                            added_date: item.added_date || new Date().toISOString().split('T')[0]
                        };
                    }
                })
            );
            
            console.log('Enriched watchlist items:', enrichedWatchlist);
            return enrichedWatchlist;
        } catch (error) {
            console.error('Error fetching user watchlist:', error);
            return [];
        }
    },
    
    //Add an item to the watchlist.

    addToWatchlist: async (userId, stockKey) => {
        try {
            const numericUserId = Number(userId);
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            console.log(`Adding ${stockKey} to watchlist for user ${numericUserId}`);
            
            const response = await fetch(`${API_BASE_URL}/watchlist/add_to_watchlist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    user_id: numericUserId,
                    stock_key: stockKey 
                }),
                redirect: 'follow'
            });
            
            if (!response.ok) {
                console.error('Error response from add to watchlist API:', response.status, response.statusText);
                throw await handleApiError(response);
            }
            
            const watchlistItem = await response.json();
            console.log('Watchlist item added:', watchlistItem);
            
            // Fetching stock details to return a complete item.
            try {
                const stockResponse = await fetch(`${API_BASE_URL}/stock/${stockKey}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                let stockData = {};
                if (stockResponse.ok) {
                    stockData = await stockResponse.json();
                    console.log(`Stock details for ${stockKey}:`, stockData);
                }
                
                // Fetching the latest price.
                const priceResponse = await fetch(`${API_BASE_URL}/stock/latest_price/${stockKey}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                let priceData = {};
                if (priceResponse.ok) {
                    priceData = await priceResponse.json();
                    console.log(`Latest price for ${stockKey}:`, priceData);
                }
                
                return {
                    id: watchlistItem.id,
                    stock_key: stockKey,
                    name: stockData.name || `Stock ${stockKey}`,
                    current_price: priceData.price || 0,
                    change_percentage: priceData.change_percentage || 0,
                    sector: stockData.sector || 'Unknown',
                    added_date: watchlistItem.added_date || new Date().toISOString().split('T')[0],
                    user_id: numericUserId
                };
            } catch (detailsError) {
                console.error('Error fetching stock details:', detailsError);
                
                return watchlistItem;
            }
        } catch (error) {
            console.error('Error adding to watchlist:', error);
            throw error;
        }
    },
    
    // Remove an item from the watchlist.

    removeFromWatchlist: async (userId, watchlistItemId) => {
        try {
            const numericUserId = Number(userId);
            const numericWatchlistItemId = Number(watchlistItemId);
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            console.log(`Removing item ${watchlistItemId} from watchlist for user ${numericUserId}`);
            
            const getResponse = await fetch(`${API_BASE_URL}/watchlist/${numericWatchlistItemId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                redirect: 'follow'
            });
            
            if (!getResponse.ok) {
                console.error('Error getting watchlist item:', getResponse.status, getResponse.statusText);
                throw await handleApiError(getResponse);
            }
            
            const watchlistItem = await getResponse.json();
            const stockKey = watchlistItem.stock_key;
            
            const response = await fetch(`${API_BASE_URL}/watchlist/delete_from_watchlist`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    user_id: numericUserId,
                    stock_key: stockKey 
                }),
                redirect: 'follow'
            });
            
            if (!response.ok) {
                console.error('Error removing from watchlist:', response.status, response.statusText);
                throw await handleApiError(response);
            }
            
            return true;
        } catch (error) {
            console.error('Error removing from watchlist:', error);
            throw error;
        }
    },
    
    searchStocks: async (query) => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            const response = await fetch(`${API_BASE_URL}/stock/search?q=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw await handleApiError(response);
            }
            
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('Error searching stocks:', error);
            throw error;
        }
    }
}; 