import React from 'react';
import { Card, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaArrowUp, FaArrowDown, FaStar, FaRegStar } from 'react-icons/fa';
import { formatCurrency, formatPercentage } from '../../lib/utils/formatUtils';
import './StockCard.css';

const StockCard = ({ stock, isInWatchlist, onToggleWatchlist }) => {
  const isPriceChangePositive = stock.change_percentage > 0;

  return (
    <Card className="stock-card">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <Link to={`/stock/${stock.symbol}`} className="stock-card-title">
              <h5 className="mb-0">{stock.name}</h5>
            </Link>
            <p className="stock-card-symbol mb-0">{stock.symbol}</p>
          </div>
          <div onClick={(e) => {
            e.preventDefault();
            onToggleWatchlist && onToggleWatchlist(stock);
          }} className="watchlist-star">
            {isInWatchlist ? (
              <FaStar className="text-warning" />
            ) : (
              <FaRegStar />
            )}
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-end">
          <div>
            <h4 className="stock-card-price mb-0">{formatCurrency(stock.current_price)}</h4>
            <div className={`stock-card-change ${isPriceChangePositive ? 'positive' : 'negative'}`}>
              {isPriceChangePositive ? <FaArrowUp /> : <FaArrowDown />}
              <span className="ms-1">
                {formatCurrency(stock.price_change)} ({formatPercentage(stock.change_percentage)})
              </span>
            </div>
          </div>
          <div>
            {stock.sector && (
              <Badge bg="light" text="dark" className="sector-badge">
                {stock.sector}
              </Badge>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default StockCard; 