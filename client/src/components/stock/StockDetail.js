import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Tabs, Tab, Button, Alert, Spinner, Form, Modal } from 'react-bootstrap';
import { FaArrowLeft, FaChartLine, FaInfoCircle, FaExchangeAlt, FaStar, FaPlus, FaBell } from 'react-icons/fa';
import { stockApi, watchlistApi, priceAlertApi } from '../../lib/api';
import { useAuth } from '../../lib/hooks/useAuth';
import OverviewTab from './tabs/OverviewTab';
import AnalysisTab from './tabs/AnalysisTab';
import TransactionsTab from './tabs/TransactionsTab';
import './StockDetail.css';
import { formatDate, formatDateTime, formatTime, ensureUTCDate } from '../../lib/utils/dateUtils';
import { stockDataRefreshManager } from '../../services';
import { formatCurrency, formatPercentage } from '../../lib/utils/formatUtils';

const StockDetail = () => {
    const { stockKey } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [stockData, setStockData] = useState(null);
    const [priceData, setPriceData] = useState(null);
    const [historicalData, setHistoricalData] = useState([]);
    const [predictionData, setPredictionData] = useState(null);
    const [processedData, setProcessedData] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [isInWatchlist, setIsInWatchlist] = useState(false);
    const [watchlistLoading, setWatchlistLoading] = useState(false);
    const [mlProcessingRun, setMlProcessingRun] = useState(false);
    const [mlProcessingLoading, setMlProcessingLoading] = useState(false);
    
    const previousStockKeyRef = useRef(stockKey?.toUpperCase());
    
    const [showAlertModal, setShowAlertModal] = useState(false);
    const [alertPrice, setAlertPrice] = useState('');
    const [alertError, setAlertError] = useState('');
    const [alertLoading, setAlertLoading] = useState(false);
    const [activeAlerts, setActiveAlerts] = useState([]);
    const [alertSuccess, setAlertSuccess] = useState(false);
    
    // Function to fetch user's price alerts for the current stock
    //This function fetches the user's price alerts for the current stock.
    //We filter to find the activate alerts and see if it should be triggered.
        const fetchUserAlerts = async () => {
            if (!currentUser || !stockKey) return;
            
            try {
                const upperCaseStockKey = stockKey.toUpperCase();
                console.log(`Fetching price alerts for stock: ${upperCaseStockKey}`);
                
                const allAlerts = await priceAlertApi.getUserPriceAlerts();
                console.log('All user alerts:', allAlerts);
                
                if (!Array.isArray(allAlerts)) {
                    console.error('Price alerts data is not an array:', allAlerts);
                    return;
                }
                
                // Find active alerts for a specific stock.
                const stockAlerts = allAlerts.filter(alert => 
                    alert.stock_key.toUpperCase() === upperCaseStockKey && 
                    alert.status === 'active'
                );
                console.log('Active alerts for this stock:', stockAlerts);
                
                // Check if there are any alerts should be triggered with current price data.
                if (priceData && stockAlerts.length > 0) {
                    console.log('Checking if any alerts should be triggered with current price:', priceData.current_price);
                    
                    stockAlerts.forEach(alert => {
                        //Check if the current price has crossed the target price.
                        const shouldTrigger = 
                            (priceData.current_price >= alert.target_price && priceData.previous_close < alert.target_price) || 
                            (priceData.current_price <= alert.target_price && priceData.previous_close > alert.target_price) ||
                            (priceData.current_price === alert.target_price);
                            
                        if (shouldTrigger) {
                            console.log(`Alert should be triggered: ${alert.stock_key} at target $${alert.target_price}, current $${priceData.current_price}`);
                            
                            setError(null);
                            setSuccess(`Price Alert Triggered! ${alert.stock_key} ${priceData.current_price >= alert.target_price ? 'rose to' : 'fell to'} ${formatCurrency(priceData.current_price)}, crossing your target of ${formatCurrency(alert.target_price)}`);
                            
                            try {
                                priceAlertApi.checkPriceAlerts();
                            } catch (err) {
                                console.error('Error updating alert status:', err);
                            }
                        }
                    });
                }
                
                setActiveAlerts(stockAlerts);
            } catch (err) {
                console.error('Error fetching price alerts:', err);
            }
        };
    
    // Fetch the stock data via its details, obtaining the latest price. Then fetch the the historical data points for the chart.
    //
    useEffect(() => {
        const fetchStockData = async () => {
            if (!stockKey) {
                setError('Invalid stock symbol');
                setLoading(false);
                return;
            }
            
            const upperCaseStockKey = stockKey.toUpperCase();
            console.log(`Fetching stock data for: ${upperCaseStockKey}`);
            
            setLoading(true);
            
            try {
                const stockDetails = await stockApi.getStockDetails(upperCaseStockKey);
                setStockData(stockDetails);
                
                const latestPrice = await stockApi.getLatestPrice(upperCaseStockKey);
                setPriceData(latestPrice);
                
                stockDataRefreshManager.recordManualUpdate('price', upperCaseStockKey);
                
                const historicalOptions = {
                    limit: 100
                };
                
                const history = await stockApi.getHistoricalData(upperCaseStockKey, historicalOptions);
                setHistoricalData(history);
                
                stockDataRefreshManager.recordManualUpdate('historical', upperCaseStockKey);
                
                // We check if the stock is in the watchlist here.
                if (currentUser) {
                    checkWatchlistStatus(upperCaseStockKey);
                    fetchUserAlerts();
                }
                
                setLoading(false);
            } catch (error) {
                console.error('Error fetching stock data:', error);
                setError('Failed to load stock data. Please try again later.');
                setLoading(false);
            }
        };
        
        fetchStockData();
    }, [stockKey, currentUser]);
    
    // Immediately fetch the existing processed data and predictions for display in the portfolio tab.
    useEffect(() => {
        const fetchExistingAnalysisData = async () => {
            if (!stockKey || !stockData || !priceData) {
                return;
            }
            
            const upperCaseStockKey = stockKey.toUpperCase();
            console.log(`Fetching existing processed data for: ${upperCaseStockKey}`);
            
            try {
                const processed = await stockApi.getProcessedStockData(upperCaseStockKey);
                console.log(`Fetched existing processed data for ${upperCaseStockKey}:`, processed);
                
                if (processed) {
                    const dataArray = Array.isArray(processed) ? processed : [processed];
                    setProcessedData(dataArray);
                    
                    stockDataRefreshManager.recordManualUpdate('processed', upperCaseStockKey);
                }
            } catch (processedError) {
                console.log(`No existing processed data found for ${upperCaseStockKey} or error: ${processedError.message}`);
            }
        };
        
        fetchExistingAnalysisData();
    }, [stockKey, stockData, priceData]);
    
    // Set up the real-time updates for the stock data.
    //This is used to subscribe to the price updates, historical data updates, processed updates, and predicted updates.
    useEffect(() => {
        if (!stockKey) return;
        
        const upperCaseStockKey = stockKey.toUpperCase();
        console.log(`Setting up real-time updates for ${upperCaseStockKey}`);
        
        const priceUnsubscribe = stockDataRefreshManager.subscribe(
            'price', 
            upperCaseStockKey, 
            newPriceData => {
                console.log(`Received real-time price update for ${upperCaseStockKey}:`, newPriceData);
                setPriceData(newPriceData);
            }
        );
        
        const historicalUnsubscribe = stockDataRefreshManager.subscribe(
            'historical', 
            upperCaseStockKey, 
            newHistoricalData => {
                console.log(`Received real-time historical data update for ${upperCaseStockKey}`);
                setHistoricalData(newHistoricalData);
            }
        );
        
        const processedUnsubscribe = stockDataRefreshManager.subscribe(
            'processed', 
            upperCaseStockKey, 
            newProcessedData => {
                console.log(`Received real-time processed data update for ${upperCaseStockKey}`);
                const dataArray = Array.isArray(newProcessedData) ? newProcessedData : [newProcessedData];
                setProcessedData(dataArray);
            }
        );
        
        const predictionUnsubscribe = stockDataRefreshManager.subscribe(
            'prediction', 
            upperCaseStockKey, 
            newPredictionData => {
                console.log(`Received real-time prediction data update for ${upperCaseStockKey}`);
                setPredictionData(newPredictionData);
            }
        );
        
        return () => {
            priceUnsubscribe();
            historicalUnsubscribe();
            processedUnsubscribe();
            predictionUnsubscribe();
            console.log(`Cleaned up real-time updates for ${upperCaseStockKey}`);
        };
    }, [stockKey]);
    
    // Run the ML pipeline when stock data is available, and the user is logged in.
    useEffect(() => {
        const upperCaseStockKey = stockKey?.toUpperCase();
        
        // Run if all data is available, and there was no process on this stock.
        if (
            currentUser && 
            upperCaseStockKey && 
            stockData && 
            priceData && 
            historicalData && 
            !mlProcessingRun &&
            !mlProcessingLoading
        ) {
            const runProcessingAndMLPipeline = async () => {
                setMlProcessingLoading(true);
                console.log(`Starting processing and ML pipeline for ${upperCaseStockKey}...`);

                try {
                    // First the process historical data
                    console.log(`Processing historical data for ${upperCaseStockKey}...`);
                    await stockApi.processHistoricalBatch({ stocks: [upperCaseStockKey] });
                    console.log(`Historical processing completed for ${upperCaseStockKey}`);
                    
                    // And then run the ML pipeline
                    console.log(`Running ML pipeline for ${upperCaseStockKey}...`);
                    const response = await stockApi.runMLPipeline(upperCaseStockKey);
                    console.log(`ML pipeline for ${upperCaseStockKey} completed:`, response);
                    
                    setMlProcessingRun(true);
                    
                    // Check if the ML pipeline was successful.
                    if (response && response.status === "success") {
                        // Then re-fetch the processed data.
                        try {
                            console.log(`Fetching processed data after ML pipeline completion for ${upperCaseStockKey}`);
                            const processed = await stockApi.getProcessedStockData(upperCaseStockKey);
                            console.log(`Fetched processed data for ${upperCaseStockKey}:`, processed);
                            
                            if (processed) {
                                const dataArray = Array.isArray(processed) ? processed : [processed];
                                setProcessedData(dataArray);
                                stockDataRefreshManager.recordManualUpdate('processed', upperCaseStockKey);
                            }
                        } catch (processedError) {
                            console.error(`Error fetching processed data for ${upperCaseStockKey}:`, processedError);
                        }
                        
                        // Delay to avoid overlap.
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        // Fetch the prediction.
                        try {
                            console.log(`Fetching prediction after ML pipeline completion for ${upperCaseStockKey}`);
                            const prediction = await stockApi.getBestPrediction(upperCaseStockKey);
                            console.log(`Fetched prediction for ${upperCaseStockKey} after ML pipeline:`, prediction);
                            
                            if (prediction && prediction.best_predicted_price) {
                                setPredictionData(prediction);
                                stockDataRefreshManager.recordManualUpdate('prediction', upperCaseStockKey);
                            }
                        } catch (predictionError) {
                            console.error(`Error fetching prediction for ${upperCaseStockKey} after ML pipeline:`, predictionError);
                        }
                    } else {
                        console.warn(`ML pipeline for ${upperCaseStockKey} did not complete successfully. Response:`, response);
                        
                        // Fetch any existing processed data first.
                        try {
                            console.log(`Attempting to fetch existing processed data for ${upperCaseStockKey}`);
                            const existingProcessed = await stockApi.getProcessedStockData(upperCaseStockKey);
                            
                            if (existingProcessed) {
                                const dataArray = Array.isArray(existingProcessed) ? existingProcessed : [existingProcessed];
                                console.log(`Found existing processed data for ${upperCaseStockKey}`);
                                setProcessedData(dataArray);
                                stockDataRefreshManager.recordManualUpdate('processed', upperCaseStockKey);
                            }
                        } catch (existingProcessedError) {
                            console.error(`Error fetching existing processed data for ${upperCaseStockKey}:`, existingProcessedError);
                        }
                        
                        // Then keep a delay.
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        // If it fails, fetch the already set prediction.
                        try {
                            console.log(`Attempting to fetch existing prediction for ${upperCaseStockKey} after failed ML pipeline`);
                            const existingPrediction = await stockApi.getBestPrediction(upperCaseStockKey);
                            
                            if (existingPrediction && existingPrediction.best_predicted_price) {
                                console.log(`Found existing prediction for ${upperCaseStockKey}:`, existingPrediction);
                                setPredictionData(existingPrediction);
                                stockDataRefreshManager.recordManualUpdate('prediction', upperCaseStockKey);
                            }
                        } catch (existingPredictionError) {
                            console.error(`Error fetching existing prediction for ${upperCaseStockKey}:`, existingPredictionError);
                        }
                    }
                } catch (error) {
                    console.error(`Error in processing and ML pipeline for ${upperCaseStockKey}:`, error);
                    
                    // Fetch any existing processed data as fallback.
                    try {
                        console.log(`Attempting to fetch existing processed data after error for ${upperCaseStockKey}`);
                        const fallbackProcessed = await stockApi.getProcessedStockData(upperCaseStockKey);
                        
                        if (fallbackProcessed) {
                            const dataArray = Array.isArray(fallbackProcessed) ? fallbackProcessed : [fallbackProcessed];
                            console.log(`Found existing processed data after error for ${upperCaseStockKey}`);
                            setProcessedData(dataArray);
                        }
                    } catch (fallbackProcessedError) {
                        console.error(`Error fetching fallback processed data for ${upperCaseStockKey}:`, fallbackProcessedError);
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    try {
                        console.log(`Attempting to fetch existing prediction after error for ${upperCaseStockKey}`);
                        const fallbackPrediction = await stockApi.getBestPrediction(upperCaseStockKey);
                        
                        if (fallbackPrediction && fallbackPrediction.best_predicted_price) {
                            console.log(`Found existing prediction after error for ${upperCaseStockKey}:`, fallbackPrediction);
                            setPredictionData(fallbackPrediction);
                        }
                    } catch (fallbackError) {
                        console.error(`Error fetching fallback prediction for ${upperCaseStockKey}:`, fallbackError);
                    }
                } finally {
                    setMlProcessingLoading(false);
                }
            };

            runProcessingAndMLPipeline();
        }
    }, [currentUser, stockKey, stockData, priceData, historicalData, mlProcessingRun, mlProcessingLoading]);
    
    // Separate the useEffect to handlethe  ML pipeline termination when the stock changes, or if the component unmounts.
    useEffect(() => {
        const upperCaseStockKey = stockKey?.toUpperCase();
        
        // Update the ref value instead of creating a new reference.
        // Store current value before updating for comparison in the cleanup.
        const prevStockKey = previousStockKeyRef.current;
        previousStockKeyRef.current = upperCaseStockKey;
        
        // Return the cleanup function.
        return () => {
            if (currentUser && upperCaseStockKey) {
                const isStockChanging = prevStockKey !== upperCaseStockKey;
                console.log(`Stock changing: ${isStockChanging}, Previous: ${prevStockKey}, Current: ${upperCaseStockKey}`);
                
                // Only terminate if there's an actual ML process running for this stock, we're actually changing stocks or unmounting the component.
                if (mlProcessingLoading && (isStockChanging || !stockKey)) {
                    console.log(`Terminating active ML pipeline for ${upperCaseStockKey}`);
                    stockApi.terminateMLPipeline(upperCaseStockKey)
                        .then(response => {
                            console.log(`ML pipeline termination request sent for ${upperCaseStockKey}:`, response);
                        })
                        .catch(error => {
                            console.error(`Error terminating ML pipeline for ${upperCaseStockKey}:`, error);
                        });
                } else {
                    const reason = !mlProcessingLoading 
                        ? "no active ML pipeline" 
                        : "not changing stocks or unmounting";
                    console.log(`Not terminating ML pipeline for ${upperCaseStockKey}: ${reason}`);
                }
            }
        };
    }, [stockKey, currentUser, mlProcessingLoading]);
    
    // Resets the ML processing run state when stock changes.
    useEffect(() => {
        setMlProcessingRun(false);
    }, [stockKey]);
    
    // Fetches user's price alerts for this stock when price data changes.
    useEffect(() => {
        if (currentUser && priceData) {
            fetchUserAlerts();
        }
    }, [currentUser, stockKey, priceData]);
    
    // Checks if the stock is in the user's watchlist.
    const checkWatchlistStatus = async (stKey = stockKey) => {
        try {
            const upperCaseStockKey = stKey.toUpperCase();
            const watchlistItems = await watchlistApi.getUserWatchlist(currentUser.id);
            const isInList = watchlistItems.some(item => item.stock_key === upperCaseStockKey);
            setIsInWatchlist(isInList);
        } catch (err) {
            console.error('Error checking watchlist status:', err);
        }
    };
    
    // Add the stock to a watchlist.
    const handleAddToWatchlist = async () => {
        if (!currentUser?.id) {
            navigate('/login');
            return;
        }
        
        setWatchlistLoading(true);
        
        try {
            const upperCaseStockKey = stockKey.toUpperCase();
            await watchlistApi.addToWatchlist(currentUser.id, upperCaseStockKey);
            setIsInWatchlist(true);
        } catch (err) {
            console.error('Error adding to watchlist:', err);
            setError(`Failed to add to watchlist: ${err.message || 'Unknown error'}`);
        } finally {
            setWatchlistLoading(false);
        }
    };
    
    // Removes the stock from watchlist.
    const handleRemoveFromWatchlist = async () => {
        if (!currentUser?.id) {
            return;
        }
        
        setWatchlistLoading(true);
        
        try {
            const upperCaseStockKey = stockKey.toUpperCase();
            const watchlistItems = await watchlistApi.getUserWatchlist(currentUser.id);
            const watchlistItem = watchlistItems.find(item => item.stock_key === upperCaseStockKey);
            
            if (watchlistItem) {
                await watchlistApi.removeFromWatchlist(currentUser.id, watchlistItem.id);
                setIsInWatchlist(false);
            }
        } catch (err) {
            console.error('Error removing from watchlist:', err);
            setError(`Failed to remove from watchlist: ${err.message || 'Unknown error'}`);
        } finally {
            setWatchlistLoading(false);
        }
    };
    
    // Handle the tab change.
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        
        //Refresh the data when switching to analysis tab.
        if (tab === 'analysis' && stockKey) {
            const fetchDataForAnalysis = async () => {
                const upperCaseStockKey = stockKey.toUpperCase();
                
                // If the ML process is still running, the console is notified but we don't get the data.
                if (mlProcessingLoading) {
                    console.log(`ML pipeline for ${upperCaseStockKey} is still running. Using existing data or waiting for pipeline to complete.`);
                    return;
                }
                
                //Only fetch the processed data, not prediction data.
                try {
                    console.log(`Fetching processed data for analysis tab: ${upperCaseStockKey}`);
                    const processed = await stockApi.getProcessedStockData(upperCaseStockKey);
                    console.log(`Fetched processed data for ${upperCaseStockKey}:`, processed);
                    
                    if (processed && ((Array.isArray(processed) && processed.length > 0) || (!Array.isArray(processed) && Object.keys(processed).length > 0))) {
                        const dataArray = Array.isArray(processed) ? processed : [processed];
                        setProcessedData(dataArray);
                    } else {
                        console.warn(`Analysis tab: Received empty processed data for ${upperCaseStockKey}`);
                    }
                } catch (processedError) {
                    console.error(`Error fetching processed data for ${upperCaseStockKey}:`, processedError);
                    //If the processedData cannot be fetched, we show the analysis tab irregardless. The fallback is handled in the analysis tab.
                }
            };
            
            fetchDataForAnalysis();
        }
    };
    
    //Handle the trading actions.
    const handleTradeAction = (action) => {
        setActiveTab('transactions');
        

        localStorage.setItem('stockTradeAction', action);
        
        setTimeout(() => {
            localStorage.removeItem('stockTradeAction');
        }, 1000);
    };
    
    const handleGoBack = () => {
        navigate(-1);
    };
    
    const handleSetPriceAlert = async () => {
        if (!currentUser) {
            navigate('/login');
            return;
        }
        
        setShowAlertModal(true);
        if (priceData && !alertPrice) {
            setAlertPrice(priceData.current_price);
        }
    };
    
    const handleAlertSubmit = async () => {
        setAlertError('');
        
        if (!currentUser) {
            setAlertError('You must be logged in to set price alerts');
            return;
        }
        
        if (!alertPrice || isNaN(parseFloat(alertPrice)) || parseFloat(alertPrice) <= 0) {
            setAlertError('Please enter a valid price.');
            return;
        }
        
        setAlertLoading(true);
        try {
            const upperCaseStockKey = stockKey.toUpperCase();
            
            console.log(`Setting price alert for ${upperCaseStockKey} at ${parseFloat(alertPrice)}`);
            
            const result = await priceAlertApi.setPriceAlert(upperCaseStockKey, parseFloat(alertPrice));
            console.log('Price alert set successfully:', result);
            
            setAlertSuccess(true);
            
            try {
                const allAlerts = await priceAlertApi.getUserPriceAlerts();
                console.log('All user alerts:', allAlerts);
                
                const stockAlerts = allAlerts.filter(alert => 
                    alert.stock_key.toUpperCase() === upperCaseStockKey.toUpperCase() && 
                    alert.status === 'active'
                );
                console.log('Active alerts for this stock:', stockAlerts);
                
                setActiveAlerts(stockAlerts);
            } catch (fetchError) {
                console.error('Error refreshing alerts:', fetchError);
            }
            
            setTimeout(() => {
                setShowAlertModal(false);
                setAlertPrice('');
                setAlertError('');
                setAlertSuccess(false);
            }, 1500);
        } catch (error) {
            console.error('Error setting price alert:', error);
            setAlertError(error.response?.data?.message || 'Failed to set price alert. Please try again.');
        } finally {
            setAlertLoading(false);
        }
    };
    
    const handleRemoveAlert = async (alertId) => {
        try {
            await priceAlertApi.deletePriceAlert(alertId);
            setActiveAlerts(activeAlerts.filter(alert => alert.id !== alertId));
        } catch (error) {
            console.error('Error removing price alert:', error);
        }
    };
    
    const handleCloseAlertModal = () => {
        setShowAlertModal(false);
        setAlertPrice('');
        setAlertError('');
        setAlertSuccess(false);
    };
    
    const renderPriceAlerts = () => {
        if (!currentUser) {
            return (
                <Card className="stock-feature-card mb-3">
                    <Card.Body>
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <h5 className="mb-0"><FaBell className="me-2" /> Price Alerts</h5>
                                <p className="text-muted small mb-0">Get notified when this stock reaches a target price</p>
                            </div>
                            <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={() => navigate('/login')}
                            >
                                Login to Set Alerts
                            </Button>
                        </div>
                    </Card.Body>
                </Card>
            );
        }
        
        return (
            <Card className="stock-feature-card mb-3">
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h5 className="mb-0"><FaBell className="me-2" /> Price Alerts</h5>
                            <p className="text-muted small mb-0">Get notified when this stock reaches a target price</p>
                        </div>
                        <Button 
                            variant="primary" 
                            size="sm"
                            onClick={handleSetPriceAlert}
                        >
                            <FaPlus className="me-1" /> Set Alert
                        </Button>
                    </div>
                    
                    {activeAlerts.length > 0 ? (
                        <div className="active-alerts-section">
                            <h6>Your Active Alerts</h6>
                            {activeAlerts.map(alert => (
                                <div key={alert.id} className="alert-item d-flex justify-content-between align-items-center">
                                    <div>
                                        <span className="alert-price">{formatCurrency(alert.target_price)}</span>
                                        <p className="small text-secondary">
                                            Set on {formatDate(alert.created_at)}
                                        </p>
                                    </div>
                                    <Button 
                                        variant="outline-danger" 
                                        size="sm"
                                        onClick={() => handleRemoveAlert(alert.id)}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted small mb-0">You don't have any price alerts for this stock.</p>
                    )}
                </Card.Body>
            </Card>
        );
    };
    
    const renderWatchlistWidget = () => {
        if (!currentUser) {
            return (
                <Card className="stock-feature-card mb-3">
                    <Card.Body>
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <h5 className="mb-0"><FaStar className="me-2" /> Watchlist</h5>
                                <p className="text-muted small mb-0">Add this stock to your personal watchlist</p>
                            </div>
                            <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={() => navigate('/login')}
                            >
                                Login to Add to Watchlist
                            </Button>
                        </div>
                    </Card.Body>
                </Card>
            );
        }
        
        return (
            <Card className="stock-feature-card mb-3">
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h5 className="mb-0"><FaStar className="me-2" /> Watchlist</h5>
                            <p className="text-muted small mb-0">
                                {isInWatchlist 
                                    ? "This stock is in your watchlist" 
                                    : "Add this stock to your personal watchlist"}
                            </p>
                        </div>
                        {watchlistLoading ? (
                            <Button variant="primary" size="sm" disabled>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                    className="me-1"
                                />
                                Loading...
                            </Button>
                        ) : isInWatchlist ? (
                            <Button 
                                variant="warning" 
                                size="sm"
                                onClick={handleRemoveFromWatchlist}
                            >
                                Remove from Watchlist
                            </Button>
                        ) : (
                            <Button 
                                variant="primary" 
                                size="sm"
                                onClick={handleAddToWatchlist}
                            >
                                <FaPlus className="me-1" /> Add to Watchlist
                            </Button>
                        )}
                    </div>
                </Card.Body>
            </Card>
        );
    };
    
    if (loading) {
        return (
            <Container className="stock-detail-container py-5">
                <div className="text-center my-5">
                    <Spinner animation="border" role="status" variant="primary">
                        <span className="visually-hidden">Loading...</span>
                    </Spinner>
                    <p className="mt-3">Loading stock data...</p>
                </div>
            </Container>
        );
    }
    
    if (error) {
        return (
            <Container className="stock-detail-container py-5">
                <Alert variant="danger" className="my-4">
                    <Alert.Heading>Error</Alert.Heading>
                    <p>{error}</p>
                </Alert>
                <button onClick={handleGoBack} className="back-button">
                    <FaArrowLeft className="back-arrow" /> <span className="back-text">Go Back</span>
                </button>
            </Container>
        );
    }
    
    if (!stockData) {
        return (
            <Container className="stock-detail-container py-5">
                <Alert variant="warning" className="my-4">
                    <Alert.Heading>Stock Not Found</Alert.Heading>
                    <p>The stock you're looking for could not be found.</p>
                </Alert>
                <button onClick={handleGoBack} className="back-button">
                    <FaArrowLeft className="back-arrow" /> <span className="back-text">Go Back</span>
                </button>
            </Container>
        );
    }
    
    return (
        <Container className="stock-detail-container">
            <button onClick={handleGoBack} className="back-button mb-4">
                <FaArrowLeft className="back-arrow" /> <span className="back-text">Back</span>
            </button>
            
            {error && (
                <Alert variant="danger" className="mb-4">
                    {error}
                </Alert>
            )}
            
            {success && (
                <Alert variant="success" className="mb-4">
                    {success}
                </Alert>
            )}
            
            <Card className="stock-header-card mb-4">
                <Card.Body>
                    <Row>
                        <Col md={6}>
                            <h1 className="stock-name">{stockData.name}</h1>
                            <h2 className="stock-symbol">{stockData.stock_key}</h2>
                            <p className="stock-sector">{stockData.sector} | {stockData.industry}</p>
                        </Col>
                        <Col md={6} className="text-md-end">
                            <h2 className="stock-price">
                                {priceData ? formatCurrency(priceData.latest_price) : 'Price not available'}
                            </h2>
                            <p className="stock-timestamp">
                                {priceData && priceData.timestamp ? 
                                    `Last updated: ${formatDateTime(new Date(ensureUTCDate(priceData.timestamp)))}` : 
                                    'Last updated: N/A'}
                            </p>
                            {currentUser && (
                                <div className="trade-buttons mt-3">
                                    <Button 
                                        variant="success" 
                                        size="sm" 
                                        className="me-2"
                                        onClick={() => handleTradeAction('buy')}
                                    >
                                        Buy
                                    </Button>
                                    <Button 
                                        variant="danger" 
                                        size="sm"
                                        onClick={() => handleTradeAction('sell')}
                                    >
                                        Sell
                                    </Button>
                                </div>
                            )}
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
            
            <Row className="mb-4">
                <Col lg={12}>
                    {/* Main content column - takes full width for all tabs */}
                    <Tabs
                        activeKey={activeTab}
                        onSelect={handleTabChange}
                        className="stock-tabs mb-4"
                    >
                        <Tab eventKey="overview" title={<><FaInfoCircle className="me-2" /> Overview</>}>
                            <OverviewTab 
                                stock={stockData} 
                                priceData={priceData} 
                                historicalData={historicalData}
                            />
                            
                            {/* Add feature cards */}
                            <Row className="mt-4">
                                <Col md={6}>
                                    {renderWatchlistWidget()}
                                    {renderPriceAlerts()}
                                </Col>
                                
                                {currentUser?.id && (
                                    <Col md={6}>
                                        {/* This space is available for additional widgets */}
                                    </Col>
                                )}
                            </Row>
                        </Tab>
                        <Tab eventKey="analysis" title={<><FaChartLine className="me-2" /> Analysis</>}>
                            <AnalysisTab 
                                stock={stockData} 
                                priceData={priceData} 
                                predictionData={predictionData}
                                processedData={processedData}
                                mlProcessingLoading={mlProcessingLoading}
                                mlProcessingRun={mlProcessingRun}
                            />
                        </Tab>
                        <Tab eventKey="transactions" title={<><FaExchangeAlt className="me-2" /> Transactions</>}>
                            <TransactionsTab 
                                stock={stockData} 
                                stockKey={stockKey}
                            />
                        </Tab>
                    </Tabs>
                </Col>
            </Row>
            
            {/* Price Alert Modal */}
            <Modal show={showAlertModal} onHide={handleCloseAlertModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Set Price Alert</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {alertError && <Alert variant="danger">{alertError}</Alert>}
                    {alertSuccess && (
                        <Alert variant="success">
                            Price alert successfully set! You'll be notified when {stockKey} reaches ${alertPrice}.
                        </Alert>
                    )}
                    {!alertSuccess && (
                        <>
                            <p>Get notified when {stockData?.name} ({stockKey}) reaches your target price.</p>
                            
                            <Form.Group className="mb-3">
                                <Form.Label>Target Price ($)</Form.Label>
                                <Form.Control 
                                    type="number" 
                                    value={alertPrice} 
                                    onChange={(e) => setAlertPrice(e.target.value)}
                                    min="0.01"
                                    step="0.01"
                                    placeholder="Enter target price"
                                />
                                <Form.Text className="text-muted">
                                    Current price: {priceData ? formatCurrency(priceData.current_price) : 'Loading...'}
                                </Form.Text>
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseAlertModal}>
                        {alertSuccess ? 'Close' : 'Cancel'}
                    </Button>
                    {!alertSuccess && (
                        <Button 
                            variant="primary" 
                            onClick={handleAlertSubmit}
                            disabled={alertLoading}
                        >
                            {alertLoading ? (
                                <>
                                    <Spinner
                                        as="span"
                                        animation="border"
                                        size="sm"
                                        role="status"
                                        aria-hidden="true"
                                        className="me-2"
                                    />
                                    Setting Alert...
                                </>
                            ) : (
                                'Set Alert'
                            )}
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default StockDetail; 