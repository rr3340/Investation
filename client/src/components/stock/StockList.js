import React, { useState, useEffect } from 'react';
import { Row, Col, Form, InputGroup } from 'react-bootstrap';
import { FaSearch, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import StockCard from './StockCard';
import { useAuth } from '../../lib/hooks/useAuth';
import { watchlistApi } from '../../lib/api';
import './StockList.css';

const StockList = ({ stocks, title, emptyMessage }) => {
  const { currentUser } = useAuth();
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [watchlist, setWatchlist] = useState([]);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(false);

  // Filters and sort stocks when the search filter changes.
  useEffect(() => {
    if (!stocks) return;

    let result = [...stocks];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(stock => 
        stock.name.toLowerCase().includes(searchLower) || 
        stock.symbol.toLowerCase().includes(searchLower) ||
        (stock.sector && stock.sector.toLowerCase().includes(searchLower))
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'price':
          comparison = a.current_price - b.current_price;
          break;
        case 'change':
          comparison = a.change_percentage - b.change_percentage;
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredStocks(result);
  }, [stocks, searchTerm, sortField, sortDirection]);

  useEffect(() => {
    const fetchWatchlist = async () => {
      if (!currentUser) {
        setWatchlist([]);
        return;
      }

      try {
        setIsLoadingWatchlist(true);
        const watchlistData = await watchlistApi.getUserWatchlist(currentUser.id);
        setWatchlist(watchlistData);
      } catch (error) {
        console.error('Error fetching watchlist:', error);
        setWatchlist([]);
      } finally {
        setIsLoadingWatchlist(false);
      }
    };

    fetchWatchlist();
  }, [currentUser]);

  const isInWatchlist = (stock) => {
    if (!watchlist || !stock) return false;
    return watchlist.some(item => item.stock_key === stock.symbol);
  };

  const handleToggleWatchlist = async (stock) => {
    if (!currentUser) {
      alert('Please log in to add stocks to your watchlist');
      return;
    }

    try {
      if (isInWatchlist(stock)) {
        // Finds the watchlist item to remove.
        const watchlistItem = watchlist.find(item => item.stock_key === stock.symbol);
        if (watchlistItem) {
          await watchlistApi.removeFromWatchlist(watchlistItem.id);
          setWatchlist(prev => prev.filter(item => item.id !== watchlistItem.id));
        }
      } else {
        // Adds new stock to a watchlist.
        const newWatchlistItem = await watchlistApi.addToWatchlist({
          user_id: currentUser.id,
          stock_key: stock.symbol
        });
        setWatchlist(prev => [...prev, newWatchlistItem]);
      }
    } catch (error) {
      console.error('Error updating watchlist:', error);
      alert('Failed to update watchlist. Please try again.');
    }
  };

  // Handles the sort.
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <FaSort />;
    return sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  return (
    <div className="stock-list">
      {title && <h3 className="mb-3">{title}</h3>}
      
      <div className="stock-list-controls mb-3">
        <Row>
          <Col md={6}>
            <InputGroup>
              <Form.Control
                placeholder="Search stocks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <InputGroup.Text>
                <FaSearch />
              </InputGroup.Text>
            </InputGroup>
          </Col>
          <Col md={6}>
            <div className="sort-controls d-flex justify-content-md-end mt-3 mt-md-0">
              <div className="sort-by me-2">Sort by:</div>
              <div 
                className={`sort-option ${sortField === 'name' ? 'active' : ''}`}
                onClick={() => handleSort('name')}
              >
                Name {getSortIcon('name')}
              </div>
              <div 
                className={`sort-option ${sortField === 'symbol' ? 'active' : ''}`}
                onClick={() => handleSort('symbol')}
              >
                Symbol {getSortIcon('symbol')}
              </div>
              <div 
                className={`sort-option ${sortField === 'price' ? 'active' : ''}`}
                onClick={() => handleSort('price')}
              >
                Price {getSortIcon('price')}
              </div>
              <div 
                className={`sort-option ${sortField === 'change' ? 'active' : ''}`}
                onClick={() => handleSort('change')}
              >
                Change {getSortIcon('change')}
              </div>
            </div>
          </Col>
        </Row>
      </div>
      
      {filteredStocks.length === 0 ? (
        <div className="text-center py-4">
          <p>{emptyMessage || 'No stocks found'}</p>
        </div>
      ) : (
        <Row>
          {filteredStocks.map(stock => (
            <Col key={stock.symbol} md={6} lg={4}>
              <StockCard 
                stock={stock} 
                isInWatchlist={isInWatchlist(stock)}
                onToggleWatchlist={handleToggleWatchlist}
              />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default StockList; 