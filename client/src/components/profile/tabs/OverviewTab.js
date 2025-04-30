import React, { useState } from 'react';
import { Row, Col, Card, ProgressBar, Table } from 'react-bootstrap';
import { FaChartLine, FaChartPie, FaMoneyBillWave, FaShieldAlt } from 'react-icons/fa';
import { AssetAllocationWidget } from '../widgets';
import { formatCurrency, formatPercentage } from '../../../lib/utils/formatUtils';
import { formatDate } from '../../../lib/utils/dateUtils';
import './TabStyles.css';

const OverviewTab = ({ userId, userData, portfolioData, investmentsData }) => {
    const [loading, setLoading] = useState(false);
    
    // Get the risk info based on risk score or risk_tolerance.
    const getRiskInfo = (riskScore, riskTolerance) => {
        // If risk_tolerance exists, use it directly
        if (riskTolerance) {
            const tolerance = riskTolerance.toLowerCase();
            if (tolerance === 'low') return { level: 'Low', color: 'success' };
            if (tolerance === 'medium') return { level: 'Medium', color: 'warning' };
            if (tolerance === 'high') return { level: 'High', color: 'danger' };
        }
        
        // Fallback to the risk score if available.
        if (riskScore !== undefined && riskScore !== null) {
            if (riskScore < 20) return { level: 'Very Low', color: 'success' };
            if (riskScore < 40) return { level: 'Low', color: 'info' };
            if (riskScore < 60) return { level: 'Moderate', color: 'warning' };
            if (riskScore < 80) return { level: 'High', color: 'danger' };
            return { level: 'Very High', color: 'danger' };
        }
        
        // Default if neither is available.
        return { level: 'Unknown', color: 'secondary' };
    };
    
    // Get the risk level and color.
    const riskInfo = getRiskInfo(portfolioData?.risk_score, portfolioData?.risk_tolerance);
    
    //Calculate the total investment value.
    const totalInvestmentValue = investmentsData?.reduce((total, investment) => {
        const value = investment.current_value || (investment.current_price * investment.quantity) || 0;
        return total + value;
    }, 0);

    // Calculate unrealized gains by using the portfolio data if available.
    //Otherwise, calculate from investments with that data.
    let unrealizedGains;
    if (portfolioData?.unrealized_gains !== undefined && portfolioData?.unrealized_gains !== null) {
        unrealizedGains = parseFloat(portfolioData.unrealized_gains);
    } else if (investmentsData && investmentsData.length > 0) {
        unrealizedGains = investmentsData.reduce((total, investment) => {
            const initialValue = investment.initial_value || (investment.purchase_price * investment.quantity) || 0;
            const currentValue = investment.current_value || (investment.current_price * investment.quantity) || 0;
            const gain = currentValue - initialValue;
            return total + gain;
        }, 0);
    }
    // If none, left undefined.

    // Gets the total assets value, prioritizing the portfolio data
    let totalAssets;
    if (portfolioData?.total_assets !== undefined && portfolioData?.total_assets !== null) {
        totalAssets = parseFloat(portfolioData.total_assets);
    } else if (totalInvestmentValue !== undefined && totalInvestmentValue !== null) {
        totalAssets = totalInvestmentValue;
    }
    // No default $0 fallback. totalAssets will be undefined if no data is available.

    return (
        <div className="overview-tab">
            <h2 className="tab-title">Portfolio Overview</h2>
            
            <Row className="mb-4">
                <Col md={6} lg={3} className="mb-3">
                    <Card className="h-100">
                        <Card.Body>
                            <div className="d-flex align-items-center mb-3">
                                <div className="icon-container bg-primary">
                                    <FaMoneyBillWave />
                                </div>
                                <h5 className="card-title mb-0 ms-2">Total Assets</h5>
                            </div>
                            <h3 className="metric-value">{formatCurrency(totalAssets)}</h3>
                            <p className={`${unrealizedGains > 0 ? 'text-success' : unrealizedGains < 0 ? 'text-danger' : 'text-muted'}`}>
                                {unrealizedGains > 0 ? '+' : ''}{formatCurrency(unrealizedGains)} unrealized {unrealizedGains > 0 ? 'gains' : 'losses'}
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
                
                <Col md={6} lg={3} className="mb-3">
                    <Card className="h-100">
                        <Card.Body>
                            <div className="d-flex align-items-center mb-3">
                                <div className="icon-container bg-success">
                                    <FaChartLine />
                                </div>
                                <h5 className="card-title mb-0 ms-2">Investments</h5>
                            </div>
                            <h3 className="metric-value">{portfolioData?.total_investments || investmentsData?.length || 0}</h3>
                            <p className="text-muted">Total number of investments</p>
                        </Card.Body>
                    </Card>
                </Col>
                
                <Col md={6} lg={3} className="mb-3">
                    <Card className="h-100">
                        <Card.Body>
                            <div className="d-flex align-items-center mb-3">
                                <div className="icon-container bg-warning">
                                    <FaShieldAlt />
                                </div>
                                <h5 className="card-title mb-0 ms-2">Risk Level</h5>
                            </div>
                            <h3 className="metric-value">{riskInfo.level}</h3>
                            <ProgressBar 
                                variant={riskInfo.color} 
                                now={portfolioData?.risk_score || 50} 
                                className="mt-2" 
                            />
                        </Card.Body>
                    </Card>
                </Col>
                
                <Col md={6} lg={3} className="mb-3">
                    <Card className="h-100">
                        <Card.Body>
                            <div className="d-flex align-items-center mb-3">
                                <div className="icon-container bg-info">
                                    <FaChartPie />
                                </div>
                                <h5 className="card-title mb-0 ms-2">Diversification</h5>
                            </div>
                            <h3 className="metric-value">{portfolioData?.diversification_score || 0}/100</h3>
                            <ProgressBar 
                                variant="info" 
                                now={portfolioData?.diversification_score || 0} 
                                className="mt-2" 
                            />
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            
            {/* Asset Allocation Widget */}
            <Row className="mb-4">
                <Col xs={12}>
                    <AssetAllocationWidget userId={userId} />
                </Col>
            </Row>
            
            {investmentsData && investmentsData.length > 0 && (
                <div className="recent-investments mb-4">
                    <h4 className="section-title">Recent Investments</h4>
                    <Card>
                        <Card.Body>
                            <Table responsive hover className="mb-0">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Symbol</th>
                                        <th>Quantity</th>
                                        <th>Value</th>
                                        <th>Change</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {investmentsData.slice(0, 5).map((investment, index) => (
                                        <tr key={investment.id || investment.investment_id || index}>
                                            <td>{investment.name || `Stock ${investment.symbol || investment.stock_key}`}</td>
                                            <td>{investment.symbol || investment.stock_key}</td>
                                            <td>{investment.quantity}</td>
                                            <td>{formatCurrency(investment.current_value || (investment.current_price * investment.quantity))}</td>
                                            <td className={investment.change_percentage >= 0 ? 'positive' : 'negative'}>
                                                {investment.change_percentage >= 0 ? '+' : ''}{formatPercentage(investment.change_percentage, false)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </div>
            )}
            
            <div className="portfolio-summary">
                <h4 className="section-title">Portfolio Summary</h4>
                <Card>
                    <Card.Body>
                        <p><strong>Account Created:</strong> {formatDate(userData?.created_at)}</p>
                        <p><strong>Risk Profile:</strong> {riskInfo.level}</p>
                        <p><strong>Risk Tolerance:</strong> {portfolioData?.risk_tolerance ? portfolioData.risk_tolerance.charAt(0).toUpperCase() + portfolioData.risk_tolerance.slice(1) : 'Unknown'}</p>
                        <p><strong>Total Assets:</strong> {formatCurrency(totalAssets)}</p>
                        {unrealizedGains !== undefined && (
                            <p>
                                <strong>Unrealized {unrealizedGains >= 0 ? 'Gains' : 'Losses'}:</strong> 
                                <span className={unrealizedGains > 0 ? 'text-success' : unrealizedGains < 0 ? 'text-danger' : ''}>
                                    {unrealizedGains > 0 ? ' +' : ' '}{formatCurrency(unrealizedGains)}
                                </span>
                            </p>
                        )}
                        <p><strong>Number of Investments:</strong> {portfolioData?.total_investments || investmentsData?.length || 0}</p>
                    </Card.Body>
                </Card>
            </div>
        </div>
    );
};

export default OverviewTab; 