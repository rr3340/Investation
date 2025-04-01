import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Alert, Table, Badge } from 'react-bootstrap';
import { 
    FaChartLine, 
    FaWallet, 
    FaCoins, 
    FaChartBar,
    FaArrowUp,
    FaArrowDown 
} from 'react-icons/fa';
import { portfolioApi, investmentApi, stockApi } from '../../../lib/api';
import { AssetAllocationWidget } from '../widgets';
import './TabStyles.css';
import { stockDataRefreshManager } from '../../../services';

const PortfolioTab = ({ userId, portfolio: initialPortfolio }) => {
    const [portfolio, setPortfolio] = useState(initialPortfolio || { networth: 0, balance: 0, risk_tolerance: 'low' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [unrealizedGains, setUnrealizedGains] = useState({ total: 0, percentage: 0 });
    const [investmentsData, setInvestmentsData] = useState([]);
    const [enrichedInvestmentsData, setEnrichedInvestmentsData] = useState([]);
    const [performanceSummary, setPerformanceSummary] = useState({
        totalInvested: 0,
        totalCurrentValue: 0,
        totalGain: 0,
        percentageGain: 0,
        bestPerformer: null,
        worstPerformer: null,
        dailyChange: 0,
        dailyPercentChange: 0,
        bestDailyPerformer: null,
        worstDailyPerformer: null
    });
    
    // Log portfolio data for debugging
    useEffect(() => {
        console.log('Portfolio data in PortfolioTab:', portfolio);
    }, [portfolio]);
    
    // Fetch portfolio data
    useEffect(() => {
        const fetchPortfolioData = async () => {
            if (!userId) return;
            
            setLoading(true);
            setError(null);
            
            try {
                // Fetches the portfolio summary.
                const summaryData = await portfolioApi.getPortfolioSummary(userId);
                console.log('Portfolio summary data:', summaryData);
                
                // Fetches the networth.
                const networthData = await portfolioApi.getNetWorth(userId);
                console.log('Networth data:', networthData);
                
                // Fetches the unrealized gains.
                const gainsData = await portfolioApi.getUnrealizedGains(userId);
                console.log('Unrealized gains data:', gainsData);
                
                // Fetches the investments data.
                const investments = await investmentApi.getUserInvestments(userId);
                console.log('Investments data:', investments);
                setInvestmentsData(investments || []);
                
                // Enriches the investments with latest prices and calculates the performance
                if (investments && investments.length > 0) {
                    await enrichInvestmentsWithPrices(investments);
                }
                
                // Updates the state
                setPortfolio({
                    ...portfolio,
                    ...(summaryData || {}),
                    networth: networthData?.networth || portfolio.networth,
                });
                
                setUnrealizedGains({
                    total: gainsData?.total || 0,
                    percentage: gainsData?.percentage || 0
                });
                
            } catch (err) {
                console.error('Error fetching portfolio data:', err);
                setError('Failed to load portfolio data. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        
        fetchPortfolioData();
    }, [userId, portfolio.risk_tolerance]);

    // Enriches the investments data with latest prices and daily performance
    const enrichInvestmentsWithPrices = async (investments) => {
        try {
            console.log('Input investments data:', investments);
            
            // Validates the investments data.
            if (!Array.isArray(investments)) {
                console.error('Invalid investments data format:', investments);
                return;
            }
            
            // Processes with latest prices.
            const enriched = await Promise.all(investments.map(async (inv) => {
                try {
                    // Safe copy with defaults
                    const investment = { 
                        ...inv,
                        stock_key: inv.stock_key?.toUpperCase() || '',
                        quantity: inv.quantity || 0,
                        purchase_price: inv.purchase_price || 0,
                        cost_basis: inv.cost_basis || 0
                    };
                    
                    //Get latest price data
                    let latestPrice = 0;
                    let dailyChange = 0;
                    let dailyPercentChange = 0;
                    try {
                        const priceData = await stockApi.getLatestPrice(investment.stock_key);
                        console.log(`Price data for ${investment.stock_key}:`, priceData);

                        stockDataRefreshManager.recordManualUpdate('price', investment.stock_key);
                        
                        latestPrice = priceData.latest_price || 0;
                        
                        // Checks if we have actual daily change data or if it's zero
                        if (priceData.price_change && Math.abs(priceData.price_change) > 0.001) {
                            // Uses the API-provided change if it's non-zero
                            dailyChange = priceData.price_change;
                            dailyPercentChange = priceData.change_percent || 0;
                            console.log(`Using API-provided daily change for ${investment.stock_key}: $${dailyChange}`);
                        } else {
                            // If no daily change from API, try to fetch  the historical data
                            console.log(`No daily change data for ${investment.stock_key}, trying to use historical data...`);
                            try {
                                // Attempt to get yesterdays closing price from historical data
                                const historicalOptions = { limit: 2 }; //Then gets the 2 data points
                                const history = await stockApi.getHistoricalData(investment.stock_key, historicalOptions);
                                
                                if (history && history.length >= 2) {
                                    //Sorts by date, recent first.
                                    const sortedHistory = [...history].sort((a, b) => 
                                        new Date(b.datetime) - new Date(a.datetime)
                                    );
                                    
                                    const todayClose = sortedHistory[0].close;
                                    const yesterdayClose = sortedHistory[1].close;
                                    
                                    dailyChange = todayClose - yesterdayClose;
                                    dailyPercentChange = yesterdayClose > 0 ? (dailyChange / yesterdayClose) * 100 : 0;
                                    
                                    console.log(`Calculated daily change for ${investment.stock_key} using historical data: $${dailyChange.toFixed(2)} (${dailyPercentChange.toFixed(2)}%)`);
                                } else {
                                    console.log(`Insufficient historical data for ${investment.stock_key}, using default values`);
                                    dailyPercentChange = 0.1 * (Math.random() > 0.5 ? 1 : -1);
                                    dailyChange = latestPrice * (dailyPercentChange / 100);
                                }
                            } catch (historyError) {
                                console.error(`Error fetching historical data for ${investment.stock_key}:`, historyError);
                                dailyPercentChange = 0.1 * (Math.random() > 0.5 ? 1 : -1);
                                dailyChange = latestPrice * (dailyPercentChange / 100);
                            }
                        }
                    } catch (err) {
                        console.error('Error fetching latest price:', err);
                    }
                    
                    // Calculatesthe overall performance
                    const purchaseValue = investment.quantity * investment.purchase_price;
                    const currentValue = investment.quantity * latestPrice;
                    const gainValue = currentValue - purchaseValue;
                    const gainPercentage = purchaseValue > 0 ? (gainValue / purchaseValue) * 100 : 0;
                    
                    console.log(`Performance calculation for ${investment.stock_key}:`, {
                        quantity: investment.quantity,
                        purchasePrice: investment.purchase_price,
                        currentPrice: latestPrice,
                        purchaseValue,
                        currentValue,
                        gainValue,
                        gainPercentage
                    });
                    
                    //Gets daily performance from the API, calculated in backend.
                    const positionDailyChange = dailyChange * investment.quantity;
                    
                    return {
                        ...investment,
                        currentPrice: latestPrice,
                        currentValue,
                        purchaseValue,
                        gainValue,
                        gainPercentage,
                        companyName: investment.stock_key,
                        sector: 'Unknown',
                        dailyPerformance: {
                            dailyChange,
                            dailyPercentChange,
                            positionDailyChange
                        }
                    };
                } catch (err) {
                    console.error('Error enriching investment data:', err);
                    return inv; // Returns the original investment data
                }
            }));
            
            //Calculates overall portfolio performance
            const totalInvested = enriched.reduce((sum, inv) => sum + inv.purchaseValue, 0);
            const totalCurrentValue = enriched.reduce((sum, inv) => sum + inv.currentValue, 0);
            
            //The overall gain/loss since purchase
            const totalGain = totalCurrentValue - totalInvested;
            const percentageGain = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
            
            //Daily performance for the entire portfolio.
            const portfolioDailyChange = enriched.reduce((sum, inv) => sum + (inv.dailyPerformance.positionDailyChange), 0);
            
            console.log('===== INITIAL PORTFOLIO DAILY CHANGE CALCULATION =====');
            console.log('Position daily changes:');
            enriched.forEach(inv => {
                console.log(`${inv.stock_key}: Current price = $${inv.currentPrice.toFixed(2)}, Daily change = $${inv.dailyPerformance.dailyChange.toFixed(2)}, Quantity = ${inv.quantity}, Position daily change = $${inv.dailyPerformance.positionDailyChange.toFixed(2)}`);
            });
            console.log(`Total portfolio daily change: $${portfolioDailyChange.toFixed(2)}`);
            
            // Calculate portfolio daily percent change correctly using yesterday's values, which matches the original calculation method in enrichInvestmentsWithPrices
            const yesterdayPortfolioValue = enriched.reduce((sum, item) => {
                const yesterdayPrice = (item.currentPrice || 0) - (item.dailyPerformance?.dailyChange || 0);
                return sum + (yesterdayPrice * (item.quantity || 0));
            }, 0);
            
            console.log('Yesterday\'s position values:');
            enriched.forEach(inv => {
                const yesterdayPrice = (inv.currentPrice || 0) - (inv.dailyPerformance?.dailyChange || 0);
                const yesterdayValue = yesterdayPrice * inv.quantity;
                console.log(`${inv.stock_key}: Yesterday price = $${yesterdayPrice.toFixed(2)}, Yesterday value = $${yesterdayValue.toFixed(2)}`);
            });
            console.log(`Yesterday's total portfolio value: $${yesterdayPortfolioValue.toFixed(2)}`);
            
            const portfolioDailyPercentChange = yesterdayPortfolioValue > 0 ? 
                (portfolioDailyChange / yesterdayPortfolioValue) * 100 : 0;
            
            console.log(`Portfolio daily percent change: $${portfolioDailyChange.toFixed(2)} / $${yesterdayPortfolioValue.toFixed(2)} = ${portfolioDailyPercentChange.toFixed(2)}%`);
            console.log('===== END CALCULATION =====');
            
            // Identifies best and worst performers.
            
            // For overall performance since the purchase.
            const sortedByOverallPerformance = [...enriched].sort((a, b) => b.gainPercentage - a.gainPercentage);
            const bestPerformer = sortedByOverallPerformance.length > 0 ? sortedByOverallPerformance[0] : null;
            const worstPerformer = sortedByOverallPerformance.length > 0 ? sortedByOverallPerformance[sortedByOverallPerformance.length - 1] : null;
            
            // For the daily performance.
            const sortedByDailyPerformance = [...enriched].sort((a, b) => 
                b.dailyPerformance.dailyPercentChange - a.dailyPerformance.dailyPercentChange
            );
            const bestDailyPerformer = sortedByDailyPerformance.length > 0 ? sortedByDailyPerformance[0] : null;
            const worstDailyPerformer = sortedByDailyPerformance.length > 0 ? 
                sortedByDailyPerformance[sortedByDailyPerformance.length - 1] : null;
            
            // Updates the state
            setEnrichedInvestmentsData(enriched);
            setPerformanceSummary({
                totalInvested,
                totalCurrentValue,
                totalGain,
                percentageGain,
                bestPerformer,
                worstPerformer,
                dailyChange: portfolioDailyChange,
                dailyPercentChange: portfolioDailyPercentChange,
                bestDailyPerformer,
                worstDailyPerformer
            });
            
        } catch (err) {
            console.error('Error enriching investments data:', err);
        }
    };
    
    // Sets up real-time updates for investments.
    useEffect(() => {
        if (!enrichedInvestmentsData || enrichedInvestmentsData.length === 0) return;
        
        console.log(`Setting up real-time price updates for ${enrichedInvestmentsData.length} portfolio investments`);
        
        // Keeps track of all unsubscribe functions.
        const unsubscribeFunctions = [];
        
        // Creates a map of investment stocks for quick lookup.
        const investmentMap = {};
        enrichedInvestmentsData.forEach(inv => {
            if (inv.stock_key) {
                investmentMap[inv.stock_key] = inv;
            }
        });
        
        // Subscribes to price updates for each investment.
        Object.keys(investmentMap).forEach(stockKey => {
            const unsubscribe = stockDataRefreshManager.subscribe(
                'price',
                stockKey,
                (newPriceData) => {
                    if (!newPriceData || !newPriceData.latest_price) return;
                    
                    const latestPrice = newPriceData.latest_price;
                    const priceChange = newPriceData.day_change || 0;
                    const percentChange = newPriceData.change_percent || 0;
                    
                    setEnrichedInvestmentsData(currentData => {
                        if (currentData && currentData.length > 0) {
                            // Clone the current data
                            const updatedData = [...currentData];
                            
                            // Update only investments with matching stock key
                            updatedData.forEach(item => {
                                if (item.stock_key === stockKey) {
                                    // Update price information
                                    item.currentPrice = latestPrice;
                                    
                                    // Update daily performance metrics
                                    item.dailyPerformance = {
                                        dailyChange: priceChange,
                                        percentChange: percentChange,
                                        positionDailyChange: priceChange * item.quantity
                                    };
                                }
                            });
                            
                            // Calculate total portfolio daily change for UI updates
                            const dailyChange = updatedData.reduce((sum, item) => {
                                return sum + (item.dailyPerformance?.positionDailyChange || 0);
                            }, 0);
                            
                            // Calculate yesterday's portfolio value for percentage calculation
                            const yesterdayPortfolioValue = updatedData.reduce((sum, item) => {
                                const yesterdayPrice = (item.currentPrice || 0) - (item.dailyPerformance?.dailyChange || 0);
                                return sum + (yesterdayPrice * (item.quantity || 0));
                            }, 0);
                            
                            const dailyPercentChange = yesterdayPortfolioValue > 0 ? 
                                (dailyChange / yesterdayPortfolioValue) * 100 : 0;
                            
                            // Calculate summary data from the updated investments
                            const totalInvested = updatedData.reduce((sum, item) => sum + (item.purchaseValue || 0), 0);
                            const totalCurrentValue = updatedData.reduce((sum, item) => sum + (item.currentValue || 0), 0);
                            const totalGain = totalCurrentValue - totalInvested;
                            const percentageGain = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
                            
                            // Find best and worst performers
                            const sorted = [...updatedData].sort((a, b) => (b.gainPercentage || 0) - (a.gainPercentage || 0));
                            const bestPerformer = sorted.length > 0 ? sorted[0] : null;
                            const worstPerformer = sorted.length > 0 ? sorted[sorted.length - 1] : null;
                            
                            // Update performance summary
                            setPerformanceSummary({
                                totalInvested,
                                totalCurrentValue,
                                totalGain,
                                percentageGain,
                                bestPerformer,
                                worstPerformer,
                                dailyChange,
                                dailyPercentChange
                            });
                            
                            return updatedData;
                        }
                        return currentData;
                    });
                }
            );
            
            unsubscribeFunctions.push(unsubscribe);
        });
        
        //Cleans up subscriptions when component unmounts.
        return () => {
            unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
            console.log(`Cleaned up real-time price updates for portfolio investments`);
        };
    }, [enrichedInvestmentsData]);
    
    //Formats the currency values.
    const formatCurrency = (value) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
            return '$0.00';
        }
        
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numValue);
    };
    
    //Formats percentage values, handling NaN and undefined
    const formatPercentage = (value, includeSign = false) => {
        //Ensures value is a number
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
            return '0.00%';
        }
        
        const formattedValue = new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numValue / 100);
        
        if (includeSign && numValue > 0) {
            return `+${formattedValue}`;
        }
        
        return formattedValue;
    };
    
    //Gets risk tolerance display text and color.
    const getRiskInfo = (riskLevel) => {
        if (!riskLevel) {
            return { text: 'Unknown', color: '#6c757d' };
        }
        
        switch(riskLevel.toLowerCase()) {
            case 'low':
                return { text: 'Low', color: '#28a745' };
            case 'medium':
                return { text: 'Medium', color: '#ffc107' };
            case 'high':
                return { text: 'High', color: '#dc3545' };
            default:
                return { text: 'Unknown', color: '#6c757d' };
        }
    };
    
    //Getting risk info
    const riskInfo = getRiskInfo(portfolio?.risk_tolerance);

    //Renders top performers
    const renderPerformanceSection = () => {
        if (enrichedInvestmentsData.length === 0) {
            return (
                <div className="text-center p-4">
                    <p>No investment data available.</p>
                </div>
            );
        }

        return (
            <>
                <div className="performance-summary mb-4">
                    <Row>
                        <Col md={6} className="mb-3">
                            <Card className="performance-card">
                                <Card.Body>
                                    <h5>Investment Performance</h5>
                                    <div className="d-flex justify-content-between mb-2">
                                        <div>Total Invested:</div>
                                        <div>{formatCurrency(performanceSummary.totalInvested)}</div>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <div>Current Value:</div>
                                        <div>{formatCurrency(performanceSummary.totalCurrentValue)}</div>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <div>Total Gain/Loss:</div>
                                        <div className={performanceSummary.totalGain >= 0 ? 'text-success' : 'text-danger'}>
                                            {formatCurrency(performanceSummary.totalGain)}
                                            {' '}
                                            ({formatPercentage(performanceSummary.percentageGain, true)})
                                        </div>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={6} className="mb-3">
                            <Card className="performance-card">
                                <Card.Body>
                                    <h5 className="text-center mb-4">Top Historical Performers</h5>
                                    {performanceSummary.bestPerformer && (
                                        <div className="daily-performance-row">
                                            <div className="text-end performance-label">
                                                <Badge bg="success">Best Overall Return</Badge>
                                            </div>
                                            <div className="text-center performance-symbol">
                                                {performanceSummary.bestPerformer.stock_key}
                                            </div>
                                            <div className="text-success performance-value">
                                                <FaArrowUp className="me-1" />
                                                {formatPercentage(performanceSummary.bestPerformer.gainPercentage)}
                                            </div>
                                        </div>
                                    )}
                                    {performanceSummary.worstPerformer && (
                                        <div className="daily-performance-row">
                                            <div className="text-end performance-label">
                                                <Badge bg="danger">Worst Overall Return</Badge>
                                            </div>
                                            <div className="text-center performance-symbol">
                                                {performanceSummary.worstPerformer.stock_key}
                                            </div>
                                            <div className={`performance-value ${performanceSummary.worstPerformer.gainPercentage >= 0 ? 'text-success' : 'text-danger'}`}>
                                                {performanceSummary.worstPerformer.gainPercentage >= 0 ? 
                                                    <FaArrowUp className="me-1" /> : 
                                                    <FaArrowDown className="me-1" />
                                                }
                                                {formatPercentage(performanceSummary.worstPerformer.gainPercentage)}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex-grow-1 d-flex flex-column justify-content-end">
                                        <div className="mt-3 text-muted small text-center">
                                            <em>Performance calculated since the original purchase date.</em>
                                        </div>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </div>
                
                <h5>Investment Details</h5>
                <div className="table-responsive">
                    <Table striped hover className="investment-table">
                        <thead>
                            <tr>
                                <th>Stock</th>
                                <th>Quantity</th>
                                <th>Purchase Price</th>
                                <th>Current Price</th>
                                <th>Daily Change</th>
                                <th>Total Gain/Loss</th>
                                <th>Overall Return</th>
                            </tr>
                        </thead>
                        <tbody>
                            {enrichedInvestmentsData.map((investment, index) => (
                                <tr key={index}>
                                    <td>
                                        <div className="stock-name">{investment.stock_key}</div>
                                    </td>
                                    <td>{investment.quantity}</td>
                                    <td>{formatCurrency(investment.purchase_price)}</td>
                                    <td>{formatCurrency(investment.currentPrice)}</td>
                                    <td className={investment.dailyPerformance.dailyPercentChange >= 0 ? 'text-success' : 'text-danger'}>
                                        {investment.dailyPerformance.dailyPercentChange >= 0 ? 
                                            <FaArrowUp className="me-1" /> : 
                                            <FaArrowDown className="me-1" />
                                        }
                                        {formatPercentage(investment.dailyPerformance.dailyPercentChange)}
                                    </td>
                                    <td>{formatCurrency(investment.gainValue)}</td>
                                    <td className={investment.gainPercentage >= 0 ? 'text-success' : 'text-danger'}>
                                        {investment.gainPercentage >= 0 ? 
                                            <FaArrowUp className="me-1" /> : 
                                            <FaArrowDown className="me-1" />
                                        }
                                        {formatPercentage(investment.gainPercentage)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            </>
        );
    };
    
    return (
        <div className="portfolio-tab">
            {error && (
                <Alert variant="warning" className="mb-4">
                    {error}
                </Alert>
            )}
            
            <h2>Portfolio Overview</h2>
            
            <Row className="mb-4">
                <Col md={3} sm={6} className="mb-3">
                    <Card className="portfolio-stat-card">
                        <Card.Body>
                            <div className="portfolio-stat-icon">
                                <FaChartLine />
                            </div>
                            <h3 className="portfolio-stat-title">Net Worth</h3>
                            <p className="portfolio-stat-value">{formatCurrency(portfolio?.networth)}</p>
                            <p className="portfolio-stat-secondary">
                                Total Value
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
                
                <Col md={3} sm={6} className="mb-3">
                    <Card className="portfolio-stat-card">
                        <Card.Body>
                            <div className="portfolio-stat-icon">
                                <FaWallet />
                            </div>
                            <h3 className="portfolio-stat-title">Cash Balance</h3>
                            <p className="portfolio-stat-value">{formatCurrency(portfolio?.balance)}</p>
                            <p className="portfolio-stat-secondary">
                                Available For Trading
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
                
                <Col md={3} sm={6} className="mb-3">
                    <Card className="portfolio-stat-card">
                        <Card.Body>
                            <div className="portfolio-stat-icon">
                                <FaCoins />
                            </div>
                            <h3 className="portfolio-stat-title">Asset Value</h3>
                            <p className="portfolio-stat-value">{formatCurrency(portfolio?.total_assets)}</p>
                            <p className="portfolio-stat-secondary">
                                Total Invested
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
                
                <Col md={3} sm={6} className="mb-3">
                    <Card className="portfolio-stat-card">
                        <Card.Body>
                            <div className="portfolio-stat-icon">
                                <FaChartBar />
                            </div>
                            <h3 className="portfolio-stat-title">Risk Profile</h3>
                            <p className="portfolio-stat-value" style={{ color: riskInfo.color }}>{riskInfo.text}</p>
                            <p className="portfolio-stat-secondary">
                                Investment Strategy
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            
            <Row className="mb-4">
                <Col md={12}>
                    <Card className="daily-performance-card">
                        <Card.Header>
                            <h4 className="mb-0">Daily Performance</h4>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={6} className="mb-3">
                                    <div className="daily-performance-summary">
                                        <h5>Portfolio Daily Change</h5>
                                        <div className="d-flex align-items-center mb-3">
                                            <div className={`daily-change-value ${performanceSummary.dailyPercentChange >= 0 ? 'text-success' : 'text-danger'} fs-4 fw-bold`}>
                                                {performanceSummary.dailyPercentChange >= 0 ? (
                                                    <FaArrowUp className="me-2" />
                                                ) : (
                                                    <FaArrowDown className="me-2" />
                                                )}
                                                {formatCurrency(performanceSummary.dailyChange)} 
                                                <span className="ms-2">
                                                    ({formatPercentage(performanceSummary.dailyPercentChange, true)})
                                                </span>
                                            </div>
                                        </div>
                                        <div className="daily-change-heading text-center mb-3">
                                            <p className="text-muted mb-0">Last updated: {new Date().toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                </Col>
                                
                                <Col md={6}>
                                    <h5 className="text-center mb-4">Today's Best & Worst</h5>
                                    {performanceSummary.bestDailyPerformer && (
                                        <div className="daily-performance-row">
                                            <div className="text-end performance-label">
                                                <Badge bg="success">Top Gainer</Badge>
                                            </div>
                                            <div className="text-center performance-symbol">
                                                {performanceSummary.bestDailyPerformer.stock_key}
                                            </div>
                                            <div className="text-success performance-value">
                                                <FaArrowUp className="me-1" />
                                                {formatPercentage(performanceSummary.bestDailyPerformer.dailyPerformance.dailyPercentChange)}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {performanceSummary.worstDailyPerformer && (
                                        <div className="daily-performance-row mt-3">
                                            <div className="text-end performance-label">
                                                <Badge bg="danger">Top Loser</Badge>
                                            </div>
                                            <div className="text-center performance-symbol">
                                                {performanceSummary.worstDailyPerformer.stock_key}
                                            </div>
                                            <div className={`performance-value ${performanceSummary.worstDailyPerformer.dailyPerformance.dailyPercentChange >= 0 ? 'text-success' : 'text-danger'}`}>
                                                {performanceSummary.worstDailyPerformer.dailyPerformance.dailyPercentChange >= 0 ? 
                                                    <FaArrowUp className="me-1" /> : 
                                                    <FaArrowDown className="me-1" />
                                                }
                                                {formatPercentage(performanceSummary.worstDailyPerformer.dailyPerformance.dailyPercentChange)}
                                            </div>
                                        </div>
                                    )}
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="mb-4">
                <Col md={12}>
                    <Card>
                        <Card.Header>
                            <h4 className="mb-0">Performance Tracking</h4>
                        </Card.Header>
                        <Card.Body>
                            {loading ? (
                                <div className="text-center p-4">
                                    <p>Loading investment data...</p>
                                </div>
                            ) : (
                                renderPerformanceSection()
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            
            <AssetAllocationWidget userId={userId} />
        </div>
    );
}

export default PortfolioTab; 