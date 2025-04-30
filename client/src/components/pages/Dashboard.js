import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/hooks/useAuth';
import { portfolioApi, investmentApi, stockApi, transactionApi, watchlistApi } from '../../lib/api';
import { FaChartLine, FaWallet, FaCoins, FaChartBar, FaUser } from 'react-icons/fa';
import { formatCurrency, formatPercentage } from '../../lib/utils/formatUtils';
import { formatDate } from '../../lib/utils/dateUtils';
import './Dashboard.css';

const Dashboard = () => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [portfolioData, setPortfolioData] = useState({
        netWorth: 0,
        cashBalance: 0,
        totalAssets: 0,
        todayChange: 0,
        todayChangePercent: 0
    });
    const [transactions, setTransactions] = useState([]);
    const [watchlist, setWatchlist] = useState([]);
    
    // Fetch all dashboard data
    useEffect(() => {
        if (!currentUser || !currentUser.id) return;
        
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                // Fetches the portfolio summary data.
                const portfolioSummary = await portfolioApi.getPortfolioSummary(currentUser.id);
                console.log('Portfolio summary:', portfolioSummary);
                
                // Fetches the networth.
                const networthData = await portfolioApi.getNetWorth(currentUser.id);
                console.log('Networth data:', networthData);
                
                // Fetches the unrealized gains.
                const gainsData = await portfolioApi.getUnrealizedGains(currentUser.id);
                console.log('Unrealized gains data:', gainsData);
                
                // Updates the portfolio data state.
                setPortfolioData({
                    netWorth: networthData?.networth || 0,
                    cashBalance: portfolioSummary?.balance || 0,
                    totalAssets: portfolioSummary?.total_assets || 0,
                    todayChange: gainsData?.daily_change || 0,
                    todayChangePercent: gainsData?.daily_percentage || 0
                });
                
                // Fetches the recent transactions.
                const recentTransactions = await transactionApi.getRecentTransactions(currentUser.id, 3);
                console.log('Recent transactions:', recentTransactions);
                setTransactions(recentTransactions || []);
                
                // Fetches the watchlist with prices.
                const watchlistItems = await watchlistApi.getUserWatchlist(currentUser.id);
                console.log('Watchlist items:', watchlistItems);
                
                // Enriches watchlist with latest prices.
                const enrichedWatchlist = await Promise.all(
                    (watchlistItems || []).slice(0, 3).map(async (item) => {
                        try {
                            const priceData = await stockApi.getLatestPrice(item.stock_key);
                            return {
                                symbol: item.stock_key,
                                price: priceData.latest_price || 0,
                                change: priceData.change_percent || 0
                            };
                        } catch (err) {
                            console.error(`Error fetching price for ${item.stock_key}:`, err);
                            return {
                                symbol: item.stock_key,
                                price: 0,
                                change: 0
                            };
                        }
                    })
                );
                
                setWatchlist(enrichedWatchlist);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchDashboardData();
    }, [currentUser]);
    
    return (
        <div className="dashboard-page">
            <Container className="dashboard-container">
                <Row className="mb-4">
                    <Col>
                        <h1 className="dashboard-title">Dashboard</h1>
                        <p className="dashboard-welcome">Welcome back, {currentUser?.display_name || currentUser?.username}!</p>
                    </Col>
                </Row>
                
                {loading ? (
                    <div className="text-center my-5">
                        <Spinner animation="border" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </Spinner>
                        <p className="mt-2">Loading your dashboard data...</p>
                    </div>
                ) : (
                    <>
                        <Row className="mb-4">
                            <Col md={6} lg={3} className="mb-3">
                                <Card className="dashboard-card">
                                    <Card.Body>
                                        <div className="dashboard-card-icon">
                                            <FaChartLine />
                                        </div>
                                        <div className="dashboard-card-content">
                                            <h3 className="dashboard-card-title">Net Worth</h3>
                                            <p className="dashboard-card-value">{formatCurrency(portfolioData.netWorth)}</p>
                                            <p className={`dashboard-card-change ${portfolioData.todayChangePercent >= 0 ? 'positive' : 'negative'}`}>
                                                {formatPercentage(portfolioData.todayChangePercent, false, true)} today
                                            </p>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            
                            <Col md={6} lg={3} className="mb-3">
                                <Card className="dashboard-card">
                                    <Card.Body>
                                        <div className="dashboard-card-icon">
                                            <FaWallet />
                                        </div>
                                        <div className="dashboard-card-content">
                                            <h3 className="dashboard-card-title">Cash Balance</h3>
                                            <p className="dashboard-card-value">{formatCurrency(portfolioData.cashBalance)}</p>
                                            <p className="dashboard-card-label">Available For Trading</p>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            
                            <Col md={6} lg={3} className="mb-3">
                                <Card className="dashboard-card">
                                    <Card.Body>
                                        <div className="dashboard-card-icon">
                                            <FaCoins />
                                        </div>
                                        <div className="dashboard-card-content">
                                            <h3 className="dashboard-card-title">Total Assets</h3>
                                            <p className="dashboard-card-value">{formatCurrency(portfolioData.totalAssets)}</p>
                                            <p className="dashboard-card-label">Total Invested</p>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            
                            <Col md={6} lg={3} className="mb-3">
                                <Card className="dashboard-card">
                                    <Card.Body>
                                        <div className="dashboard-card-icon">
                                            <FaUser />
                                        </div>
                                        <div className="dashboard-card-content">
                                            <h3 className="dashboard-card-title">Profile</h3>
                                            <p className="dashboard-card-value">View Profile</p>
                                            <Link to={`/profile/${currentUser?.id}`} className="dashboard-card-link">
                                                Go to Profile
                                            </Link>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                        
                        <Row>
                            <Col lg={8} className="mb-4">
                                <Card className="dashboard-section-card">
                                    <Card.Header className="dashboard-section-header">
                                        <h2>Portfolio Performance</h2>
                                    </Card.Header>
                                    <Card.Body>
                                        <div className="chart-placeholder">
                                            <FaChartBar className="chart-icon" />
                                            <p>Portfolio performance chart will be displayed here.</p>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            
                            <Col lg={4} className="mb-4">
                                <Card className="dashboard-section-card">
                                    <Card.Header className="dashboard-section-header">
                                        <h2>Watchlist Highlights</h2>
                                    </Card.Header>
                                    <Card.Body>
                                        <div className="watchlist-highlights">
                                            {watchlist.length > 0 ? (
                                                <>
                                                    <ul className="watchlist-list">
                                                        {watchlist.map((item, index) => (
                                                            <li key={index} className="watchlist-item">
                                                                <Link to={`/stock/${item.symbol}`} className="watchlist-symbol">
                                                                    {item.symbol}
                                                                </Link>
                                                                <span className="watchlist-price">{formatCurrency(item.price)}</span>
                                                                <span className={`watchlist-change ${item.change >= 0 ? 'positive' : 'negative'}`}>
                                                                    {formatPercentage(item.change, false, true)}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <div className="text-center mt-3">
                                                        <Button variant="outline-primary" as={Link} to="/watchlist">
                                                            View Full Watchlist
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <p className="text-center">No watchlist items. Add stocks to your watchlist.</p>
                                            )}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                        
                        <Row>
                            <Col>
                                <Card className="dashboard-section-card">
                                    <Card.Header className="dashboard-section-header">
                                        <h2>Recent Transactions</h2>
                                    </Card.Header>
                                    <Card.Body>
                                        <div className="recent-transactions">
                                            {transactions.length > 0 ? (
                                                <>
                                                    {transactions.map((transaction) => (
                                                        <div key={transaction.id} className="transaction-item">
                                                            <div className={`transaction-type ${transaction.type.toLowerCase()}`}>
                                                                {transaction.type.toUpperCase()}
                                                            </div>
                                                            <div className="transaction-details">
                                                                <div className="transaction-symbol">{transaction.stock_key}</div>
                                                                <div className="transaction-quantity">{transaction.quantity} shares</div>
                                                            </div>
                                                            <div className="transaction-price">
                                                                {formatCurrency(transaction.price)}
                                                            </div>
                                                            <div className="transaction-date">
                                                                {formatDate(transaction.date || transaction.transaction_date)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </>
                                            ) : (
                                                <p className="text-center">No recent transactions.</p>
                                            )}
                                            <div className="text-center mt-3">
                                                <Button variant="outline-primary" as={Link} to="/transactions">
                                                    View All Transactions
                                                </Button>
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    </>
                )}
            </Container>
        </div>
    );
};

export default Dashboard; 