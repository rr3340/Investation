import React, { useState, useEffect } from 'react';
import { Card, Spinner, Alert, Nav } from 'react-bootstrap';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { investmentApi, portfolioApi, stockApi } from '../../../../lib/api';
import { formatCurrency } from '../../../../lib/utils/formatUtils';
import './AssetAllocationWidget.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];

const AssetAllocationWidget = ({ userId }) => {
  const [allocationData, setAllocationData] = useState({ bySector: [], byIndustry: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('sector');
  
  useEffect(() => {
    const fetchAllocationData = async () => {
      if (!userId) {
        setError("User ID is required");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      // Getting portfolio data, and then allocating the portfolio investments accordingly. We get each investment data using the ID.
      // We then get the stock details for each investment, and then get the latest prices to calculate the current values.
      try {
        console.log(`Fetching allocation data for user ID: ${userId}`);
        
        const portfolioData = await portfolioApi.getPortfolioUser(userId);
        console.log("Portfolio data:", portfolioData);
        
        if (!portfolioData || !portfolioData.investments || portfolioData.investments.length === 0) {
          setAllocationData({ bySector: [], byIndustry: [] });
          setLoading(false);
          return;
        }
        
        const investmentIds = portfolioData.investments.map(inv => inv.investment_id);
        console.log("Investment IDs:", investmentIds);
        
        const investmentsData = await investmentApi.getUserInvestments(userId);
        console.log("Investment data:", investmentsData);
        
        if (!investmentsData || investmentsData.length === 0) {
          setAllocationData({ bySector: [], byIndustry: [] });
          setLoading(false);
          return;
        }
        
        const stockKeys = investmentsData.map(inv => inv.stock_key);
        const uniqueStockKeys = [...new Set(stockKeys)];
        console.log("Unique stock keys:", uniqueStockKeys);
        
        const investmentsMap = {};
        investmentsData.forEach(inv => {
          investmentsMap[inv.investment_id] = inv;
        });
        
        const stockDetailsPromises = uniqueStockKeys.map(key => stockApi.getStockDetails(key));
        const stockDetailsResults = await Promise.all(stockDetailsPromises);
        
        const stockDetailsMap = {};
        stockDetailsResults.forEach(stock => {
          if (stock && stock.stock_key) {
            stockDetailsMap[stock.stock_key] = stock;
          }
        });
        console.log("Stock details map:", stockDetailsMap);
        
        const pricePromises = uniqueStockKeys.map(key => stockApi.getLatestPrice(key));
        const priceResults = await Promise.all(pricePromises);
        
        const priceMap = {};
        priceResults.forEach((price, index) => {
          if (price && price.latest_price) {
            priceMap[uniqueStockKeys[index]] = price.latest_price;
          }
        });
        console.log("Price map:", priceMap);
        
        const allocations = calculateAssetAllocation(investmentsData, stockDetailsMap, priceMap);
        console.log("Calculated allocations:", allocations);
        setAllocationData(allocations);
        
      } catch (err) {
        console.error("Error fetching allocation data:", err);
        setError("Failed to load asset allocation data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllocationData();
  }, [userId]);
  
  //Asset allocations function. Processes each investment to then aggregate by sector and industry.
  const calculateAssetAllocation = (investments, stockDetails, priceMap) => {

    const sectorAllocations = {};
    const industryAllocations = {};
    let totalValue = 0;
    
    investments.forEach(investment => {
      const stock = stockDetails[investment.stock_key];
      if (!stock) return;
      
      const currentPrice = priceMap[investment.stock_key] || 0;
      const value = investment.quantity * currentPrice;
      totalValue += value;
      
      const sector = stock.sector || 'Unknown';
      if (!sectorAllocations[sector]) {
        sectorAllocations[sector] = 0;
      }
      sectorAllocations[sector] += value;
      
      const industry = stock.industry || 'Unknown';
      if (!industryAllocations[industry]) {
        industryAllocations[industry] = 0;
      }
      industryAllocations[industry] += value;
    });
    
    const bySector = Object.entries(sectorAllocations)
      .map(([name, value]) => ({
        name,
        value,
        percentage: totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.value - a.value);
    
    const byIndustry = Object.entries(industryAllocations)
      .map(([name, value]) => ({
        name,
        value,
        percentage: totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.value - a.value);
    
    return { bySector, byIndustry, totalValue };
  };
  
  const getCurrentData = () => {
    return activeView === 'sector' ? allocationData.bySector : allocationData.byIndustry;
  };
  
  const getTotalValue = () => {
    return getCurrentData().reduce((sum, item) => sum + item.value, 0);
  };
  
  //This renders the allocation table.
  const renderAllocationTable = () => {
    const data = getCurrentData();
    const totalValue = getTotalValue();
    
    if (data.length === 0) {
      return (
        <div className="allocation-table">
          <div className="center-message">No data available</div>
        </div>
      );
    }
    
    return (
      <div className="allocation-table">
        <h6>{activeView === 'sector' ? 'Sectors' : 'Industries'}</h6>
        <table>
          <thead>
            <tr>
              <th>{activeView === 'sector' ? 'Sector' : 'Industry'}</th>
              <th>Value</th>
              <th>Allocation</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td>
                  <span className="color-indicator" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  {item.name}
                </td>
                <td>{formatCurrency(item.value)}</td>
                <td>{item.percentage}%</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 'bold' }}>
              <td>Total</td>
              <td>{formatCurrency(totalValue)}</td>
              <td>100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };
  
  //A custom tooltip component for the pie chart.
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{data.name}</p>
          <p className="tooltip-value">{formatCurrency(data.value)}</p>
          <p className="tooltip-percentage">{data.percentage}%</p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="asset-allocation-widget">
      <Card className="asset-allocation-card">
        <div className="asset-allocation-header">
          <h5 className="asset-allocation-title">Asset Allocation</h5>
          <Nav className="allocation-tabs">
            <Nav.Link 
              active={activeView === 'sector'}
              onClick={() => setActiveView('sector')}
            >
              By Sector
            </Nav.Link>
            <Nav.Link 
              active={activeView === 'industry'}
              onClick={() => setActiveView('industry')}
            >
              By Industry
            </Nav.Link>
          </Nav>
        </div>
        
        {loading ? (
          <div className="center-message">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        ) : error ? (
          <Alert variant="danger" className="m-3">{error}</Alert>
        ) : getCurrentData().length === 0 ? (
          <div className="center-message">
            No allocation data available. Add investments to see your asset allocation.
          </div>
        ) : (
          <div className="allocation-container">
            <div className="allocation-chart">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getCurrentData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    innerRadius={60}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {getCurrentData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {renderAllocationTable()}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AssetAllocationWidget; 