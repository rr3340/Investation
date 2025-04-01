import { API_BASE_URL } from '../utils/constants';
import { handleApiError } from './utils';

// The Portfolio API service
export const portfolioApi = {
    // Get the portfolio user by ID
    getPortfolioUser: async (id) => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            console.log(`Fetching portfolio for user: ${id}`);
            
            const response = await fetch(`${API_BASE_URL}/portfolio/${id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                redirect: 'follow'
            });
            
            if (!response.ok) {
                console.error('Error response from portfolio API:', response.status, response.statusText);
                // Return a default if theres an error.
                return {
                    id: id,
                    networth: 0,
                    balance: 0,
                    total_assets: 0,
                    risk_tolerance: 'medium',
                    investments: []
                };
            }
            
            const portfolioData = await response.json();
            console.log('Portfolio data:', portfolioData);
            
            return portfolioData;
        } catch (error) {
            console.error('Error fetching portfolio:', error);
            // Return a default portfolio object
            return {
                id: id,
                networth: 0,
                balance: 0,
                total_assets: 0,
                risk_tolerance: 'medium',
                investments: []
            };
        }
    },
    
    // Get the portfolio summary for a user
    getPortfolioSummary: async (userId) => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            console.log(`Fetching portfolio summary for user: ${userId}`);
            
            const response = await fetch(`${API_BASE_URL}/portfolio/summary/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                redirect: 'follow'
            });
            
            if (!response.ok) {
                console.error('Error response from portfolio summary API:', response.status, response.statusText);
                //Again, return default if an error.
                return {
                    balance: 0,
                    total_assets: 0,
                    risk_tolerance: 'medium',
                    investments: []
                };
            }
            
            const summaryData = await response.json();
            console.log('Portfolio summary data:', summaryData);
            
            // Ensure all of the required fields have default values if missing.
            return {
                balance: summaryData.balance || 0,
                total_assets: summaryData.total_assets || 0,
                risk_tolerance: summaryData.risk_tolerance || 'medium',
                investments: summaryData.investments || []
            };
        } catch (error) {
            console.error('Error fetching portfolio summary:', error);
            // Return the default values instead of throwing to prevent UI errors.
            return {
                balance: 0,
                total_assets: 0,
                risk_tolerance: 'medium',
                investments: []
            };
        }
    },
    
    // Get the unrealized gains for a user.
    getUnrealizedGains: async (userId) => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            console.log(`Fetching unrealized gains for user: ${userId}`);
            
            const response = await fetch(`${API_BASE_URL}/portfolio/unrealized_gains/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                redirect: 'follow'
            });
            
            if (!response.ok) {
                console.error('Error response from unrealized gains API:', response.status, response.statusText);
                return {
                    total_unrealized_gains: 0,
                    percentage_change: 0
                };
            }
            
            const gainsData = await response.json();
            console.log('Unrealized gains data:', gainsData);
            
            // Ensure the response matches with what the frontend is expecting.
            return {
                total_unrealized_gains: gainsData.total_unrealized_gains || 0,
                percentage_change: gainsData.percentage_change || 0
            };
        } catch (error) {
            console.error('Error fetching unrealized gains:', error);
            return {
                total_unrealized_gains: 0,
                percentage_change: 0
            };
        }
    },
    
    // Function to get the net worth for a user
    getNetWorth: async (userId) => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            console.log(`Fetching net worth for user: ${userId}`);
            
            // Portfolio user ID is same as user ID, therefore use the UserId.
            const portfolioUserId = userId;
            
            const response = await fetch(`${API_BASE_URL}/portfolio/networth/${portfolioUserId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                redirect: 'follow'
            });
            
            if (!response.ok) {
                //Call the user id correctly if its invalid.
                if (response.status === 404) {
                    console.log('Portfolio user not found, trying with user ID as profile ID');
                    
                    const alternativeResponse = await fetch(`${API_BASE_URL}/portfolio/networth/${userId}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        redirect: 'follow'
                    });
                    
                    if (alternativeResponse.ok) {
                        const data = await alternativeResponse.json();
                        console.log('Net worth data from alternative endpoint:', data);
                        return data;
                    }
                }
                
                console.error('Error response from net worth API:', response.status, response.statusText);
                return { networth: 0 };
            }
            
            const netWorthData = await response.json();
            console.log('Net worth data:', netWorthData);
            
            return netWorthData;
        } catch (error) {
            console.error('Error fetching net worth:', error);
            return { networth: 0 };
        }
    },
    
    // Update the risk profile for user.
    
    updateRiskProfile: async (userId, riskTolerance) => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('No access token found');
            }
            
            console.log(`Updating risk profile for user: ${userId}`);
            
            const response = await fetch(`${API_BASE_URL}/portfolio/risk_profile/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    risk_tolerance: riskTolerance
                }),
                redirect: 'follow'
            });
            
            if (!response.ok) {
                console.error('Error response from risk profile API:', response.status, response.statusText);
                throw await handleApiError(response);
            }
            
            const riskProfileData = await response.json();
            console.log('Risk profile data:', riskProfileData);
            
            return riskProfileData;
        } catch (error) {
            console.error('Error updating risk profile:', error);
            throw error;
        }
    }
}; 