import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { stockApi, watchlistApi } from '../../lib/api';
import { useAuth } from '../../lib/hooks/useAuth';
import { FaSearch, FaStar, FaChartLine, FaFilter, FaSort, FaHistory, FaSignInAlt } from 'react-icons/fa';
import './StockDirectory.css';
import StockList from './StockList';
import { formatNumberWithCommas } from '../../lib/utils/numberUtils';
import { stockDataRefreshManager } from '../../services';

const StockDirectory = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // State for stocks and filtering
  const [stocks, setStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [userWatchlist, setUserWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    sector: 'all',
    priceRange: [0, 5000],
    sortBy: 'name'
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const fetchAllStocksData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching all stocks data...');
      
      // Basic stock information.
      const stocksData = await stockApi.getAllStocks();
      console.log('Stocks data loaded:', stocksData);
      
      if (!stocksData || stocksData.length === 0) {
        console.warn('No stocks found in the database');
        setStocks([]);
        setFilteredStocks([]);
        setLoading(false);
        return;
      }
      
      // Proceses stocks for consistent field names, fetching the latest price for each stock as well.
      const processedStocks = await Promise.all(
        stocksData.map(async (stock) => {
          try {
            const priceData = await stockApi.getLatestPrice(stock.stock_key);
            
            return {
              ...stock,
              stock_name: stock.name || stock.stock_name || `Stock ${stock.stock_key}`,
              current_price: priceData?.latest_price || 0,
              change_percent: priceData?.change_percent || 0
            };
          } catch (priceError) {
            console.error(`Error fetching price for ${stock.stock_key}:`, priceError);
            return {
              ...stock,
              stock_name: stock.name || stock.stock_name || `Stock ${stock.stock_key}`,
              current_price: 0,
              change_percent: 0
            };
          }
        })
      );
      
      console.log('Processed stocks with prices:', processedStocks);
      setStocks(processedStocks);
      setFilteredStocks(processedStocks);
      
      // If user is logged in, then fetch the watchlist.
      if (currentUser) {
        try {
          const watchlist = await watchlistApi.getUserWatchlist(currentUser.id);
          console.log('User watchlist loaded:', watchlist);
          setUserWatchlist(watchlist);
        } catch (watchlistError) {
          console.error('Error fetching watchlist:', watchlistError);
          setUserWatchlist([]);
        }
      }
      
    } catch (error) {
      console.error('Error fetching stocks data:', error);
      setError(`Failed to load stocks: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch the stocks data using useEffect.
  useEffect(() => {
    const fetchStocks = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const stocksData = await stockApi.getAllStocks();
        
        if (!stocksData || stocksData.length === 0) {
          console.warn('No stocks found in the database');
          setStocks([]);
          setFilteredStocks([]);
          setLoading(false);
          return;
        }
        
        console.log('Fetched stock data:', stocksData);
        
        //Fetching price data for each stock.
        const updatedStocksWithPrice = await Promise.all(
          stocksData.map(async (stock) => {
            try {
              const priceData = await stockApi.getLatestPrice(stock.stock_key);
              
              stockDataRefreshManager.recordManualUpdate('price', stock.stock_key);
              
              return {
                ...stock,
                stock_name: stock.name || stock.stock_name || `Stock ${stock.stock_key}`,
                current_price: priceData?.latest_price || 0,
                change_percent: priceData?.change_percent || 0,
                priceData: priceData
              };
            } catch (error) {
              console.error(`Error fetching price for ${stock.stock_key}:`, error);
              return {
                ...stock,
                stock_name: stock.name || stock.stock_name || `Stock ${stock.stock_key}`,
                current_price: 0,
                change_percent: 0,
                priceData: null
              };
            }
          })
        );
        
        console.log('Processed stocks with prices:', updatedStocksWithPrice);
        setStocks(updatedStocksWithPrice);
        setFilteredStocks(updatedStocksWithPrice);
        
        //Fetching user watchlist
        if (currentUser) {
          try {
            const watchlist = await watchlistApi.getUserWatchlist(currentUser.id);
            console.log('User watchlist loaded:', watchlist);
            setUserWatchlist(watchlist);
          } catch (watchlistError) {
            console.error('Error fetching watchlist:', watchlistError);
            setUserWatchlist([]);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching stocks:', error);
        setError('Failed to load stocks. Please try again.');
        setLoading(false);
      }
    };
    
    fetchStocks();
  }, [currentUser]);
  
  // Sets up the real-time updates for stock prices.
  useEffect(() => {
    if (!stocks || stocks.length === 0) return;
    
    console.log(`Setting up real-time price updates for ${stocks.length} stocks`);
    
    // Keep strack of the unsubscribe functions.
    const unsubscribeFunctions = [];
    
    // Subscribes to the price updates for each stock.
    stocks.forEach(stock => {
      const unsubscribe = stockDataRefreshManager.subscribe(
        'price',
        stock.stock_key,
        (newPriceData) => {
          setStocks(currentStocks => {
            const updatedStocks = currentStocks.map(s => {
              if (s.stock_key === stock.stock_key) {
                return {
                  ...s,
                  current_price: newPriceData?.latest_price || 0,
                  change_percent: newPriceData?.change_percent || 0,
                  priceData: newPriceData
                };
              }
              return s;
            });
            
            return updatedStocks;
          });
        }
      );
      
      unsubscribeFunctions.push(unsubscribe);
    });
    
    // Cleans up subscriptions when the component unmounts as always.
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
      console.log(`Cleaned up real-time price updates for ${stocks.length} stocks`);
    };
  }, [stocks]);

  useEffect(() => {
    if (!stocks.length) return;
    
    let result = [...stocks];
    
    //Applying the search filter.
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      result = result.filter(stock => 
        stock.stock_name?.toLowerCase().includes(searchTerm) || 
        stock.stock_key?.toLowerCase().includes(searchTerm) ||
        stock.sector?.toLowerCase().includes(searchTerm)
      );
    }
    
    if (filters.sector !== 'all') {
      result = result.filter(stock => stock.sector === filters.sector);
    }
    
    result = result.filter(stock => 
      stock.current_price >= filters.priceRange[0] && 
      stock.current_price <= filters.priceRange[1]
    );
    
    //Applies sorting the stock.
    switch(filters.sortBy) {
      case 'name':
        result.sort((a, b) => a.stock_name?.localeCompare(b.stock_name));
        break;
      case 'price_high':
        result.sort((a, b) => b.current_price - a.current_price);
        break;
      case 'price_low':
        result.sort((a, b) => a.current_price - b.current_price);
        break;
      case 'performance':
        result.sort((a, b) => b.change_percent - a.change_percent);
        break;
      default:
        break;
    }
    
    setFilteredStocks(result);
  }, [filters, stocks]);

  // Handles the search input change, sector, and then change.
  const handleSearchChange = (e) => {
    setFilters({
      ...filters,
      search: e.target.value
    });
  };

  const handleSectorChange = (e) => {
    setFilters({
      ...filters,
      sector: e.target.value
    });
  };

  const handleSortChange = (e) => {
    setFilters({
      ...filters,
      sortBy: e.target.value
    });
  };

  // Adding to a watch list and refreshing.
  const handleAddToWatchlist = async (stockKey) => {
    if (!currentUser) {
      navigate('/login', { state: { from: '/stocks' } });
      return;
    }
    
    try {
      await watchlistApi.addToWatchlist(currentUser.id, stockKey);
      
      const watchlist = await watchlistApi.getUserWatchlist(currentUser.id);
      setUserWatchlist(watchlist);
    } catch (err) {
      console.error('Error adding to watchlist:', err);
      alert('Failed to add stock to watchlist. Please try again.');
    }
  };

  // Check ifthe stock is in user's watchlist.
  const isInWatchlist = (stockKey) => {
    return userWatchlist.some(item => item.stock_key === stockKey);
  };

  //Renders the stock card.
  const renderStockCard = (stock) => {
    if (!stock) return null;
    
    const { 
      stock_key, 
      name, 
      stock_name, 
      sector, 
      industry, 
      current_price, 
      change_percent 
    } = stock;
    
    if (!stock_key) return null;
    
    const displayName = stock_name || name || `Stock ${stock_key}`;
    
    return (
      <Card className="stock-card">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <Link to={`/stock/${stock_key}`} className="stock-title-link">
                <h3 className="stock-title">{displayName}</h3>
              </Link>
              <span className="stock-key">{stock_key}</span>
              {sector && <div className="sector-badge">{sector}</div>}
              {industry && !sector && <div className="sector-badge">{industry}</div>}
            </div>
            <div className="text-end">
              <div className="stock-price">{formatCurrency(current_price || 0)}</div>
              <div className={`change-percent ${(change_percent || 0) >= 0 ? 'positive' : 'negative'}`}>
                {(change_percent || 0) >= 0 ? '+' : ''}{(change_percent || 0).toFixed(2)}%
              </div>
            </div>
          </div>
          
          <div className="stock-card-footer">
            <Button 
              variant={isInWatchlist(stock_key) ? "warning" : "outline-primary"}
              className="btn-sm mr-2"
              onClick={(e) => {
                e.preventDefault();
                handleAddToWatchlist(stock_key);
              }}
            >
              <FaStar className="me-1" /> 
              {isInWatchlist(stock_key) ? 'In Watchlist' : 'Add to Watchlist'}
            </Button>
            
            <Link to={`/stock/${stock_key}`} className="btn btn-primary btn-sm">
              <FaChartLine className="me-1" /> Details
            </Link>
          </div>
        </Card.Body>
      </Card>
    );
  };

  const getSectors = () => {
    const sectors = [...new Set(stocks.map(stock => stock.sector).filter(Boolean))];
    return sectors.sort();
  };

  const handleRetryFetch = () => {
    fetchAllStocksData();
  };

  return (
    <div className="stock-directory-page">
      <Container className="py-4">
        <Row className="mb-4">
          <Col>
            <h1 className="stock-directory-title">Stock Directory</h1>
            <p className="stock-directory-subtitle">
              Discover and analyze stocks to add to your portfolio
            </p>
          </Col>
        </Row>
        
        <Row className="mb-4">
          <Col lg={4} className="mb-3">
            <div className="search-container">
              <Form.Group>
                <div className="search-input-wrapper">
                  <FaSearch className="search-icon" />
                  <Form.Control
                    type="text"
                    placeholder="Search stocks by name or symbol..."
                    value={filters.search}
                    onChange={handleSearchChange}
                  />
                </div>
              </Form.Group>
            </div>
          </Col>
          
          <Col lg={3} className="mb-3">
            <Form.Group>
              <div className="filter-input-wrapper">
                <FaFilter className="filter-icon" />
                <Form.Select
                  value={filters.sector}
                  onChange={handleSectorChange}
                >
                  <option value="all">All Sectors</option>
                  {getSectors().map(sector => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </Form.Select>
              </div>
            </Form.Group>
          </Col>
          
          <Col lg={3} className="mb-3">
            <Form.Group>
              <div className="sort-input-wrapper">
                <FaSort className="sort-icon" />
                <Form.Select
                  value={filters.sortBy}
                  onChange={handleSortChange}
                >
                  <option value="name">Sort by Name</option>
                  <option value="price_high">Price (High to Low)</option>
                  <option value="price_low">Price (Low to High)</option>
                  <option value="performance">Performance</option>
                </Form.Select>
              </div>
            </Form.Group>
          </Col>
          
          <Col lg={2} className="mb-3">
            <div className="results-count">
              {filteredStocks.length} result{filteredStocks.length !== 1 ? 's' : ''}
            </div>
          </Col>
        </Row>
        
        {loading ? (
          <div className="text-center my-5">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-3">Loading stocks...</p>
          </div>
        ) : error ? (
          <Alert variant="danger" className="my-4">
            <Alert.Heading>Error</Alert.Heading>
            <p>{error}</p>
            <div className="d-flex justify-content-between">
              {!currentUser ? (
                <Button variant="primary" onClick={() => navigate('/login', { state: { from: '/stocks' } })}>
                  <FaSignInAlt className="me-2" /> Log In
                </Button>
              ) : (
                <Button variant="outline-secondary" onClick={() => console.log('Current user:', currentUser)}>
                  Debug Auth
                </Button>
              )}
              <Button variant="outline-danger" onClick={handleRetryFetch}>
                Retry Loading
              </Button>
            </div>
          </Alert>
        ) : (
          <>
            <Row>
              {filteredStocks.length === 0 ? (
                <Col>
                  <Alert variant="info" className="my-4">
                    <Alert.Heading>No stocks found</Alert.Heading>
                    <p>No stocks match your current filters. Try adjusting your search criteria.</p>
                  </Alert>
                </Col>
              ) : (
                filteredStocks.map(stock => (
                  <Col key={stock.stock_key} md={6} lg={4} className="mb-4">
                    {renderStockCard(stock)}
                  </Col>
                ))
              )}
            </Row>
          </>
        )}
      </Container>
    </div>
  );
};

export default StockDirectory; 