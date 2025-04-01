import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Row, Col, Button, Form, InputGroup, Modal, Alert, Spinner, ListGroup } from 'react-bootstrap';
import { FaSearch, FaStar, FaChartLine, FaPlus, FaTimes, FaTrash, FaArrowUp, FaArrowDown, FaSync, FaExclamationTriangle } from 'react-icons/fa';
import { watchlistApi, stockApi } from '../../../lib/api';
import MiniStockChart from '../../stock/MiniStockChart';
import { useDebounce } from '../../../lib/hooks/useDebounce';
import './TabStyles.css';
import { stockDataRefreshManager } from '../../../services';

const WatchlistTab = ({ userId, watchlist: initialWatchlist = [] }) => {
    const [watchlist, setWatchlist] = useState(initialWatchlist);
    const [searchTerm, setSearchTerm] = useState('');
    const [stockSearchTerm, setStockSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [filteredWatchlist, setFilteredWatchlist] = useState([]);
    const [selectedSector, setSelectedSector] = useState('All');
    const [sortBy, setSortBy] = useState('date');
    const [selectedStock, setSelectedStock] = useState(null);
    const [watchlistData, setWatchlistData] = useState(initialWatchlist);
    const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const searchContainerRef = useRef(null);
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    
    useEffect(() => {
        console.log('WatchlistTab initialized with userId:', userId);
        console.log('Initial watchlist data:', initialWatchlist);
    }, [userId, initialWatchlist]);
    
    useEffect(() => {
        const fetchWatchlist = async (retryCount = 0) => {
            if (initialWatchlist && initialWatchlist.length > 0) {
                console.log('Using provided watchlist data:', initialWatchlist);
                setWatchlistData(initialWatchlist);
                
                //Fetches latest prices for the initial watchlist
                fetchLatestPrices(initialWatchlist);
                return;
            }
            
            if (!userId) {
                console.error('Cannot fetch watchlist: No user ID provided');
                setError('User ID is required to fetch watchlist data.');
                return;
            }
            
            setLoading(true);
            setError(null);
            
            try {
                console.log('Fetching watchlist data for user:', userId);
                const data = await watchlistApi.getUserWatchlist(userId);
                console.log('Fetched watchlist data:', data);
                setWatchlistData(data);
                
                //After getting data, fetch the latest price
                if (data && data.length > 0) {
                    console.log('Fetching latest prices for fetched watchlist...');
                    await fetchLatestPrices(data);
                }
            } catch (err) {
                console.error('Error fetching watchlist:', err);
                setError('Failed to load watchlist. Please try again later.');
                setWatchlistData([]);
            } finally {
                setLoading(false);
            }
        };
        
        fetchWatchlist();
    }, [userId, initialWatchlist]);
    
    //Fetches the latest prices for all watchlist items
    const fetchLatestPrices = async (stocks = watchlistData) => {
        if (!stocks || stocks.length === 0) return;
        
        setIsRefreshingPrices(true);
        console.log('Fetching latest prices for watchlist items. Count:', stocks.length);
        
        try {
            const updatedStocks = await Promise.all(
                stocks.map(async (stock) => {
                    try {
                        console.log(`Fetching price for ${stock.stock_key}`);
                        
                        //Gets latest price data for a specific stock
                        const priceData = await stockApi.getLatestPrice(stock.stock_key);
                        console.log(`Raw API response for ${stock.stock_key}:`, priceData);
                        
                        //Records for its update
                        stockDataRefreshManager.recordManualUpdate('price', stock.stock_key);
                        
                        //Extracts the data from the API response.
                        const changePercent = priceData?.change_percent || 0;
                        console.log(`Change percent for ${stock.stock_key} (already in percentage form):`, changePercent);
                        
                        //Calculates price change from percentage and price if needed
                        let priceChange = 0;
                        if (priceData?.price_change !== undefined) {
                            priceChange = priceData.price_change;
                            console.log(`Using direct price_change from API: ${priceChange}`);
                        } else if (priceData?.latest_price) {
                            const previousPrice = priceData.latest_price / (1 + (changePercent / 100));
                            priceChange = priceData.latest_price - previousPrice;
                            console.log(`Calculated price_change: ${priceChange} (from latest_price: ${priceData.latest_price}, changePercent: ${changePercent})`);
                        } else {
                            console.log(`No data available to calculate price_change for ${stock.stock_key}`);
                        }
                        
                        //Formats for display when debugging
                        const formattedPercent = formatPercentage(changePercent);
                        const formattedPrice = formatCurrency(priceChange);
                        console.log(`Formatted for display: ${formattedPrice} (${formattedPercent})`);
                        
                        //Updates the stock with latest price data
                        return {
                            ...stock,
                            current_price: priceData?.latest_price || stock.current_price || 0,
                            price_change: priceChange,
                            change_percentage: changePercent
                        };
                    } catch (error) {
                        console.error(`Error fetching price for ${stock.stock_key}:`, error);
                        return stock;
                    }
                })
            );
            
            console.log('Updated watchlist with latest prices:', updatedStocks);
            setWatchlistData(updatedStocks);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Error updating prices:', error);
        } finally {
            setIsRefreshingPrices(false);
        }
    };
    
    const handleRefreshPrices = async () => {
        await fetchLatestPrices();
        setSuccessMessage('Prices updated successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
    };
    
    const formatCurrency = (value) => {
        // Handle undefined or NaN
        if (value === undefined || value === null || isNaN(value)) {
            return '$0.00';
        }
        
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(value);
    };
    
    const formatPercentage = (value) => {
        // Handle undefined or NaN
        if (value === undefined || value === null || isNaN(value)) {
            return '0.00%';
        }
        
        return `${(value >= 0 ? '+' : '')}${value.toFixed(2)}%`;
    };
    
    //Searchesfor stocks
    const handleStockSearch = async () => {
        if (!stockSearchTerm.trim()) return;
        
        setIsSearching(true);
        setError(null);
        
        try {
            //Calls the api fr the search
            const results = await stockApi.searchStocks(stockSearchTerm);
            console.log('Stock search results:', results);
            
            if (results && Array.isArray(results)) {
                setSearchResults(results);
            } else {
                // Fallback if the API doesn't return any array.
                setSearchResults([]);
                console.warn('Search API did not return an array:', results);
            }
        } catch (err) {
            console.error('Error searching stocks:', err);
            setError('Failed to search for stocks. Please try again.');
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };
    
    // Adds useEffect to automatically search as user types.
    useEffect(() => {
        const debouncedSearch = setTimeout(() => {
            if (stockSearchTerm && stockSearchTerm.trim().length >= 2 && showAddModal) {
                handleStockSearch();
            }
        }, 500);
        
        return () => clearTimeout(debouncedSearch);
    }, [stockSearchTerm, showAddModal]);
    
    // Updates the  useEffect to handle watchlist data correctly.
    useEffect(() => {
        if (watchlistData && Array.isArray(watchlistData)) {
            console.log('Setting watchlist data:', watchlistData);
            setWatchlist(watchlistData);
        } else {
            console.log('No watchlist data available or invalid format');
            setWatchlist([]);
        }
    }, [watchlistData]);
    
    // Applies filtering and sorting to watchlist.
    useEffect(() => {
        if (!watchlistData) {
            setFilteredWatchlist([]);
            return;
        }
        
        let filtered = [...watchlistData];
        
        // Applies search filter.
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(item => 
                (item.name && item.name.toLowerCase().includes(term)) || 
                (item.stock_key && item.stock_key.toLowerCase().includes(term)) ||
                (item.sector && item.sector.toLowerCase().includes(term))
            );
        }
        
        // Applies sector filter.
        if (selectedSector !== 'All') {
            filtered = filtered.filter(item => item.sector === selectedSector);
        }
        
        // Applies sorting.
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'price':
                    return b.current_price - a.current_price;
                case 'performance':
                    return b.change_percentage - a.change_percentage;
                case 'date':
                default:
                    return new Date(b.added_date) - new Date(a.added_date);
            }
        });
        
        setFilteredWatchlist(filtered);
    }, [watchlistData, searchTerm, selectedSector, sortBy]);
    
    // Sets up auto-refresh interval, using useRef for stable reference.
    const watchlistRef = React.useRef(watchlistData);
    
    // Updates ref when watchlist changes
    useEffect(() => {
        watchlistRef.current = watchlistData;
    }, [watchlistData]);
    
    // Sets up auto refresh interval.
    useEffect(() => {
        // Refresh prices every 60 seconds
        const intervalId = setInterval(() => {
            console.log('Auto-refreshing price data...');
            if (watchlistRef.current && watchlistRef.current.length > 0) {
                fetchLatestPrices(watchlistRef.current);
            }
        }, 60000); // 60 seconds
        
        // Cleans up interval on component unmount.
        return () => clearInterval(intervalId);
    }, []); // Empty dependency array to only set up once
    
    //Get available sectors for filter.
    const availableSectors = useMemo(() => {
        if (!watchlistData || watchlistData.length === 0) {
            return ['All'];
        }
        
        const sectors = new Set(watchlistData
            .map(item => item.sector)
            .filter(sector => sector));
            
        return ['All', ...sectors];
    }, [watchlistData]);
    
    // Adds stock t watchlist
    const handleAddToWatchlist = async () => {
        if (!selectedStock) {
            setError('Please select a stock to add');
            return;
        }
        
        const stockKey = selectedStock.symbol;
        
        setLoading(true);
        setError(null);
        
        try {
            const result = await watchlistApi.addToWatchlist(userId, stockKey);
            
            // After adding to watchlist, refresh the watchlist data to get the latest
            const updatedWatchlist = await watchlistApi.getUserWatchlist(userId);
            setWatchlistData(updatedWatchlist);
            
            setSuccessMessage(`Added ${stockKey} to your watchlist`);
            
            // Clear success message after 3 seconds
            setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
            
            // Close the modal
            setShowAddModal(false);
            setStockSearchTerm('');
            setSearchResults([]);
        } catch (err) {
            console.error('Error adding to watchlist:', err);
            setError('Failed to add to watchlist. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    
    // Removes stock from watchlist.
    const handleRemoveFromWatchlist = async (itemId) => {
        setLoading(true);
        setError(null);
        
        try {
            await watchlistApi.removeFromWatchlist(userId, itemId);
            
            // Updates the local state.
            setWatchlistData(prev => prev.filter(item => item.id !== itemId));
            
            setSuccessMessage('Removed item from your watchlist');
            
            //Clear the success message after 3 seconds.
            setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
        } catch (err) {
            console.error('Error removing from watchlist:', err);
            setError('Failed to remove from watchlist. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    
    //Selects a stock for adding to watchlist.
    const handleSelectStock = (stock) => {
        setSelectedStock(stock);
    };
    
    useEffect(() => {
        if (watchlistData && watchlistData.length > 0) {
            fetchLatestPrices(watchlistData);
        }
    }, []);
    
    //Closes suggestions when clicking out
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    
    //Generates search suggestions based on search term.
    useEffect(() => {
        if (!debouncedSearchTerm.trim() || !watchlistData || !watchlistData.length) {
            setSearchSuggestions([]);
            return;
        }
        
        //Set sloading state for suggestions.
        setSuggestionsLoading(true);
        
        const term = debouncedSearchTerm.toLowerCase();
        
        // Finding matching stocks in watchlist.
        const matchingStocks = watchlistData.filter(item => 
            (item.name && item.name.toLowerCase().includes(term)) || 
            (item.stock_key && item.stock_key.toLowerCase().includes(term)) ||
            (item.sector && item.sector.toLowerCase().includes(term))
        );
        
        // Creates the unique suggestions.
        const suggestions = [];
        const addedKeys = new Set();
        
        matchingStocks.forEach(stock => {
            if (!addedKeys.has(stock.stock_key)) {
                suggestions.push({
                    stock_key: stock.stock_key,
                    name: stock.name || `Stock ${stock.stock_key}`,
                    sector: stock.sector || 'Unknown',
                    current_price: stock.current_price,
                    change_percentage: stock.change_percentage,
                    match: 
                        stock.name && stock.name.toLowerCase().includes(term) ? 'name' : 
                        stock.stock_key && stock.stock_key.toLowerCase().includes(term) ? 'symbol' : 'sector'
                });
                addedKeys.add(stock.stock_key);
            }
        });
        
        setSearchSuggestions(suggestions.slice(0, 5));
        setSuggestionsLoading(false);
    }, [debouncedSearchTerm, watchlistData]);
    
    //Input search change handler
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setShowSuggestions(true);
    };
    
    //Suggestion selection
    const handleSelectSuggestion = (suggestion) => {
        setSearchTerm(suggestion.stock_key);
        setShowSuggestions(false);
    };
    
    //Real time updates for watchlist prices.
    useEffect(() => {
        if (!watchlistData || watchlistData.length === 0) return;
        
        console.log(`Setting up real-time price updates for ${watchlistData.length} stocks in watchlist`);
        
        const unsubscribeFunctions = [];
        
        //Sub to price updates for all stock needed.
        watchlistData.forEach(stock => {
            const unsubscribe = stockDataRefreshManager.subscribe(
                'price',
                stock.stock_key,
                (newPriceData) => {
                    console.log(`Received real-time price update for ${stock.stock_key} in watchlist:`, newPriceData);
                    
                    setWatchlist(currentWatchlist => {
                        const updatedWatchlist = currentWatchlist.map(item => {
                            if (item.stock_key === stock.stock_key) {
                                return {
                                    ...item,
                                    current_price: newPriceData?.latest_price || 0,
                                    change_percent: newPriceData?.change_percent || 0,
                                    price_data: newPriceData
                                };
                            }
                            return item;
                        });
                        
                        return updatedWatchlist;
                    });
                    
                    // Updates the watchlistData.
                    setWatchlistData(currentData => {
                        const updatedData = currentData.map(item => {
                            if (item.stock_key === stock.stock_key) {
                                return {
                                    ...item,
                                    current_price: newPriceData?.latest_price || 0,
                                    change_percent: newPriceData?.change_percent || 0,
                                    price_data: newPriceData
                                };
                            }
                            return item;
                        });
                        
                        return updatedData;
                    });
                }
            );
            
            unsubscribeFunctions.push(unsubscribe);
        });
        
        //Sets the last updated time.
        setLastUpdated(new Date());
        
        //Cleans up subscriptions when component unmounts.
        return () => {
            unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
            console.log(`Cleaned up real-time price updates for ${watchlistData.length} stocks in watchlist`);
        };
    }, [watchlistData]);
    
    return (
        <div className="watchlist-tab">
            <div className="watchlist-header d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 className="tab-title mb-0">Your Watchlist</h3>
                    {lastUpdated && (
                        <small className="text-muted">
                            Prices updated {lastUpdated.toLocaleTimeString()}
                        </small>
                    )}
                </div>
                <div className="d-flex">
                    <Button 
                        variant="outline-secondary" 
                        className="me-2"
                        onClick={handleRefreshPrices}
                        disabled={isRefreshingPrices}
                    >
                        {isRefreshingPrices ? (
                            <><Spinner animation="border" size="sm" className="me-1" /> Updating...</>
                        ) : (
                            <><FaSync className="me-1" /> Refresh Prices</>
                        )}
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={() => setShowAddModal(true)}
                        disabled={loading}
                        style={{ 
                            backgroundColor: 'var(--pet-sounds-dark-green)', 
                            borderColor: 'var(--pet-sounds-dark-green)'
                        }}
                        className="add-stock-btn"
                    >
                        <FaPlus className="me-2" /> Add Stock
                    </Button>
                </div>
            </div>
            
            {error && (
                <Alert variant="danger" className="mb-4">
                    {error}
                </Alert>
            )}
            
            {successMessage && (
                <Alert variant="success" className="mb-4">
                    {successMessage}
                </Alert>
            )}
            
            <div className="watchlist-controls mb-4">
                <Row>
                    <Col md={6}>
                        <Form.Group>
                            <div className="search-container" ref={searchContainerRef}>
                                <InputGroup>
                                    <InputGroup.Text title="Filter watchlist">
                                        <FaSearch />
                                    </InputGroup.Text>
                                    <Form.Control 
                                        type="text" 
                                        placeholder="Filter your watchlist by name or symbol..." 
                                        value={searchTerm}
                                        onChange={handleSearchChange}
                                        onFocus={() => setShowSuggestions(true)}
                                        aria-label="Filter watchlist"
                                    />
                                    {searchTerm && (
                                        <Button 
                                            variant="outline-secondary" 
                                            onClick={() => {
                                                setSearchTerm('');
                                                setShowSuggestions(false);
                                            }}
                                            title="Clear filter"
                                        >
                                            <FaTimes />
                                        </Button>
                                    )}
                                </InputGroup>
                                
                                {filteredWatchlist.length > 0 && searchTerm.trim() && (
                                    <div className="filter-info mt-2">
                                        <small>
                                            Showing {filteredWatchlist.length} of {watchlistData.length} watchlist items
                                        </small>
                                    </div>
                                )}
                                
                                {/* Watchlist Search Suggestions */}
                                {showSuggestions && searchTerm.trim() && (suggestionsLoading || searchSuggestions.length > 0) && (
                                    <div className="investment-search-suggestions">
                                        <div className="suggestion-header">
                                            <small>Filter watchlist by:</small>
                                        </div>
                                        
                                        {suggestionsLoading ? (
                                            <div className="search-suggestions-loading">
                                                Loading suggestions...
                                            </div>
                                        ) : (
                                            <ListGroup>
                                                {searchSuggestions.map((suggestion, index) => (
                                                    <ListGroup.Item 
                                                        key={`suggestion-${index}`}
                                                        action
                                                        onClick={() => handleSelectSuggestion(suggestion)}
                                                        className="investment-suggestion-item"
                                                    >
                                                        <div className="suggestion-content">
                                                            <div className="suggestion-stock-info">
                                                                <span className="suggestion-symbol">{suggestion.stock_key}</span>
                                                                <span className="suggestion-name">{suggestion.name}</span>
                                                            </div>
                                                            {suggestion.current_price > 0 && (
                                                                <span className={`suggestion-price ${suggestion.change_percentage >= 0 ? 'positive' : 'negative'}`}>
                                                                    {formatCurrency(suggestion.current_price)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="suggestion-sector">
                                                            <small>{suggestion.sector}</small>
                                                        </div>
                                                    </ListGroup.Item>
                                                ))}
                                            </ListGroup>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Select 
                                value={selectedSector}
                                onChange={(e) => setSelectedSector(e.target.value)}
                            >
                                {availableSectors.map(sector => (
                                    <option key={sector} value={sector}>{sector}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Select 
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="date">Sort by Date Added</option>
                                <option value="name">Sort by Name</option>
                                <option value="price">Sort by Price</option>
                                <option value="performance">Sort by Performance</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
            </div>
            
            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Loading watchlist data...</p>
                </div>
            ) : filteredWatchlist.length > 0 ? (
                <div className="watchlist-grid">
                    <Row>
                        {filteredWatchlist.map(item => (
                            <Col key={item.id} xs={12} md={6} lg={4} className="mb-4">
                                <Card className="watchlist-card h-100">
                                    <Card.Header className="watchlist-card-header">
                                        <div>
                                            <h5 className="watchlist-item-symbol">{item.stock_key}</h5>
                                            <p className="watchlist-item-name">{item.name}</p>
                                        </div>
                                        <Button 
                                            variant="link" 
                                            className="text-danger p-0" 
                                            onClick={() => handleRemoveFromWatchlist(item.id)}
                                            disabled={loading}
                                        >
                                            <FaTrash />
                                        </Button>
                                    </Card.Header>
                                    <Card.Body>
                                        <div className="watchlist-card-price">
                                            <h4>{formatCurrency(item.current_price)}</h4>
                                            <span className={`watchlist-item-change ${item.change_percentage >= 0 ? 'positive' : 'negative'}`}>
                                                {item.change_percentage >= 0 ? (
                                                    <FaArrowUp className="me-1" />
                                                ) : (
                                                    <FaArrowDown className="me-1" />
                                                )}
                                                <span className="ms-1">
                                                    {formatCurrency(item.price_change)} ({formatPercentage(item.change_percentage)})
                                                </span>
                                            </span>
                                        </div>
                                        <div className="watchlist-card-chart">
                                            <MiniStockChart 
                                                stockKey={item.stock_key} 
                                                refreshTrigger={lastUpdated} 
                                                height={80}
                                            />
                                        </div>
                                    </Card.Body>
                                    <Card.Footer className="watchlist-card-footer">
                                        <span className="watchlist-item-sector">{item.sector}</span>
                                        <Button 
                                            variant="outline-primary" 
                                            size="sm"
                                            href={`/stock/${item.stock_key}`}
                                        >
                                            View Details
                                        </Button>
                                    </Card.Footer>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </div>
            ) : (
                <div className="no-watchlist">
                    <Card className="text-center p-5">
                        <Card.Body>
                            <div className="empty-state">
                                <div className="empty-icon">
                                    <FaStar size={48} className="text-muted mb-3" />
                                </div>
                                <h3>No stocks in your watchlist{searchTerm ? ' matching your search' : ''}</h3>
                                {!searchTerm && (
                                    <p>Start tracking your favorite stocks by adding them to your watchlist.</p>
                                )}
                                {searchTerm && (
                                    <p>Try a different search term or clear your search to see all items.</p>
                                )}
                                {!searchTerm && (
                                    <Button 
                                        variant="primary" 
                                        onClick={() => setShowAddModal(true)}
                                        className="mt-3"
                                    >
                                        <FaPlus className="me-2" /> Add Your First Stock
                                    </Button>
                                )}
                            </div>
                        </Card.Body>
                    </Card>
                </div>
            )}
            
            {/* Add Stock Modal */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Add Stock to Watchlist</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={(e) => {
                        e.preventDefault();
                        handleStockSearch();
                    }}>
                        <Form.Group className="mb-3">
                            <Form.Label>Search for a stock</Form.Label>
                            <InputGroup className="mb-3">
                                <Form.Control
                                    type="text"
                                    placeholder="Enter stock symbol or name..."
                                    value={stockSearchTerm}
                                    onChange={(e) => setStockSearchTerm(e.target.value)}
                                    aria-label="Search for stocks"
                                />
                                <Button 
                                    variant="primary" 
                                    onClick={handleStockSearch}
                                    disabled={isSearching || !stockSearchTerm.trim()}
                                    type="submit"
                                    className="search-button"
                                >
                                    {isSearching ? <Spinner animation="border" size="sm" /> : <FaSearch />}
                                </Button>
                            </InputGroup>
                        </Form.Group>
                        
                        {isSearching && (
                            <div className="text-center my-4">
                                <Spinner animation="border" size="sm" className="me-2" /> 
                                <span>
                                    Searching for stocks and loading sector information...
                                </span>
                            </div>
                        )}
                        
                        {searchResults.length > 0 && !isSearching && (
                            <div className="search-results">
                                <p className="mb-2">Select a stock to add:</p>
                                <div className="list-group">
                                    {searchResults.map(stock => (
                                        <button
                                            type="button"
                                            key={stock.symbol}
                                            className={`list-group-item list-group-item-action ${selectedStock?.symbol === stock.symbol ? 'active' : ''}`}
                                            onClick={() => handleSelectStock(stock)}
                                        >
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <strong>{stock.symbol}</strong>
                                                    <div className="small text-muted">{stock.name}</div>
                                                </div>
                                                <span className="badge bg-light text-dark rounded-pill">
                                                    {stock.sector}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {!isSearching && searchResults.length === 0 && stockSearchTerm.trim() && (
                            <Alert variant="info">
                                <FaExclamationTriangle className="me-2" />
                                No stocks found matching "{stockSearchTerm}"
                            </Alert>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                        Cancel
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handleAddToWatchlist}
                        disabled={!selectedStock || loading}
                        style={{ 
                            backgroundColor: 'var(--pet-sounds-dark-green)', 
                            borderColor: 'var(--pet-sounds-dark-green)'
                        }}
                    >
                        {loading ? <Spinner animation="border" size="sm" className="me-1" /> : <FaPlus className="me-1" />}
                        Add to Watchlist
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default WatchlistTab; 