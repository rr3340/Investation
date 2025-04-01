import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Row, Col } from 'react-bootstrap';
import marketScheduler from '../../services/MarketScheduler';

const MarketStatus = () => {
  const [status, setStatus] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  
  useEffect(() => {
    //Updates, counting up every second.
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setStatus(marketScheduler.getMarketStatus());
    }, 1000);
    
    return () => clearInterval(timer);
  }, [refreshKey]);
  
  //This formats the time to display.
  const formatTime = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleTimeString();
  };
  
  const handleTriggerUpdate = async () => {
    try {
      await marketScheduler.triggerUpdate();
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error triggering update:', error);
    }
  };
  
  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <span>US Market Status</span>
          <Badge bg={status.is_market_open ? 'success' : 'danger'}>
            {status.is_market_open ? 'OPEN' : 'CLOSED'}
          </Badge>
        </div>
      </Card.Header>
      <Card.Body>
        <Row className="mb-3">
          <Col>
            <Button 
              variant="primary"
              onClick={handleTriggerUpdate}
            >
              Trigger Update Now
            </Button>
          </Col>
        </Row>
        <Table striped bordered>
          <tbody>
            <tr>
              <td>Scheduler Status</td>
              <td>
                <Badge bg={marketScheduler.isRunning ? 'success' : 'secondary'}>
                  {marketScheduler.isRunning ? 'RUNNING' : 'STOPPED'}
                </Badge>
              </td>
            </tr>
            <tr>
              <td>Local Time</td>
              <td>{currentTime.toLocaleTimeString()}</td>
            </tr>
            <tr>
              <td>Eastern Time</td>
              <td>{formatTime(status.current_time_et)}</td>
            </tr>
            <tr>
              <td>Market Status</td>
              <td>{status.is_market_open ? 'Open' : 'Closed'}</td>
            </tr>
            <tr>
              <td>Next Update</td>
              <td>{formatTime(status.next_update)}</td>
            </tr>
            <tr>
              <td>Time to Next Candle</td>
              <td>
                {status.minutes_to_next_candle !== null ? 
                  `${status.minutes_to_next_candle} minutes` : 'N/A'}
              </td>
            </tr>
            <tr>
              <td>Last Update</td>
              <td>{formatTime(status.last_update) || 'Never'}</td>
            </tr>
            {status.is_market_open && (
              <tr>
                <td>Market Session Progress</td>
                <td>
                  {status.minutes_since_market_open !== null ? 
                    `${status.minutes_since_market_open} minutes since open` : 'N/A'}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
};

export default MarketStatus; 