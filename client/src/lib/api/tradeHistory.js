import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

// The helper function to get auth headers.
const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  
  if (!token) {
    throw new Error('No access token found');
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// The Trade History's API functions.

// Get all of the trade history for a specific user.
export const getUserTradeHistory = async (userId) => {
  try {
    console.log(`Making API request to get trade history for user ID: ${userId}`);
    
    const response = await axios.get(
      `${API_BASE_URL}/trade_history/user/${userId}`, 
      { headers: getAuthHeaders() }
    );
    
    console.log('Trade history API response:', response);
    
    // The backend returns data in the format the appropiate json format. Extract just the trade_history array.
    if (response.data && response.data.trade_history) {
      console.log(`Found ${response.data.trade_history.length} trades for user ID: ${userId}`);
      return response.data.trade_history;
    } else if (Array.isArray(response.data)) {
      console.log(`Found ${response.data.length} trades for user ID: ${userId} (array format)`);
      return response.data;
    } else {
      console.warn('Unexpected response format from trade history API:', response.data);
      return response.data;
    }
  } catch (error) {
    console.error('Error fetching user trade history:', error);
    console.error('Error details:', error.response ? error.response.data : 'No response data');
    throw error;
  }
};

// Getting user's trade history for a specific stock.
export const getUserStockTradeHistory = async (userId, stockKey) => {
  try {
    console.log(`Fetching trade history for user ID: ${userId} and filtering for stock: ${stockKey}`);
    
    // Getting the full trade history.
    const allTrades = await getUserTradeHistory(userId);
    
    // Ensuring that allTrades is an array before filtering.
    if (!Array.isArray(allTrades)) {
      console.error('Trade history is not an array:', allTrades);
      return [];
    }
    
    // Filtering trades for the specific stock.
    const filteredTrades = allTrades.filter(trade => 
      trade && trade.stock_key && trade.stock_key.toUpperCase() === stockKey.toUpperCase()
    );
    
    console.log(`Found ${filteredTrades.length} trades for stock ${stockKey}`);
    return filteredTrades;
  } catch (error) {
    console.error(`Error fetching trade history for stock ${stockKey}:`, error);
    throw error;
  }
};

// Getting the trade history for a specific trade ID.
export const getTradeById = async (tradeId) => {
  try {
    console.log(`Fetching trade with ID: ${tradeId}`);
    
    const response = await axios.get(
      `${API_BASE_URL}/trade_history/${tradeId}`, 
      { headers: getAuthHeaders() }
    );
    
    console.log('Trade details response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching trade:', error);
    console.error('Error details:', error.response ? error.response.data : 'No response data');
    throw error;
  }
}; 