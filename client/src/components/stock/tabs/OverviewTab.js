import React from 'react';
import { Card, Row, Col, Table } from 'react-bootstrap';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { formatDate, formatTime, formatDateTime, ensureUTCDate } from '../../../lib/utils/dateUtils';
import { formatCurrency, formatPercentage } from '../../../lib/utils/formatUtils';
import { formatNumberWithCommas } from '../../../lib/utils/numberUtils';

const OverviewTab = ({ stock, priceData, historicalData }) => {
  const formatDateToDisplay = (dateString) => {
    if (!dateString) return 'N/A';
    return formatDateTime(new Date(ensureUTCDate(dateString)));
  };

  const prepareChartData = () => {
    if (!historicalData || historicalData.length === 0) return [];

    const sortedData = [...historicalData].sort((a, b) => 
      new Date(ensureUTCDate(a.datetime)) - new Date(ensureUTCDate(b.datetime))
    );
    
    return sortedData.map(item => {
      const date = new Date(ensureUTCDate(item.datetime));
      
      let formattedTime;
      if (sortedData.length > 0) {
        const firstDay = new Date(ensureUTCDate(sortedData[0].datetime)).getDate();
        const currentDay = date.getDate();
        
        if (currentDay !== firstDay) {
          formattedTime = formatDateTime(date);
        } else {
          formattedTime = formatTime(date);
        }
      } else {
        formattedTime = formatTime(date);
      }
      
      return {
        name: formattedTime,
        price: item.close,
        open: item.open,
        high: item.high,
        low: item.low,
        volume: item.volume
      };
    });
  };

  const getPriceChangeColor = () => {
    if (!historicalData || historicalData.length < 2) return "#8884d8";
    
    const sortedData = [...historicalData].sort((a, b) => 
      new Date(ensureUTCDate(a.datetime)) - new Date(ensureUTCDate(b.datetime))
    );
    
    const priceStart = sortedData[0]?.close || 0;
    const priceEnd = sortedData[sortedData.length - 1]?.close || 0;
    
    return priceEnd >= priceStart ? "#28a745" : "#dc3545";
  };

  const chartData = prepareChartData();
  const priceChangeColor = getPriceChangeColor();

  return (
    <div className="overview-tab">
      <Row className="mb-4">
        <Col>
          <h4 className="mb-3">Price History</h4>
          <div className="chart-container">
            {historicalData && historicalData.length > 0 ? (
              <Card>
                <Card.Body>
                  <div style={{ height: '300px', marginBottom: '20px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          tickLine={true}
                          tick={{fontSize: 12}}
                        />
                        <YAxis 
                          domain={['auto', 'auto']}
                          tickFormatter={(value) => value.toFixed(0)}
                        />
                        <Tooltip 
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="recharts-custom-tooltip" style={{
                                  backgroundColor: '#f8f9fa',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  padding: '10px',
                                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                                }}>
                                  <p className="recharts-tooltip-label" style={{ margin: '0 0 10px 0' }}>Time: {label}</p>
                                  {payload.map((entry, index) => {
                                    if (entry.value === null || entry.value === undefined) return null;
                                    
                                    return (
                                      <p key={`item-${index}`} style={{ 
                                        margin: '5px 0',
                                        color: 'inherit'
                                      }}>
                                        <span style={{ 
                                          display: 'inline-block', 
                                          width: '10px', 
                                          height: '10px', 
                                          backgroundColor: entry.color,
                                          marginRight: '5px'
                                        }}></span>
                                        <span>
                                          {entry.name}: {formatCurrency(entry.value)}
                                        </span>
                                      </p>
                                    );
                                  })}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Line 
                          type="monotone" 
                          dataKey="price" 
                          stroke={priceChangeColor} 
                          name="Price" 
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                          isAnimationActive={true}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {historicalData.length > 0 && (
                    <>
                      <div className="text-muted mb-2">
                        Showing data from {formatDateToDisplay(historicalData[0].datetime)} to {formatDateToDisplay(historicalData[historicalData.length - 1].datetime)}
                      </div>
                    </>
                  )}
                </Card.Body>
              </Card>
            ) : (
              <Card className="text-center py-5">
                <Card.Body>
                  <p>Fetching historical price data...</p>
                </Card.Body>
              </Card>
            )}
          </div>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Card className="metrics-card">
            <Card.Header>Current Data</Card.Header>
            <Card.Body>
              <div className="metric-item">
                <span className="metric-label">Latest Price</span>
                <span className="metric-value">
                  {priceData?.latest_price ? formatCurrency(priceData.latest_price) : 'N/A'}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Last Updated</span>
                <span className="metric-value">
                  {priceData?.timestamp ? formatDateToDisplay(priceData.timestamp) : 'N/A'}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Stock Key</span>
                <span className="metric-value">
                  {stock?.stock_key || 'N/A'}
                </span>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="metrics-card">
            <Card.Header>Company Information</Card.Header>
            <Card.Body>
              <div className="metric-item">
                <span className="metric-label">Name</span>
                <span className="metric-value">{stock?.name || 'N/A'}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Sector</span>
                <span className="metric-value">{stock?.sector || 'N/A'}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Industry</span>
                <span className="metric-value">{stock?.industry || 'N/A'}</span>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OverviewTab; 