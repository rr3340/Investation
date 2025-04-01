import React from 'react';
import { ListGroup } from 'react-bootstrap';
import { FaUser, FaChartLine } from 'react-icons/fa';
import './SearchSuggestions.css';

const SearchSuggestions = ({ suggestions, onSelectSuggestion, loading }) => {
  if (loading) {
    return (
      <div className="search-suggestions-container">
        <div className="search-suggestions-loading">
          Loading suggestions...
        </div>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null;
  }
  
  // Group suggestions by type.
  const stockSuggestions = suggestions.filter(suggestion => suggestion.type === 'stock');
  const userSuggestions = suggestions.filter(suggestion => suggestion.type === 'user');

  return (
    <div className="search-suggestions-container">
      <ListGroup className="search-suggestions-list">
        {/*Stocks Section */}
        {stockSuggestions.length > 0 && (
          <>
            <ListGroup.Item className="suggestion-category">
              <FaChartLine className="category-icon" /> Stocks
            </ListGroup.Item>
            {stockSuggestions.map((suggestion, index) => (
              <ListGroup.Item 
                key={`stock-${suggestion.stock_key || index}`}
                action
                onClick={() => onSelectSuggestion(suggestion)}
                className="search-suggestion-item stock-suggestion"
              >
                <span className="suggestion-symbol">{suggestion.stock_key}</span>
                <span className="suggestion-name">{suggestion.name}</span>
              </ListGroup.Item>
            ))}
          </>
        )}
        
        {/*Users Section */}
        {userSuggestions.length > 0 && (
          <>
            <ListGroup.Item className="suggestion-category">
              <FaUser className="category-icon" /> Users
            </ListGroup.Item>
            {userSuggestions.map((suggestion, index) => (
              <ListGroup.Item 
                key={`user-${suggestion.id || index}`}
                action
                onClick={() => onSelectSuggestion(suggestion)}
                className="search-suggestion-item user-suggestion"
              >
                {suggestion.profile_img && (
                  <img 
                    src={suggestion.profile_img} 
                    alt={suggestion.username} 
                    className="suggestion-profile-img"
                  />
                )}
                {!suggestion.profile_img && (
                  <div className="suggestion-profile-placeholder">
                    {(suggestion.display_name || suggestion.username || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="suggestion-user-info">
                  <span className="suggestion-display-name">{suggestion.display_name || suggestion.username}</span>
                  {suggestion.display_name && (
                    <span className="suggestion-username">@{suggestion.username}</span>
                  )}
                </div>
              </ListGroup.Item>
            ))}
          </>
        )}
      </ListGroup>
    </div>
  );
};

export default SearchSuggestions; 