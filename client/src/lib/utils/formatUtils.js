export const formatCurrency = (value) => {
  if (value === undefined || value === null) return 'N/A';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value);
};

export const formatPercentage = (value, isDecimal = false, includeSign = false) => {
  if (value === undefined || value === null) return 'N/A';
  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return '0.00%';
  }
  
  if (isDecimal) {
    const formattedValue = (numValue * 100).toFixed(2);
    return includeSign && numValue > 0 ? `+${formattedValue}%` : `${formattedValue}%`;
  } else {
    const formattedValue = new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue / 100);
    
    return includeSign && numValue > 0 ? `+${formattedValue}` : formattedValue;
  }
};

export const formatLargeNumber = (value) => {
  if (value === undefined || value === null) return 'N/A';
  
  if (Math.abs(value) >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  } else if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  
  return value.toString();
}; 