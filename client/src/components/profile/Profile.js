import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/hooks/useAuth';
import { userApi, portfolioApi, investmentApi, watchlistApi } from '../../lib/api';
import { API_BASE_URL } from '../../lib/utils/constants';
import { eventBus } from '../../lib/eventBus';
import ProfileHeader from './ProfileHeader';
import ProfileNavigation from './ProfileNavigation';
import PortfolioTab from './tabs/PortfolioTab';
import InvestmentsTab from './tabs/InvestmentsTab';
import WatchlistTab from './tabs/WatchlistTab';
import SettingsTab from './tabs/SettingsTab';
import './Profile.css';

const Profile = () => {
    const { userId } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Get tab from URL query parameter
    const queryParams = new URLSearchParams(location.search);
    const tabParam = queryParams.get('tab');
    
    const [activeTab, setActiveTab] = useState(tabParam || 'portfolio');
    const [profileData, setProfileData] = useState(null);
    const [portfolioData, setPortfolioData] = useState(null);
    const [investmentsData, setInvestmentsData] = useState([]);
    const [watchlistData, setWatchlistData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // We determine if it is the current user's profile
    const isCurrentUser = currentUser && profileData && String(currentUser.id) === String(profileData.id);
    
    // And then we update the url as te tab changes.
    useEffect(() => {
        if (activeTab && activeTab !== 'portfolio') {
            navigate(`/profile/${userId}?tab=${activeTab}`, { replace: true });
        } else {
            navigate(`/profile/${userId}`, { replace: true });
        }
    }, [activeTab, userId, navigate]);
    
    // This updates the active tab when URL query parameter changes.
    useEffect(() => {
        if (tabParam && ['portfolio', 'investments', 'watchlist', 'settings'].includes(tabParam)) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);
    
    useEffect(() => {
        console.log('Authentication state:', {
            currentUser,
            isAuthenticated: !!currentUser,
            userId: userId,
            accessToken: localStorage.getItem('accessToken')
        });
    }, [currentUser, userId]);
    
    useEffect(() => {
        console.log('API configuration:', {
            API_BASE_URL,
            environment: process.env.NODE_ENV
        });
    }, []);
    
    // Fetching the profile data using getPortfolioUser, getNetWorth, and getUnrealizedgains
    const fetchPortfolioData = async (userId) => {
        console.log('Fetching portfolio data for user:', userId);
        try {
            const portfolioData = await portfolioApi.getPortfolioUser(userId);
            console.log('Portfolio data from API:', portfolioData);
            
            const networthData = await portfolioApi.getNetWorth(userId);
            console.log('Networth data from API:', networthData);
            
            const unrealizedGains = await portfolioApi.getUnrealizedGains(userId);
            console.log('Unrealized gains from API:', unrealizedGains);
            
            const completePortfolioData = {
                ...portfolioData,
                networth: networthData?.networth || portfolioData.networth || 0,
                balance: portfolioData.balance || 0,
                total_assets: portfolioData.total_assets || 0,
                unrealized_gains: unrealizedGains?.total_unrealized_gains || 0,
                percent_change: unrealizedGains?.percentage_change || 0,
                risk_tolerance: portfolioData.risk_tolerance || 'medium',
                investments: portfolioData.investments || []
            };
            
            console.log('Combined portfolio data:', completePortfolioData);
            return completePortfolioData;
        } catch (error) {
            console.error('Error fetching portfolio data:', error);
            // If there is an error where the api fails, return a default portfolio data.
            return {
                networth: 0,
                balance: 0,
                total_assets: 0,
                unrealized_gains: 0,
                percent_change: 0,
                risk_tolerance: 'medium',
                investments: []
            };
        }
    };
    
    // Fetches investments data directly from the investment API correlating to the userId, which then processes the investments and ensures the stock key is upper case.
    const fetchInvestmentsData = async (userId) => {
        console.log('Fetching investments data for user:', userId);
        try {
            const investments = await investmentApi.getUserInvestments(userId);
            console.log('Investments data from API:', investments);
            
            const processedInvestments = investments.map(inv => ({
                ...inv,
                stock_key: inv.stock_key ? inv.stock_key.toUpperCase() : inv.stock_key
            }));
            
            setInvestmentsData(processedInvestments);
            return processedInvestments || [];
        } catch (error) {
            console.error('Error fetching investments data:', error);
            setInvestmentsData([]);
            return [];
        }
    };
    
    // The watchlist data is also directly taken from getUserWatchlist, where it processes and then refreshes when needed.
    const fetchWatchlistData = async (userId) => {
        console.log('Fetching watchlist data for user:', userId);
        try {
            // Get user's watchlist directly from the watchlist API
            const watchlist = await watchlistApi.getUserWatchlist(userId);
            console.log('Watchlist data from API:', watchlist);
            
            const processedWatchlist = watchlist.map(item => ({
                ...item,
                stock_key: item.stock_key ? item.stock_key.toUpperCase() : item.stock_key
            }));
            
            setWatchlistData(processedWatchlist);
            return processedWatchlist || [];
        } catch (error) {
            console.error('Error fetching watchlist data:', error);
            setWatchlistData([]);
            return [];
        }
    };
    
    // This function fetchesthe data needed.
    const fetchProfileData = async () => {
        if (!userId) {
            navigate('/');
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            console.log('Fetching profile data for user:', userId);
            
            let userData;
            try {
                userData = await userApi.getUserProfile(userId);
                console.log('User data loaded:', userData);
                setProfileData(userData);
            } catch (profileError) {
                console.error('Error fetching user profile:', profileError);
                setProfileData(null);
                throw new Error(`User not found: ${profileError.message}`);
            }

            const isViewingCurrentUser = currentUser && (Number(userData.id) === Number(currentUser.id));
            
            if (isViewingCurrentUser) {
                try {
                    const portfolio = await fetchPortfolioData(userData.id);
                    console.log('Portfolio data loaded successfully:', portfolio);
                    setPortfolioData(portfolio);
                } catch (portfolioError) {
                    console.error('Error loading portfolio data:', portfolioError);
                    setPortfolioData(null);
                }
                
                //Fetches the investments data, independent of the portfolio data.
                try {
                    await fetchInvestmentsData(userData.id);
                    console.log('Investments data loaded successfully!');
                } catch (investmentsError) {
                    console.error('Error loading investments data:', investmentsError);
                }
                
                // Fetches watchlist data.
                try {
                    await fetchWatchlistData(userData.id);
                    console.log('Watchlist data loaded successfully!');
                } catch (watchlistError) {
                    console.error('Error loading watchlist data:', watchlistError);
                }
            } else {
                console.log('Not loading private data for another user\'s profile');
            }
        } catch (err) {
            console.error('Error fetching profile data:', err);
            setError('Failed to load profile. The user may not exist.');
        } finally {
            setLoading(false);
        }
    };
    
    // The initial data fetch
    useEffect(() => {
        fetchProfileData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, navigate]);
    
    //Handles profile updates
    const handleProfileUpdate = (updatedUser) => {
        console.log('Profile update received in Profile component:', updatedUser);
        console.log('Current user ID:', currentUser?.id, 'Type:', typeof currentUser?.id);
        console.log('Profile data ID:', profileData?.id, 'Type:', typeof profileData?.id);
        
        //Updates the profile data with the new user data.
        setProfileData(prevData => {
            const newData = {
                ...prevData,
                ...updatedUser
            };
            console.log('Updated profile data:', newData);
            return newData;
        });
        
        //If this is the current user, it updates the currentUser in localStorage
        if (isCurrentUser && currentUser) {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const updatedStoredUser = {
                ...storedUser,
                username: updatedUser.username || storedUser.username,
                email: updatedUser.email || storedUser.email,
                mobile_phone: updatedUser.mobile_phone || storedUser.mobile_phone,
                profile_img: updatedUser.profile_img || storedUser.profile_img,
                profile_banner: updatedUser.profile_banner || storedUser.profile_banner,
                nationality: updatedUser.nationality || storedUser.nationality
            };
            console.log('Updating localStorage user data:', updatedStoredUser);
            localStorage.setItem('user', JSON.stringify(updatedStoredUser));
            
            setTimeout(() => {
                fetchProfileData();
            }, 500);
        }
    };
    
    useEffect(() => {
        console.log('Investments data updated:', investmentsData);
    }, [investmentsData]);
    
    useEffect(() => {
        console.log('Active tab changed to:', activeTab);
        
        // If we're switching to investments tab, the refresh investments data.
        if (activeTab === 'investments' && profileData) {
            fetchInvestmentsData(profileData.id);
        }
    }, [activeTab, profileData]);
    
    // Listen for the batch update completed events to refresh data.
    useEffect(() => {
        // Only set up the listener if we're viewing the current user's profile.
        if (profileData && currentUser && Number(profileData.id) === Number(currentUser.id)) {
            console.log('Setting up batch update listener for profile data');
            
            // Handles the batch update completed event.
            const handleBatchUpdateCompleted = (data) => {
                console.log('Batch update completed, refreshing profile data...', data);
                
                // Refreshes portfolio and investments data, allowing for the live update.
                if (profileData) {
                    fetchPortfolioData(profileData.id)
                        .then(portfolio => {
                            console.log('Portfolio data refreshed after batch update:', portfolio);
                            setPortfolioData(portfolio);
                        })
                        .catch(error => console.error('Error refreshing portfolio data:', error));
                    
                    // Only refreshes the investments if we're on the investments tab.
                    if (activeTab === 'investments') {
                        fetchInvestmentsData(profileData.id)
                            .catch(error => console.error('Error refreshing investments data:', error));
                    }
                    
                    // Only refreshes the watchlist if we're on the watchlist tab.
                    if (activeTab === 'watchlist') {
                        fetchWatchlistData(profileData.id)
                            .catch(error => console.error('Error refreshing watchlist data:', error));
                    }
                }
            };
            
            // This subscribes to batch update completed event.
            eventBus.subscribe('batchUpdateCompleted', handleBatchUpdateCompleted);
            
            // Cleanup on the unmount.
            return () => {
                eventBus.unsubscribe('batchUpdateCompleted', handleBatchUpdateCompleted);
                console.log('Batch update listener removed');
            };
        }
    }, [profileData, currentUser, activeTab]);
    
    // Renders the active tab content.
    const renderTabContent = () => {
        if (!profileData) return null;
        
        // Ensures the necessary data exists for each tab.
        const portfolio = profileData.portfolio || portfolioData || { networth: 0, balance: 0, risk_tolerance: 'low' };
        const investments = profileData.investments || [];
        const watchlist = profileData.watchlist || [];
        
        console.log('Data being passed to tabs:', {
            profileData,
            portfolioData,
            investmentsData
        });
        
        switch (activeTab) {
            case 'portfolio':
                return <PortfolioTab userId={userId} portfolio={portfolioData} />;
            case 'investments':
                return <InvestmentsTab userId={userId} investments={investmentsData} />;
            case 'watchlist':
                return <WatchlistTab userId={userId} watchlist={watchlistData} />;
            case 'settings':
                return <SettingsTab 
                    userId={userId} 
                    user={profileData} 
                    onProfileUpdate={handleProfileUpdate} 
                />;
            default:
                return <PortfolioTab userId={userId} portfolio={portfolioData} />;
        }
    };
    
    if (loading) {
        return (
            <Container className="profile-container">
                <div className="profile-loading">
                    <div className="spinner"></div>
                    <p>Loading profile...</p>
                </div>
            </Container>
        );
    }
    
    if (error) {
        return (
            <Container className="profile-container">
                <div className="profile-error">
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>Retry</button>
                </div>
            </Container>
        );
    }
    
    if (!profileData) {
        return (
            <Container className="profile-container">
                <div className="profile-error">
                    <p>User not found</p>
                    <button onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
                </div>
            </Container>
        );
    }
    
    return (
        <div className="profile-page">
            <ProfileHeader 
                user={profileData} 
                isCurrentUser={isCurrentUser}
                onProfileUpdate={handleProfileUpdate}
            />
            
            <Container className="profile-content">
                <Row>
                    <Col>
                        <ProfileNavigation 
                            activeTab={activeTab} 
                            setActiveTab={setActiveTab} 
                            isCurrentUser={isCurrentUser} 
                        />
                        
                        <div className="profile-tab-content">
                            {renderTabContent()}
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Profile; 