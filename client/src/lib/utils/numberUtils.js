// Formatting a number with commas as thousand separators.
export const formatNumberWithCommas = (num) => {
  if (num === null || num === undefined) return 'N/A';
  
  // Handles the non-numeric inputs.
  if (isNaN(num)) return 'N/A';
  
  // Formats number with commas.
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Formatting a number to a specific precision.
export const formatNumberPrecision = (num, precision = 2) => {
  if (num === null || num === undefined) return 'N/A';
  
  //Handles the non-numeric inputs.
  if (isNaN(num)) return 'N/A';
  
  return Number(num).toFixed(precision);
};

// Shortenning large numbers with K, M, B suffixes.
export const shortenNumber = (num) => {
  if (num === null || num === undefined) return 'N/A';
  
  // Handle non-numeric inputs
  if (isNaN(num)) return 'N/A';
  
  const absNum = Math.abs(num);
  
  if (absNum >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  
  if (absNum >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  
  if (absNum >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  
  return num.toString();
}; 