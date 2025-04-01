import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

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

// This gets price alerts for the current user.
export const getUserPriceAlerts = async () => {
  try {
    console.log('Fetching user price alerts...');
    
    const response = await axios.get(`${API_BASE_URL}/pricealerts/`, {
      headers: getAuthHeaders()
    });
    
    console.log('Price alerts API response:', response);
    
    if (!response.data) {
      console.warn('No data returned from price alerts API');
      return [];
    }
    
    if (!Array.isArray(response.data)) {
      console.warn('Price alerts API did not return an array:', response.data);
      return [];
    }
    
    const normalizedAlerts = response.data.map(alert => ({
      ...alert,
      stock_key: alert.stock_key ? alert.stock_key.toUpperCase() : alert.stock_key
    }));
    
    console.log(`Retrieved ${normalizedAlerts.length} price alerts`);
    return normalizedAlerts;
  } catch (error) {
    console.error('Error fetching price alerts:', error);
    console.error('Error details:', error.response?.data || 'No response data');
    throw error;
  }
};

// Setting a price alert for a stock.
export const setPriceAlert = async (stockKey, targetPrice) => {
  try {
    // Get the current user id from the token
    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('No access token found');
    }
    
    let userId;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub || payload.user_id || payload.id;
    } catch (e) {
      console.error('Error extracting user ID from token:', e);
      userId = localStorage.getItem('userId');
    }
    
    if (!userId) {
      throw new Error('Could not determine user ID');
    }
    
    const upperCaseStockKey = stockKey.toUpperCase();
    console.log(`Setting price alert: user_id=${userId}, stock_key=${upperCaseStockKey}, target_price=${targetPrice}`);

    const now = new Date().toISOString();

    const response = await axios.post(
      `${API_BASE_URL}/pricealerts/set_price_alert`, 
      { 
        user_id: userId,
        stock_key: upperCaseStockKey, 
        target_price: targetPrice,
        status: "active",
        created_at: now
      },
      { headers: getAuthHeaders() }
    );
    
    console.log('Price alert API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error setting price alert:', error);
    console.error('Error details:', error.response?.data || 'No response data');
    throw error;
  }
};

// Delete the price alert.
export const deletePriceAlert = async (alertId) => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/pricealerts/delete_price_alert/${alertId}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting price alert:', error);
    throw error;
  }
};

// Check the price alerts.
export const checkPriceAlerts = async () => {
  try {
    console.log('Checking price alerts...');
    
    const response = await axios.get(
      `${API_BASE_URL}/pricealerts/check_price_alerts`,
      { headers: getAuthHeaders() }
    );
    
    console.log('Price alerts check response:', response.data);
    
    // Response format normalized.
    let triggeredAlerts = [];
    
    if (response.data && response.data.triggered_alerts) {
      triggeredAlerts = response.data.triggered_alerts;
    } else if (Array.isArray(response.data)) {
      triggeredAlerts = response.data;
    }
    
    // Normalize the stock keys to uppercase.
    triggeredAlerts = triggeredAlerts.map(alert => ({
      ...alert,
      stock_key: alert.stock_key ? alert.stock_key.toUpperCase() : alert.stock_key
    }));
    
    console.log(`Found ${triggeredAlerts.length} triggered alerts`);
    
    return {
      triggered_alerts: triggeredAlerts
    };
  } catch (error) {
    console.error('Error checking price alerts:', error);
    console.error('Error details:', error.response?.data || 'No response data');
    return { triggered_alerts: [] }; // Returns an empty array on error to prevent crashes.
  }
}; 