import React, { useState, useEffect, useRef } from 'react';
import { Table, Form, InputGroup, Button, Alert, Card, Spinner, ListGroup, Row, Col } from 'react-bootstrap';
import { FaSearch, FaSort, FaSortUp, FaSortDown, FaPlus, FaTimes, FaChartLine } from 'react-icons/fa';
import { investmentApi, stockApi } from '../../../lib/api';
import { useAuth } from '../../../lib/hooks/useAuth';
import { useDebounce } from '../../../lib/hooks/useDebounce';
import { formatCurrency, formatPercentage } from '../../../lib/utils/formatUtils';
import './TabStyles.css';
import { stockDataRefreshManager } from '../../../services';

const InvestmentsTab = ({ userId, investments: initialInvestments }) => {
    const { currentUser } = useAuth();
    const [investments, setInvestments] = useState(initialInvestments || []);
    const [enrichedInvestments, setEnrichedInvestments] = useState([]);
    const [filteredInvestments, setFilteredInvestments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [sortDirection, setSortDirection] = useState('ascending');
    const [selectedSector, setSelectedSector] = useState('All');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchContainerRef = useRef(null);
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    
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
    
    // Calculates total investment value.
    const totalInvestmentValue = filteredInvestments.reduce((total, investment) => {
        return total + (investment.currentValue || 0);
    }, 0);
    
    // Updates investments when the initialInvestments changes.
    useEffect(() => {
        if (initialInvestments && initialInvestments.length > 0) {
            console.log('Updating investments from props:', initialInvestments);
            setInvestments(initialInvestments);
        } else {
            console.log('No initial investments provided or empty array');
            if (userId) {
                const loadInvestments = async () => {
                    try {
                        setLoading(true);
                        const data = await investmentApi.getUserInvestments(userId);
                        console.log('Loaded investments from API:', data);
                        setInvestments(data || []);
                    } catch (err) {
                        console.error('Error loading investments:', err);
                        setError('Failed to load investment data');
                    } finally {
                        setLoading(false);
                    }
                };
                loadInvestments();
            }
        }
    }, [initialInvestments, userId]);
    
    // Enriches the investments with latest price
    useEffect(() => {
        const enrichInvestments = async () => {
            if (!investments || investments.length === 0) return;
            
            setLoading(true);
            
            try {
                const enrichedData = await Promise.all(
                    investments.map(async (investment) => {
                        try {
                            // Get stock details including sector
                            let stockDetails = {};
                            try {
                                const stockData = await stockApi.getStockDetails(investment.stock_key);
                                stockDetails = stockData;
                            } catch (detailsError) {
                                console.error(`Error fetching details for ${investment.stock_key}:`, detailsError);
                                stockDetails = { name: `Stock ${investment.stock_key}`, sector: 'Unknown' };
                            }
                            
                            let latestPrice = 0;
                            let priceChange = 0;
                            let changePercentage = 0;
                            
                            try {
                                const priceData = await stockApi.getLatestPrice(investment.stock_key);
                                latestPrice = priceData.latest_price || 0;
                                
                                //Recording manually updating this stock's price.
                                stockDataRefreshManager.recordManualUpdate('price', investment.stock_key);
                                
                                //Gets price change directly from API.
                                if (priceData?.price_change !== undefined) {
                                    priceChange = priceData.price_change;
                                    changePercentage = priceData.change_percent || 0;
                                } else {
                                    //Otherwise clculates price change based on purchase price and latest price
                                    priceChange = (latestPrice * investment.quantity) - (investment.purchase_price * investment.quantity);
                                    changePercentage = investment.purchase_price > 0 
                                        ? (priceChange / (investment.purchase_price * investment.quantity)) * 100 
                                        : 0;
                                }
                            } catch (priceError) {
                                console.error(`Error fetching price for ${investment.stock_key}:`, priceError);
                            }
                            
                            //Calculates the current value.
                            const currentValue = latestPrice * investment.quantity;
                            
                            return {
                                ...investment,
                                name: stockDetails.name || `Stock ${investment.stock_key}`,
                                sector: stockDetails.sector || 'Unknown',
                                currentPrice: latestPrice,
                                currentValue: currentValue,
                                priceChange: priceChange,
                                changePercentage: changePercentage,
                                purchase_date: investment.purchase_date || new Date().toISOString()
                            };
                        } catch (err) {
                            console.error(`Error enriching investment ${investment.stock_key}:`, err);
                            return {
                                ...investment,
                                name: `Stock ${investment.stock_key}`,
                                sector: 'Unknown',
                                currentPrice: 0,
                                currentValue: 0,
                                priceChange: 0,
                                changePercentage: 0,
                                purchase_date: investment.purchase_date || new Date().toISOString()
                            };
                        }
                    })
                );
                
                console.log('Enriched investment data:', enrichedData);
                setEnrichedInvestments(enrichedData);
            } catch (error) {
                console.error('Error enriching investments:', error);
                setError('Failed to load current market data');
            } finally {
                setLoading(false);
            }
        };
        
        enrichInvestments();
    }, [investments]);
    
    //Get available sector for filter.
    const availableSectors = React.useMemo(() => {
        if (!enrichedInvestments || enrichedInvestments.length === 0) {
            return ['All'];
        }
        
        const sectors = new Set(enrichedInvestments
            .map(item => item.sector)
            .filter(sector => sector)); //Filters out any null or undefined sectors.
            
        return ['All', ...sectors];
    }, [enrichedInvestments]);
    
    //Generates search suggestions based on the search terms.
    useEffect(() => {
        if (!debouncedSearchTerm.trim() || !enrichedInvestments.length) {
            setSearchSuggestions([]);
            return;
        }
        
        const term = debouncedSearchTerm.toLowerCase();
        
        //Finds matching investments.
        const matchingInvestments = enrichedInvestments.filter(investment => 
            (investment.name && investment.name.toLowerCase().includes(term)) ||
            (investment.stock_key && investment.stock_key.toLowerCase().includes(term)) ||
            (investment.sector && investment.sector.toLowerCase().includes(term))
        );
        
        //Creates unique suggestions, with no duplicates.
        const suggestions = [];
        const addedKeys = new Set();
        
        matchingInvestments.forEach(investment => {
            if (!addedKeys.has(investment.stock_key)) {
                suggestions.push({
                    stock_key: investment.stock_key,
                    name: investment.name,
                    sector: investment.sector,
                    currentPrice: investment.currentPrice,
                    match: investment.name.toLowerCase().includes(term) ? 'name' : 
                           investment.stock_key.toLowerCase().includes(term) ? 'symbol' : 'sector'
                });
                addedKeys.add(investment.stock_key);
            }
        });
        
        setSearchSuggestions(suggestions.slice(0, 5)); // Limit to 5 suggestions
    }, [debouncedSearchTerm, enrichedInvestments]);
    
    //Filters and sorts investments
    useEffect(() => {
        //Uses search name & sctor filtering.
        let filtered = [...enrichedInvestments];
        
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(investment => 
                (investment.name && investment.name.toLowerCase().includes(term)) ||
                (investment.stock_key && investment.stock_key.toLowerCase().includes(term)) ||
                (investment.sector && investment.sector.toLowerCase().includes(term))
            );
        }
        
        //Applies sector filter.
        if (selectedSector !== 'All') {
            filtered = filtered.filter(investment => investment.sector === selectedSector);
        }
        
        //Sorts filtered investments.
        filtered.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'name':
                    aValue = a.name || '';
                    bValue = b.name || '';
                    break;
                case 'symbol':
                    aValue = a.stock_key || '';
                    bValue = b.stock_key || '';
                    break;
                case 'date':
                    aValue = new Date(a.purchase_date || 0);
                    bValue = new Date(b.purchase_date || 0);
                    break;
                case 'price':
                    aValue = a.currentPrice || 0;
                    bValue = b.currentPrice || 0;
                    break;
                case 'performance':
                    aValue = a.changePercentage || 0;
                    bValue = b.changePercentage || 0;
                    break;
                case 'value':
                    aValue = a.currentValue || 0;
                    bValue = b.currentValue || 0;
                    break;
                default:
                    aValue = a.name || '';
                    bValue = b.name || '';
            }
            
            if (sortDirection === 'ascending') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });
        
        setFilteredInvestments(filtered);
    }, [enrichedInvestments, searchTerm, sortBy, sortDirection, selectedSector]);
    
    //Handles search input change.
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setShowSuggestions(true);
    };
    
    // Handles suggestion selection.
    const handleSelectSuggestion = (suggestion) => {
        // Just set the search term to filter the current table
        setSearchTerm(suggestion.stock_key);
        setShowSuggestions(false);
    };
    
    // Handles sort request for column headers.
    const requestSort = (key) => {
        if (sortBy === key) {
            setSortDirection(sortDirection === 'ascending' ? 'descending' : 'ascending');
        } else {
            setSortBy(key);
            setSortDirection('ascending');
        }
    };
    
    // Gets sort icon for column headers.
    const getSortIcon = (key) => {
        if (sortBy !== key) return <FaSort />;
        if (sortDirection === 'ascending') return <FaSortUp />;
        return <FaSortDown />;
    };
    
    // Sets up real-time updates for investment prices.
    useEffect(() => {
        if (!enrichedInvestments || enrichedInvestments.length === 0) return;
        
        console.log(`Setting up real-time price updates for ${enrichedInvestments.length} investments`);
        
        // Keeps track of unsubscribe funcs.
        const unsubscribeFunctions = [];
        
        // Subscribes to price updates for each stock in the investments.
        enrichedInvestments.forEach(investment => {
            const unsubscribe = stockDataRefreshManager.subscribe(
                'price',
                investment.stock_key,
                (newPriceData) => {
                    console.log(`Received real-time price update for ${investment.stock_key} in investments:`, newPriceData);
                    
                    // Calculates the new current value based on the latest price.
                    const newPrice = newPriceData?.latest_price || 0;
                    const quantity = investment.quantity || 0;
                    const newCurrentValue = newPrice * quantity;
                    const costBasis = investment.cost_basis || 0;
                    const newGainLoss = newCurrentValue - costBasis;
                    const newGainLossPercentage = costBasis > 0 ? (newGainLoss / costBasis) * 100 : 0;
                    
                    //Updates the specific investment in the state.
                    setEnrichedInvestments(currentInvestments => {
                        const updatedInvestments = currentInvestments.map(item => {
                            if (item.stock_key === investment.stock_key) {
                                return {
                                    ...item,
                                    latestPrice: newPrice,
                                    currentValue: newCurrentValue,
                                    gainLoss: newGainLoss,
                                    gainLossPercentage: newGainLossPercentage,
                                    priceData: newPriceData
                                };
                            }
                            return item;
                        });
                        
                        return updatedInvestments;
                    });
                }
            );
            
            unsubscribeFunctions.push(unsubscribe);
        });
        
        // Cleans up subscriptions when component unmounts.
        return () => {
            unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
            console.log(`Cleaned up real-time price updates for ${enrichedInvestments.length} investments`);
        };
    }, [enrichedInvestments]);
    
    return (
        <div className="investments-tab">
            <h2>My Investments</h2>
            
            <div className="investments-controls mb-4">
                <Row>
                    <Col md={6}>
                        <Form.Group>
                            <div className="search-container" ref={searchContainerRef}>
                                <InputGroup>
                                    <InputGroup.Text title="Filter investments">
                                        <FaSearch />
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Filter your investments by name or symbol..."
                                        value={searchTerm}
                                        onChange={handleSearchChange}
                                        onFocus={() => setShowSuggestions(true)}
                                        aria-label="Filter investments table"
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
                                
                                {filteredInvestments.length > 0 && searchTerm.trim() && (
                                    <div className="filter-info mt-2">
                                        <small>
                                            Showing {filteredInvestments.length} of {enrichedInvestments.length} investments
                                        </small>
                                    </div>
                                )}
                                
                                {/* InvestmentSearch Suggestions */}
                                {showSuggestions && searchTerm.trim() && searchSuggestions.length > 0 && (
                                    <div className="investment-search-suggestions">
                                        <div className="suggestion-header">
                                            <small>Filter investments by:</small>
                                        </div>
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
                                                        {suggestion.currentPrice > 0 && (
                                                            <span className="suggestion-price">
                                                                {formatCurrency(suggestion.currentPrice)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="suggestion-sector">
                                                        <small>{suggestion.sector}</small>
                                                    </div>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
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
                                aria-label="Filter by sector"
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
                                onChange={(e) => {
                                    setSortBy(e.target.value);
                                    setSortDirection('descending');
                                }}
                                aria-label="Sort investments"
                            >
                                <option value="date">Sort by Date Added</option>
                                <option value="name">Sort by Name</option>
                                <option value="symbol">Sort by Symbol</option>
                                <option value="price">Sort by Price</option>
                                <option value="value">Sort by Value</option>
                                <option value="performance">Sort by Performance</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
            </div>
            
            {loading ? (
                <div className="text-center p-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Loading investment data...</p>
                </div>
            ) : error ? (
                <Alert variant="danger" className="text-center p-4">
                    <p className="mb-0">{error}</p>
                </Alert>
            ) : filteredInvestments.length > 0 ? (
                <>
                    <div className="investments-table">
                        <Table responsive hover>
                            <thead>
                                <tr>
                                    <th className="sortable" onClick={() => requestSort('name')}>
                                        Name {getSortIcon('name')}
                                    </th>
                                    <th className="sortable" onClick={() => requestSort('symbol')}>
                                        Symbol {getSortIcon('symbol')}
                                    </th>
                                    <th className="sortable" onClick={() => requestSort('quantity')}>
                                        Quantity {getSortIcon('quantity')}
                                    </th>
                                    <th className="sortable" onClick={() => requestSort('price')}>
                                        Price {getSortIcon('price')}
                                    </th>
                                    <th className="sortable" onClick={() => requestSort('value')}>
                                        Value {getSortIcon('value')}
                                    </th>
                                    <th className="sortable" onClick={() => requestSort('performance')}>
                                        Change {getSortIcon('performance')}
                                    </th>
                                    <th className="sortable" onClick={() => requestSort('sector')}>
                                        Sector {getSortIcon('sector')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvestments.map((investment, index) => (
                                    <tr key={investment.investment_id || index}>
                                        <td>{investment.name}</td>
                                        <td>{investment.stock_key}</td>
                                        <td>{investment.quantity}</td>
                                        <td>{formatCurrency(investment.currentPrice || 0)}</td>
                                        <td>{formatCurrency(investment.currentValue || 0)}</td>
                                        <td className={investment.changePercentage >= 0 ? 'positive' : 'negative'}>
                                            {formatCurrency(investment.priceChange || 0)} ({investment.changePercentage >= 0 ? '+' : ''}{formatPercentage(investment.changePercentage || 0)})
                                        </td>
                                        <td>{investment.sector}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                    
                    <div className="investments-summary">
                        <p><strong>Total Investment Value:</strong> {formatCurrency(totalInvestmentValue)}</p>
                        <p><strong>Number of Investments:</strong> {filteredInvestments.length}</p>
                    </div>
                </>
            ) : (
                <div className="no-investments">
                    <Card className="text-center p-5">
                        <Card.Body>
                            <h3>No investments found{searchTerm ? ' matching your search' : ''}.</h3>
                            {!searchTerm && (
                                <>
                                    <p className="mt-3 mb-4">
                                        {currentUser && userId.toString() === currentUser.id.toString() ? 
                                            "You don't have any investments yet. Start building your portfolio by adding your first investment." : 
                                            "This user doesn't have any investments yet."}
                                    </p>
                                    {currentUser && userId.toString() === currentUser.id.toString() && (
                                        <Button 
                                            variant="primary" 
                                            size="lg"
                                            href="/stocks"
                                        >
                                            <FaPlus className="me-2" /> Explore Stocks to Invest
                                        </Button>
                                    )}
                                </>
                            )}
                            {searchTerm && (
                                <p className="mt-3">Try a different search term or clear the search to see all investments.</p>
                            )}
                        </Card.Body>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default InvestmentsTab; 