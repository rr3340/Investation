import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Alert, Form, Spinner, Table, Badge } from 'react-bootstrap';
import { FaExchangeAlt, FaCheckCircle, FaInfoCircle, FaShoppingCart, FaSellsy, FaPlus, FaMinus, FaWallet, FaCoins, FaHistory } from 'react-icons/fa';
import { useAuth } from '../../../lib/hooks/useAuth';
import { stockApi, investmentApi, portfolioApi, tradeHistoryApi } from '../../../lib/api';
import './TransactionsTab.css';
import { formatDateTime } from '../../../lib/utils/dateUtils';
import { stockDataRefreshManager } from '../../../services';

const TransactionsTab = ({ stock, stockKey }) => {
  const { currentUser } = useAuth();
  const [tradeType, setTradeType] = useState('buy');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [priceData, setPriceData] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [userPosition, setUserPosition] = useState(null);
  const [loadingPosition, setLoadingPosition] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [portfolioData, setPortfolioData] = useState(null);
  const [latestPrice, setLatestPrice] = useState(0);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // Fetch the latest price data, and then subscribeb to real time updates, then clean.
  useEffect(() => {
    const fetchLatestPrice = async () => {
      try {
        setLoadingPrice(true);
        const data = await stockApi.getLatestPrice(stockKey);
        setPriceData(data);
        setLatestPrice(data?.latest_price || 0);
        
        // Record that we just manually updated this stock's price
        stockDataRefreshManager.recordManualUpdate('price', stockKey);
      } catch (err) {
        console.error('Error fetching price:', err);
      } finally {
        setLoadingPrice(false);
      }
    };

    if (stockKey) {
      fetchLatestPrice();
    }
  }, [stockKey]);

  useEffect(() => {
    if (!stockKey) return;
    
    console.log(`Setting up real-time price updates for ${stockKey} in TransactionsTab`);
    
    const unsubscribe = stockDataRefreshManager.subscribe(
      'price',
      stockKey,
      (newPriceData) => {
        console.log(`Received real-time price update for ${stockKey} in TransactionsTab:`, newPriceData);
        setPriceData(newPriceData);
        setLatestPrice(newPriceData?.latest_price || 0);
      }
    );
    
    return () => {
      unsubscribe();
      console.log(`Cleaned up real-time price updates for ${stockKey} in TransactionsTab`);
    };
  }, [stockKey]);

  useEffect(() => {
    // Check if there's a trade action in the localStorage.
    const tradeAction = localStorage.getItem('stockTradeAction');
    if (tradeAction === 'buy' || tradeAction === 'sell') {
      setTradeType(tradeAction);
      localStorage.removeItem('stockTradeAction');
    }
  }, []);

  //Fetch the user's position in this stock and portfolio data.
  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser?.id || !stockKey) return;
      
      try {
        setLoadingPosition(true);
        
        console.log(`Fetching data for user ID ${currentUser.id} and stock ${stockKey.toUpperCase()}`);
        
        // Format stock key.
        const formattedStockKey = stockKey.toUpperCase();
        
        // Fetch the portfolio data to get the user balance.
        try {
          const portfolio = await portfolioApi.getPortfolioSummary(currentUser.id);
          setPortfolioData(portfolio);
          setUserBalance(portfolio?.balance || 0);
          console.log('Portfolio data loaded:', portfolio);
        } catch (portfolioError) {
          console.error('Error fetching portfolio:', portfolioError);
          // Default to 0 if API fails
          setPortfolioData(null);
          setUserBalance(0);
        }
        
        // Fetch user's position in a specific stock.
        try {
          const position = await investmentApi.getUserStockPosition(currentUser.id, formattedStockKey);
          setUserPosition(position);
          console.log('User position data loaded:', position);
        } catch (positionError) {
          console.error('Error fetching position:', positionError);
          setUserPosition(null);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      } finally {
        setLoadingPosition(false);
      }
    };

    fetchUserData();
  }, [currentUser, stockKey, success]);

  // Fetch the user's trade history for a specific stock.
  useEffect(() => {
    const fetchTradeHistory = async () => {
      if (!currentUser) return;
      
      try {
        setLoadingHistory(true);
        setHistoryError(null);
        
        console.log(`Fetching trade history for user ID: ${currentUser.id} and stock: ${stockKey}`);
        
        try {
          const rawResponse = await tradeHistoryApi.getUserTradeHistory(currentUser.id);
          console.log('Raw trade history response:', rawResponse);
          
          const history = await tradeHistoryApi.getUserStockTradeHistory(currentUser.id, stockKey);
          console.log('Filtered trade history for this stock:', history);
          
          if (Array.isArray(history)) {
            history.sort((a, b) => new Date(b.trade_date) - new Date(a.trade_date));
            setTradeHistory(history);
          } else {
            console.error('Trade history is not an array:', history);
            setHistoryError('Trade history data format is unexpected');
            setTradeHistory([]);
          }
        } catch (apiError) {
          if (apiError.response) {
            if (apiError.response.status === 401) {
              console.error('Authentication error:', apiError);
              setHistoryError('Authentication failed. Please log in again.');
            } else if (apiError.response.status === 404) {
              console.error('API endpoint not found:', apiError);
              setHistoryError('Trade history service not available. Please try again later.');
            } else {
              console.error('API error:', apiError);
              setHistoryError(`Error: ${apiError.response.data.message || apiError.message}`);
            }
          } else {
            console.error('Error fetching trade history:', apiError);
            setHistoryError(`Failed to load your trade history: ${apiError.message || 'Unknown error'}`);
          }
          setTradeHistory([]);
        }
      } catch (err) {
        console.error('Unexpected error in trade history fetch:', err);
        setHistoryError(`An unexpected error occurred: ${err.message}`);
        setTradeHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };
    
    fetchTradeHistory();
  }, [currentUser, stockKey, success]);

  //When a trade is successful, refresh.
  useEffect(() => {
    if (success) {
      const refreshTradeHistory = async () => {
        try {
          const history = await tradeHistoryApi.getUserStockTradeHistory(currentUser.id, stockKey);
          history.sort((a, b) => new Date(b.trade_date) - new Date(a.trade_date));
          setTradeHistory(history);
        } catch (err) {
          console.error('Error refreshing trade history:', err);
        }
      };
      
      refreshTradeHistory();
    }
  }, [success, currentUser, stockKey]);

  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.00%';
    }
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  // Handle the quantity change, incrementing and decrementing.
  const handleQuantityChange = (e) => {
    const newQuantity = parseInt(e.target.value, 10);
    if (newQuantity > 0) {
      setQuantity(newQuantity);
    }
  };

  const incrementQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  // Handle trade type.
  const handleTradeTypeChange = (type) => {
    setTradeType(type);
    setError(null);
    setSuccess(null);
  };

  // Calculates the total.
  const calculateTotal = () => {
    if (!priceData || !priceData.latest_price) return 0;
    return priceData.latest_price * quantity;
  };

  // Validates the trade.
  const validateTrade = () => {
    if (!currentUser?.id) {
      setError('You must be logged in to trade');
      return false;
    }

    if (!stockKey) {
      setError('Invalid stock symbol');
      return false;
    }

    if (quantity <= 0) {
      setError('Quantity must be greater than 0');
      return false;
    }

    if (tradeType === 'buy') {
      const total = calculateTotal();
      if (userBalance !== null && total > userBalance) {
        setError(`Insufficient funds. You need ${formatCurrency(total)} but your balance is ${formatCurrency(userBalance)}.`);
        return false;
      }
    } else {//This sells.
      if (!userPosition || !userPosition.quantity || userPosition.quantity < quantity) {
        setError(`Insufficient shares. You can't sell ${quantity} shares because you only have ${userPosition ? userPosition.quantity : 0}.`);
        return false;
      }
    }

    return true;
  };

  // Executes the trade.
  const executeTrade = async () => {
    setError(null);
    setSuccess(null);
    
    // Validates the trade.
    if (!validateTrade()) {
      return;
    }

    setLoading(true);

    try {
      if (tradeType === 'buy') {
        await stockApi.buyStock(currentUser.id, stockKey, quantity);
        setSuccess(`Successfully purchased ${quantity} shares of ${stockKey}`);
      } else {
        await stockApi.sellStock(currentUser.id, stockKey, quantity);
        setSuccess(`Successfully sold ${quantity} shares of ${stockKey}`);
      }
      
      // Refreshes the price data after the trade, and then the quantity.
      const newPriceData = await stockApi.getLatestPrice(stockKey);
      setPriceData(newPriceData);
      
      setQuantity(1);
      
    } catch (err) {
      console.error(`Error ${tradeType === 'buy' ? 'buying' : 'selling'} stock:`, err);
      setError(err.message || `Failed to ${tradeType === 'buy' ? 'buy' : 'sell'} stock. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Renders a trade history item.
  const renderTradeHistoryItem = (trade) => {
    const isBuy = trade.trade_type.toUpperCase() === 'BUY';
    
    return (
      <tr key={trade.trade_id} className={isBuy ? 'buy-trade' : 'sell-trade'}>
        <td>
          <Badge bg={isBuy ? 'success' : 'danger'}>
            {isBuy ? 'BUY' : 'SELL'}
          </Badge>
        </td>
        <td>{trade.quantity}</td>
        <td>{formatCurrency(trade.trade_price)}</td>
        <td>{formatCurrency(trade.quantity * trade.trade_price)}</td>
        <td>{formatDateTime(trade.trade_date)}</td>
      </tr>
    );
  };

  // Renders the trade history section.
  const renderTradeHistory = () => {
    return (
      <Card className="trade-history-card">
        <Card.Header>
          <h5 className="mb-0"><FaHistory className="me-2" /> Your Trading History</h5>
        </Card.Header>
        <Card.Body>
          {!currentUser ? (
            <div className="text-center py-4">
              <p>Please log in to view your trade history.</p>
            </div>
          ) : loadingHistory ? (
            <div className="text-center py-4">
              <Spinner animation="border" role="status" variant="primary">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : historyError ? (
            <Alert variant="danger">{historyError}</Alert>
          ) : tradeHistory.length === 0 ? (
            <div className="text-center py-4">
              <p>You haven't made any trades for {stockKey} yet.</p>
            </div>
          ) : (
            <div className="trade-history-table-wrapper">
              <Table responsive striped hover className="trade-history-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Shares</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeHistory.map(renderTradeHistoryItem)}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    );
  };

  const calculateRealtimeProfitLoss = () => {
    if (!userPosition || !priceData || !priceData.latest_price) {
      return null;
    }
    
    // Calculates the real-time values.
    const currentValue = userPosition.quantity * priceData.latest_price;
    const purchasedValue = userPosition.quantity * userPosition.averageCost;
    const profitLoss = currentValue - purchasedValue;
    
    // Calculates the percentage with error handling.
    let profitLossPercentage = 0;
    if (purchasedValue > 0) {
      profitLossPercentage = (profitLoss / purchasedValue) * 100;
    }
    
    return {
      profitLoss: parseFloat(profitLoss.toFixed(2)),
      profitLossPercentage: parseFloat(profitLossPercentage.toFixed(2)),
      isRealtime: true
    };
  };
  
  // Gets the appropriate profit or loss data, either getting real time data or the user's position to calculate.
  const getProfitLossData = () => {
    const realtimeData = calculateRealtimeProfitLoss();
    
    if (realtimeData) {
      return realtimeData;
    }
    
    if (userPosition) {
      return {
        profitLoss: userPosition.profitLoss || 0,
        profitLossPercentage: userPosition.profitLossPercentage || 0,
        isRealtime: false
      };
    }
    
    return { profitLoss: 0, profitLossPercentage: 0, isRealtime: false };
  };

  return (
    <div className="transactions-tab">
      {currentUser ? (
        <Row>
          <Col md={7}>
            <Card className="trade-card mb-4">
              <Card.Header>
                <h5 className="mb-0">Trade {stock.name} ({stockKey})</h5>
              </Card.Header>
              <Card.Body>
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>Trade Type</Form.Label>
                    <div className="trade-type-toggle">
                      <Button 
                        variant={tradeType === 'buy' ? "success" : "outline-success"} 
                        className="me-2 w-50"
                        onClick={() => handleTradeTypeChange('buy')}
                      >
                        <FaShoppingCart className="me-2" /> Buy
                      </Button>
                      <Button 
                        variant={tradeType === 'sell' ? "danger" : "outline-danger"} 
                        className="w-50"
                        onClick={() => handleTradeTypeChange('sell')}
                        disabled={!userPosition || !userPosition.quantity || userPosition.quantity <= 0}
                      >
                        <FaSellsy className="me-2" /> Sell
                      </Button>
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Current Price</Form.Label>
                    <div className="input-group">
                      <span className="input-group-text">$</span>
                      <Form.Control
                        type="text"
                        value={loadingPrice ? 'Loading...' : (priceData ? priceData.latest_price.toFixed(2) : 'N/A')}
                        readOnly
                        disabled
                      />
                    </div>
                    {loadingPrice && (
                      <small className="text-muted">
                        <Spinner animation="border" size="sm" className="me-1" /> Fetching latest price...
                      </small>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Quantity</Form.Label>
                    <div className="quantity-controls">
                      <button 
                        type="button"
                        className="quantity-btn"
                        onClick={decrementQuantity}
                        disabled={quantity <= 1 || loading}
                      >
                        <FaMinus />
                      </button>
                      <Form.Control
                        type="number"
                        min="1"
                        className="quantity-input"
                        value={quantity}
                        onChange={handleQuantityChange}
                        disabled={loading}
                      />
                      <button 
                        type="button"
                        className="quantity-btn"
                        onClick={incrementQuantity}
                        disabled={loading}
                      >
                        <FaPlus />
                      </button>
                    </div>
                    {tradeType === 'sell' && userPosition && (
                      <small className="text-muted">
                        You have {userPosition.quantity} shares available to sell
                      </small>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Total Value</Form.Label>
                    <div className="input-group">
                      <span className="input-group-text">$</span>
                      <Form.Control
                        type="text"
                        value={loadingPrice ? 'Calculating...' : calculateTotal().toFixed(2)}
                        readOnly
                        disabled
                      />
                    </div>
                    {tradeType === 'buy' && userBalance !== null && (
                      <small className={calculateTotal() > userBalance ? 'text-danger' : 'text-muted'}>
                        {calculateTotal() > userBalance ? (
                          <><FaInfoCircle className="me-1" /> Insufficient funds</>
                        ) : (
                          <><FaWallet className="me-1" /> Your balance: {formatCurrency(userBalance)}</>
                        )}
                      </small>
                    )}
                  </Form.Group>

                  <div className="trade-summary">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Action:</span>
                      <span className={tradeType === 'buy' ? 'positive' : 'negative'}>
                        {tradeType === 'buy' ? 'Buy' : 'Sell'} {stock.name}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Quantity:</span>
                      <span>{quantity} shares</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Price per share:</span>
                      <span>{priceData ? formatCurrency(priceData.latest_price) : 'N/A'}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-0">
                      <span><strong>Total:</strong></span>
                      <span><strong>{formatCurrency(calculateTotal())}</strong></span>
                    </div>
                  </div>

                  {error && (
                    <Alert variant="danger" className="mb-3">
                      <FaInfoCircle className="me-2" />
                      {error}
                    </Alert>
                  )}

                  {success && (
                    <Alert variant="success" className="mb-3">
                      <FaCheckCircle className="me-2" />
                      {success}
                    </Alert>
                  )}

                  <div className="d-grid">
                    <Button
                      variant={tradeType === 'buy' ? "success" : "danger"}
                      size="lg"
                      onClick={executeTrade}
                      disabled={loading || loadingPrice || !priceData}
                    >
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          {tradeType === 'buy' ? 'Buying...' : 'Selling...'}
                        </>
                      ) : (
                        <>
                          {tradeType === 'buy' ? (
                            <>
                              <FaShoppingCart className="me-2" /> Buy {quantity} {quantity === 1 ? 'Share' : 'Shares'}
                            </>
                          ) : (
                            <>
                              <FaSellsy className="me-2" /> Sell {quantity} {quantity === 1 ? 'Share' : 'Shares'}
                            </>
                          )}
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={5}>
            <Card className="info-card position-card mb-4">
              <Card.Header>
                <h5 className="mb-0">Your Position</h5>
              </Card.Header>
              <Card.Body>
                {loadingPosition ? (
                  <div className="text-center py-3">
                    <Spinner animation="border" size="sm" /> Loading your position...
                  </div>
                ) : userPosition && userPosition.quantity > 0 ? (
                  <div className="position-details">
                    <div className="position-detail">
                      <span className="detail-label">Shares Owned</span>
                      <span className="detail-value">{userPosition.quantity}</span>
                    </div>
                    <div className="position-detail">
                      <span className="detail-label">Average Cost</span>
                      <span className="detail-value">{formatCurrency(userPosition.averageCost)}</span>
                    </div>
                    <div className="position-detail">
                      <span className="detail-label">Current Value</span>
                      <span className="detail-value">
                        {formatCurrency(priceData && userPosition ? userPosition.quantity * priceData.latest_price : userPosition.currentValue)}
                      </span>
                    </div>
                    <div className="position-detail">
                      <span className="detail-label">Profit/Loss</span>
                      {(() => {
                        const plData = getProfitLossData();
                        return (
                          <span className={`detail-value ${plData.profitLoss >= 0 ? 'positive' : 'negative'}`}>
                            {formatCurrency(plData.profitLoss)} ({formatPercentage(plData.profitLossPercentage)})
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="no-position text-center py-3">
                    <FaInfoCircle className="mb-2" size={24} />
                    <p className="mb-0">You don't own any shares of {stockKey}.</p>
                    <small className="text-muted">Use the trading panel to buy shares.</small>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : (
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>
              <FaExchangeAlt className="me-2" style={{ fontSize: '1.5rem' }} />
              Please Log In to Trade
            </Card.Title>
            <p>
              You'll need to log in to buy or sell shares of {stock.name} ({stockKey}).
            </p>
            <Button variant="primary" href="/login">
              Log In
            </Button>
          </Card.Body>
        </Card>
      )}
      
      {renderTradeHistory()}
    </div>
  );
};

export default TransactionsTab; 