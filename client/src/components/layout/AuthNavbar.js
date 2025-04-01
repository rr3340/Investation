import React, { useState, useEffect, useRef } from 'react';
import { Navbar, Nav, Container, Form, FormControl, Button, InputGroup, Spinner } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/hooks/useAuth';
import { FaSearch, FaUser, FaChartLine, FaRegBell, FaSignOutAlt, FaExclamationTriangle } from 'react-icons/fa';
import { stockApi, userApi } from '../../lib/api';
import { useDebounce } from '../../lib/hooks/useDebounce';
import SearchSuggestions from '../common/SearchSuggestions';
import './AuthNavbar.css';

const AuthNavbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser, logout } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchError, setSearchError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [allStocks, setAllStocks] = useState([]);
    const searchContainerRef = useRef(null);
    
    // Debounce the search query to minimize API calls.
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    
    // Closes suggestions when clicking outside.
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
    
    //Loads all stocks for suggestions when component mounts
    useEffect(() => {
        const loadStockSymbols = async () => {
            try {
                setSuggestionsLoading(true);
                const stockSymbols = await stockApi.getStockSymbolsForSuggestions();
                setAllStocks(stockSymbols);
            } catch (error) {
                console.error('Error loading stock symbols:', error);
            } finally {
                setSuggestionsLoading(false);
            }
        };
        
        loadStockSymbols();
    }, []);
    
    //Updates suggestions when debounced search query changes
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!debouncedSearchQuery.trim()) {
                setSuggestions([]);
                return;
            }
            
            setSuggestionsLoading(true);
            
            try {
                // Get stock suggestions
                const query = debouncedSearchQuery.toUpperCase();
                let stockSuggestions = [];
                
                if (allStocks.length) {
                    stockSuggestions = allStocks
                        .filter(stock => 
                            stock.stock_key.includes(query) || 
                            stock.name.toUpperCase().includes(query)
                        )
                        .slice(0, 5); //Limits stock suggestions to 5
                }
                
                // Get the user suggestions if query is at least 2 characters.
                let userSuggestions = [];
                if (debouncedSearchQuery.length >= 2) {
                    userSuggestions = await userApi.getUsersForSuggestions(debouncedSearchQuery);
                    userSuggestions = userSuggestions.slice(0, 5); //Limits user suggestions to 5
                }
                
                //Combines the suggestions.
                const combinedSuggestions = [...stockSuggestions, ...userSuggestions];
                setSuggestions(combinedSuggestions);
            } catch (error) {
                console.error('Error fetching suggestions:', error);
            } finally {
                setSuggestionsLoading(false);
            }
        };
        
        fetchSuggestions();
    }, [debouncedSearchQuery, allStocks]);
    
    const handleLogout = () => {
        logout();
        navigate('/');
    };
    
    const handleSearchInputChange = (e) => {
        setSearchQuery(e.target.value);
        setShowSuggestions(true);
        setSearchError('');
    };
    
    const handleSelectSuggestion = (suggestion) => {
        if (suggestion.type === 'stock') {
            navigate(`/stock/${suggestion.stock_key}`);
        } else if (suggestion.type === 'user') {
            navigate(`/profile/${suggestion.id}`);
        }
        
        setSearchQuery('');
        setShowSuggestions(false);
    };
    
    const handleSearch = async (e) => {
        e.preventDefault();
        
        if (!searchQuery.trim()) {
            return;
        }
        
        setIsLoading(true);
        setSearchError('');
        setShowSuggestions(false);
        
        try {
            const query = searchQuery.trim();
            
            //First, tries to find a stock.
            try {
                const stockKey = query.toUpperCase();
                const stockData = await stockApi.getStockDetails(stockKey);
                
                if (stockData && stockData.stock_key) {
                    navigate(`/stock/${stockKey}`);
                    setSearchQuery('');
                    setIsLoading(false);
                    return;
                }
            } catch (error) {
                console.log(`Stock not found: ${query}`);
                // Then continues to search the users.
            }
            
            //Find users.
            if (query.length >= 2) {
                try {
                    const users = await userApi.searchUsers(query);
                    
                    if (users && users.length > 0) {
                        // Navigates to the first matching user's profile.
                        navigate(`/profile/${users[0].id}`);
                        setSearchQuery('');
                        setIsLoading(false);
                        return;
                    }
                } catch (userError) {
                    console.error('User search error:', userError);
                }
            }
            
            //If we get here, no results were found.
            setSearchError(`No stocks or users found matching "${query}"`);
            
        } catch (error) {
            console.error('Search error:', error);
            setSearchError(`An error occurred during search. Please try again.`);
        } finally {
            setIsLoading(false);
            
            //Clears error after 5 seconds.
            if (searchError) {
                setTimeout(() => {
                    setSearchError('');
                }, 5000);
            }
        }
    };
    
    return (
        <Navbar expand="lg" className="auth-navbar" fixed="top">
            <Container fluid>
                {/* Brand Logo */}
                <Navbar.Brand as={Link} to="/stocks" className="brand">
                    Investat<span style={{ color: 'var(--pet-sounds-beige)' }}>ion</span>
                </Navbar.Brand>
                
                {/*Search Bar*/}
                <div className="search-container" ref={searchContainerRef}>
                    <Form className="d-flex search-form" onSubmit={handleSearch}>
                        <InputGroup>
                            <FormControl
                                type="search"
                                placeholder="Search stocks or users..."
                                className="search-input"
                                aria-label="Search"
                                value={searchQuery}
                                onChange={handleSearchInputChange}
                                onFocus={() => setShowSuggestions(true)}
                            />
                            <Button 
                                variant="outline-light" 
                                type="submit" 
                                className="search-button"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Spinner 
                                        as="span" 
                                        animation="border" 
                                        size="sm" 
                                        role="status" 
                                        aria-hidden="true" 
                                    />
                                ) : (
                                    <FaSearch />
                                )}
                            </Button>
                        </InputGroup>
                    </Form>
                    
                    {/*Autosuggestions */}
                    {showSuggestions && searchQuery.trim() && (
                        <SearchSuggestions 
                            suggestions={suggestions}
                            onSelectSuggestion={handleSelectSuggestion}
                            loading={suggestionsLoading}
                        />
                    )}
                    
                    {/*Error Messages*/}
                    {searchError && (
                        <div className="search-error">
                            <FaExclamationTriangle className="error-icon" />
                            {searchError}
                        </div>
                    )}
                </div>
                
                <Navbar.Toggle aria-controls="auth-navbar-nav" />
                
                <Navbar.Collapse id="auth-navbar-nav">
                    <Nav className="ms-auto">
                        <Nav.Link as={Link} to="/dashboard" className="nav-icon-link">
                            <FaChartLine className="nav-icon" />
                            <span className="nav-text">Dashboard</span>
                        </Nav.Link>
                        
                        <Nav.Link as={Link} to="/notifications" className="nav-icon-link">
                            <FaRegBell className="nav-icon" />
                            <span className="nav-text">Alerts</span>
                        </Nav.Link>
                        
                        <Nav.Link as={Link} to={`/profile/${currentUser?.id}`} className="nav-icon-link">
                            <FaUser className="nav-icon" />
                            <span className="nav-text">Profile</span>
                        </Nav.Link>
                        
                        <Nav.Link onClick={handleLogout} className="nav-icon-link">
                            <FaSignOutAlt className="nav-icon" />
                            <span className="nav-text">Logout</span>
                        </Nav.Link>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default AuthNavbar; 