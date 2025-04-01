import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, ListGroup, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaBell, FaTrash, FaExclamationCircle, FaArrowLeft } from 'react-icons/fa';
import { useAuth } from '../../lib/hooks/useAuth';
import { priceAlertApi } from '../../lib/api';
import './Notifications.css';

const Notifications = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [priceAlerts, setPriceAlerts] = useState([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);
  const [success, setSuccess] = useState(null);

  //Fetches user's price alerts.
  useEffect(() => {
    const fetchPriceAlerts = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('Fetching price alerts for Notifications component...');
        
        const alerts = await priceAlertApi.getUserPriceAlerts();
        console.log('All price alerts:', alerts);
        
        if (!Array.isArray(alerts)) {
          console.error('Price alerts data is not an array:', alerts);
          setError("Invalid data format received from server");
          setLoading(false);
          return;
        }
        
        //Filters to active alerts only.
        const activeAlerts = alerts.filter(alert => alert.status === 'active');
        console.log('Active alerts:', activeAlerts);
        
        setPriceAlerts(activeAlerts);
        
        //Checks for triggered alerts.
        try {
          const result = await priceAlertApi.checkPriceAlerts();
          console.log('Triggered alerts response:', result);
          
          const triggered = result.triggered_alerts || [];
          console.log('Triggered alerts:', triggered);
          
          setTriggeredAlerts(triggered);
        } catch (checkError) {
          console.error('Error checking triggered alerts:', checkError);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching price alerts:", err);
        setError("Failed to load your price alerts. Please try again later.");
        setLoading(false);
      }
    };

    fetchPriceAlerts();
    
    //Sets up polling check to alert every 30 seconds for the next interval.
    const intervalId = setInterval(async () => {
      if (!currentUser) return;
      
      try {
        console.log('Polling for triggered alerts...');
        const result = await priceAlertApi.checkPriceAlerts();
        const triggered = result.triggered_alerts || [];
        
        if (triggered.length > 0) {
          console.log('New triggered alerts found:', triggered);
          setTriggeredAlerts(triggered);
          
          // Refresh the active alerts list too
          const alerts = await priceAlertApi.getUserPriceAlerts();
          const activeAlerts = Array.isArray(alerts) ? alerts.filter(alert => alert.status === 'active') : [];
          setPriceAlerts(activeAlerts);
        }
      } catch (err) {
        console.error("Error in alert polling:", err);
      }
    }, 30000); //Checks every 30s.
    
    return () => clearInterval(intervalId);
  }, [currentUser]);

  //Delete price alert.
  const handleDeleteAlert = async (alertId) => {
    if (!alertId) {
      console.error("Cannot delete alert: No alert ID provided");
      setError("Failed to delete price alert: Missing alert ID");
      return;
    }

    try {
      console.log(`Deleting price alert with ID: ${alertId}`);
      await priceAlertApi.deletePriceAlert(alertId);
      console.log(`Successfully deleted alert ID: ${alertId}`);

      //Update triggered and active alerts lists when necessary.
      setPriceAlerts(priceAlerts.filter(alert => alert.id !== alertId));
      setTriggeredAlerts(triggeredAlerts.filter(alert => alert.alert_id !== alertId));

      //Shows the temporary success message.
      const tempMessage = "Price alert deleted successfully.";
      setError(null);
      setSuccess(tempMessage);
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);

      //Refreshes alertsto be synced w/ server.
      try {
        const alerts = await priceAlertApi.getUserPriceAlerts();
        if (Array.isArray(alerts)) {
          const activeAlerts = alerts.filter(alert => alert.status === 'active');
          setPriceAlerts(activeAlerts);
        }
      } catch (refreshErr) {
        console.error("Error refreshing alerts list:", refreshErr);
      }
    } catch (err) {
      console.error("Error deleting price alert:", err);
      console.error("Error details:", err.response?.data || 'No response data');
      setError("Failed to delete price alert. Please try again.");
    }
  };

  //Formats the currency values.
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  //Renders function for alert status.
  const renderAlertStatus = (status) => {
    if (status === 'active') {
      return <Badge bg="success">Active</Badge>;
    } else {
      return <Badge bg="secondary">Inactive</Badge>;
    }
  };

  //If the user is not logged in, show the login prompt.
  if (!currentUser) {
    return (
      <Container className="notifications-container mt-5">
        <Row className="justify-content-center">
          <Col md={8}>
            <Card className="notification-card">
              <Card.Body className="text-center">
                <FaExclamationCircle className="notification-icon mb-3" />
                <h3>Login Required</h3>
                <p>You need to be logged in to view your notifications.</p>
                <Link to="/login" className="btn btn-primary">
                  Login Now
                </Link>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="notifications-container mt-4">
      <Row className="mb-4">
        <Col>
          <Link to="/" className="back-link">
            <FaArrowLeft /> Back to Home
          </Link>
          <h2 className="notifications-heading">
            <FaBell className="notification-icon" /> Your Notifications
          </h2>
        </Col>
      </Row>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <>
          {error && (
            <Alert variant="danger" className="mb-4">
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success" className="mb-4">
              {success}
            </Alert>
          )}

          {/*Triggered Alerts Section */}
          {triggeredAlerts && triggeredAlerts.length > 0 && (
            <Card className="mb-4 alert-card triggered">
              <Card.Header className="bg-warning text-dark">
                <h4><FaBell /> Price Alerts Triggered</h4>
              </Card.Header>
              <ListGroup variant="flush">
                {triggeredAlerts.map((alert) => (
                  <ListGroup.Item key={`triggered-${alert.alert_id}`} className="d-flex justify-content-between align-items-center">
                    <div>
                      <Link to={`/stock/${alert.stock_key}`} className="stock-link">
                        <strong>{alert.stock_key}</strong>
                      </Link>
                      <p className="mb-0">
                        Price Alert Triggered! {alert.stock_key} {alert.current_price >= alert.target_price ? 'rose to' : 'fell to'} {formatCurrency(alert.current_price)}, crossing your target of {formatCurrency(alert.target_price)}
                      </p>
                      <small className="text-muted">
                        Triggered at: {new Date(alert.timestamp).toLocaleString()}
                      </small>
                    </div>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDeleteAlert(alert.alert_id)}
                    >
                      <FaTrash /> Dismiss
                    </Button>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card>
          )}

          {/*Active Alerts Section*/}
          <Card className="mb-4 alert-card">
            <Card.Header className="alert-card-header">
              <h4>Your Active Price Alerts</h4>
            </Card.Header>
            {priceAlerts.length === 0 ? (
              <Card.Body className="text-center py-5">
                <p className="mb-0">You don't have any active price alerts.</p>
                <Link to="/dashboard" className="btn btn-primary mt-3">
                  Browse Stocks
                </Link>
              </Card.Body>
            ) : (
              <ListGroup variant="flush">
                {priceAlerts.map((alert) => (
                  <ListGroup.Item key={alert.id} className="d-flex justify-content-between align-items-center">
                    <div>
                      <Link to={`/stock/${alert.stock_key}`} className="stock-link">
                        <strong>{alert.stock_key}</strong>
                      </Link>
                      <p className="mb-0">
                        Target price: {formatCurrency(alert.target_price)}
                      </p>
                      <small className="text-muted">
                        Created: {new Date(alert.created_at).toLocaleString()}
                      </small>
                      <div>{renderAlertStatus(alert.status)}</div>
                    </div>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDeleteAlert(alert.id)}
                    >
                      <FaTrash /> Delete
                    </Button>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card>
        </>
      )}
    </Container>
  );
};

export default Notifications; 