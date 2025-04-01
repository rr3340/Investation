import { API_BASE_URL } from '../utils/constants';
import { handleApiError } from './utils';

// The Investment API service
//This function gets all investments for the user.
export const investmentApi = {
    getUserInvestments: async (userId) => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                console.error('No access token found');
                return [];
            }
            
            console.log(`Fetching investments for user: ${userId}`);
            
            const response = await fetch(`${API_BASE_URL}/investment/user/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                redirect: 'follow'
            });
            
            console.log(`Investment API response for user ${userId}:`, response.status, response.statusText);
            
            if (!response.ok) {
                console.error('Error response from investments API:', response.status, response.statusText);
                return [];
            }
            
            const investments = await response.json();
            console.log('User investments (raw):', investments);
            
            // Validating the investment data.
            if (!Array.isArray(investments)) {
                console.error('Investments data is not an array:', investments);
                return [];
            }
            
            if (investments.length > 0) {
                console.log('First investment fields:', Object.keys(investments[0]));
                console.log('First investment data:', JSON.stringify(investments[0], null, 2));
            }
            
            // Ensuring each investment has the required display properties.
            const processedInvestments = investments.map(investment => {
                // Extract purchase_price and quantity with validation
                const purchasePrice = investment.purchase_price !== undefined ? 
                    parseFloat(investment.purchase_price) : 0;
                const quantity = investment.quantity !== undefined ? 
                    parseFloat(investment.quantity) : 0;
                
                if (!purchasePrice || !quantity) {
                    console.warn(`Investment has invalid purchase_price or quantity:`, 
                        { id: investment.investment_id, price: purchasePrice, qty: quantity });
                }
                
                return {
                    ...investment,
                    stock_key: investment.stock_key ? investment.stock_key.toUpperCase() : investment.stock_key,
                    purchase_price: purchasePrice,
                    quantity: quantity,
                    name: investment.name || `Stock ${investment.stock_key || 'Unknown'}`,
                    currentValue: investment.current_value || quantity * investment.current_price || 0,
                    initialValue: investment.initial_value || quantity * purchasePrice || 0,
                    changePercentage: investment.change_percentage || 0,
                };
            });
            
            console.log('Processed investments:', processedInvestments);
            return processedInvestments;
        } catch (error) {
            console.error('Error fetching user investments:', error);
            return [];
        }
    },
    
    // Get a specific investment by ID.

    getInvestmentById: async (investmentId) => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            console.log(`Fetching investment with ID: ${investmentId}`);
            
            const response = await fetch(`${API_BASE_URL}/investment/${investmentId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                redirect: 'follow'
            });
            
            if (!response.ok) {
                console.error('Error response from investment API:', response.status, response.statusText);
                throw await handleApiError(response);
            }
            
            const investment = await response.json();
            console.log('Investment details:', investment);
            
            return investment;
        } catch (error) {
            console.error('Error fetching investment details:', error);
            throw error;
        }
    },
    
    // Get a users position in a specific stock
    getUserStockPosition: async (userId, stockKey) => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            const upperStockKey = stockKey.toUpperCase();
            
            console.log(`Fetching position for user ${userId} in stock ${upperStockKey}`);
            
            try {
                // Get the specific user to stock investment.
                const response = await fetch(`${API_BASE_URL}/investment/user/${userId}/stock/${upperStockKey}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                    },
                    redirect: 'follow'
                });
                
                if (!response.ok) {
                    // If it doesn't exist, return null.
                    if (response.status === 404) {
                        console.log(`No investment found for user ${userId} in stock ${upperStockKey}`);
                        return null;
                    }
                    
                    console.error('Error response from investment API:', response.status, response.statusText);
                    throw await handleApiError(response);
                }
                
                const stockInvestment = await response.json();
                
                //Get the latest price for the stock to calculate current value, and the profit loss.
                const priceResponse = await fetch(`${API_BASE_URL}/stock/latest_price/${upperStockKey}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    redirect: 'follow'
                });
                
                if (!priceResponse.ok) {
                    console.error('Error response from latest price API:', priceResponse.status, priceResponse.statusText);
                    throw await handleApiError(priceResponse);
                }
                
                const priceData = await priceResponse.json();
                const latestPrice = priceData.latest_price || 0;
                
                //Calculate the position data with safeguards against division by zero and NaN.
                const quantity = stockInvestment.quantity || 0;
                const purchasePrice = stockInvestment.purchase_price || 0;
                
                //Calculate the values with error handling.
                const currentValue = quantity * latestPrice;
                const purchasedValue = quantity * purchasePrice;
                
                //Calculate the profit and loss with error handling.
                let profitLoss = currentValue - purchasedValue;
                let profitLossPercentage = 0;
                
                //Only calculate the percentage if we have a valid non zero purchase value.
                if (purchasedValue > 0) {
                    profitLossPercentage = (profitLoss / purchasedValue) * 100;
                }
                
                const position = {
                    investment_id: stockInvestment.investment_id,
                    stock_key: stockInvestment.stock_key,
                    quantity: quantity,
                    averageCost: purchasePrice,
                    purchaseDate: stockInvestment.purchase_date,
                    lastUpdate: stockInvestment.last_update,
                    currentPrice: latestPrice,
                    currentValue: parseFloat(currentValue.toFixed(2)),
                    purchasedValue: parseFloat(purchasedValue.toFixed(2)),
                    profitLoss: parseFloat(profitLoss.toFixed(2)),
                    profitLossPercentage: parseFloat(profitLossPercentage.toFixed(2))
                };
                
                console.log('User position in stock:', position);
                
                return position;
            } catch (error) {
                //If theres a 404 error that wasn't caught above, return a null.
                if (error.status === 404) {
                    console.log(`No investment found for user ${userId} in stock ${upperStockKey}`);
                    return null;
                }
                
                // For the other errors, do a fallback approach getting all investments.
                console.log('Trying fallback approach by fetching all user investments');
                
                const response = await fetch(`${API_BASE_URL}/investment/user/${userId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    redirect: 'follow'
                });
                
                if (!response.ok) {
                    console.error('Error response from investments API:', response.status, response.statusText);
                    throw await handleApiError(response);
                }
                
                const investments = await response.json();
                
                // Finds the investment for the requested stock. If the user doesn't own it, return null.
                const stockInvestment = investments.find(inv => inv.stock_key.toUpperCase() === upperStockKey);
                
                if (!stockInvestment) {
                    return null;
                }
                
                // Get the latest price for the stock to calculate current value and the profit or loss.
                const priceResponse = await fetch(`${API_BASE_URL}/stock/latest_price/${upperStockKey}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    redirect: 'follow'
                });
                
                if (!priceResponse.ok) {
                    console.error('Error response from latest price API:', priceResponse.status, priceResponse.statusText);
                    throw await handleApiError(priceResponse);
                }
                
                const priceData = await priceResponse.json();
                const latestPrice = priceData.latest_price || 0;
                
                const quantity = stockInvestment.quantity || 0;
                const purchasePrice = stockInvestment.purchase_price || 0;
                
                const currentValue = quantity * latestPrice;
                const purchasedValue = quantity * purchasePrice;
                
                let profitLoss = currentValue - purchasedValue;
                let profitLossPercentage = 0;
                
                if (purchasedValue > 0) {
                    profitLossPercentage = (profitLoss / purchasedValue) * 100;
                }
                
                const position = {
                    investment_id: stockInvestment.investment_id,
                    stock_key: stockInvestment.stock_key,
                    quantity: quantity,
                    averageCost: purchasePrice,
                    purchaseDate: stockInvestment.purchase_date,
                    lastUpdate: stockInvestment.last_update,
                    currentPrice: latestPrice,
                    currentValue: parseFloat(currentValue.toFixed(2)),
                    purchasedValue: parseFloat(purchasedValue.toFixed(2)),
                    profitLoss: parseFloat(profitLoss.toFixed(2)),
                    profitLossPercentage: parseFloat(profitLossPercentage.toFixed(2))
                };
                
                console.log('User position in stock (from fallback):', position);
                
                return position;
            }
        } catch (error) {
            console.error('Error fetching user stock position:', error);
            throw error;
        }
    },
    
    // Add a new investment for a user.
    addInvestment: async (userId, investmentData) => {
        try {
            const numericUserId = Number(userId);
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            const response = await fetch(`${API_BASE_URL}/investment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...investmentData,
                    user_id: numericUserId
                })
            });
            
            if (!response.ok) {
                throw await handleApiError(response);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error adding investment:', error);
            throw error;
        }
    },
    
    // Update an existing investment.
    
    updateInvestment: async (investmentId, investmentData) => {
        try {
            const numericInvestmentId = Number(investmentId);
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            const response = await fetch(`${API_BASE_URL}/investment/${numericInvestmentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(investmentData)
            });
            
            if (!response.ok) {
                throw await handleApiError(response);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error updating investment:', error);
            throw error;
        }
    },
    
    // Delete an investment.

    deleteInvestment: async (investmentId) => {
        try {
            const numericInvestmentId = Number(investmentId);
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            const response = await fetch(`${API_BASE_URL}/investment/${numericInvestmentId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw await handleApiError(response);
            }
            
            return true;
        } catch (error) {
            console.error('Error deleting investment:', error);
            throw error;
        }
    }
}; 