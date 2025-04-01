/**
 * Date utility functions for formatting and manipulating dates.
 * 
 * INFO ON TIMEZONE HANDLING:
 * 
 * The backend returns date strings in UTC format, sometimes without the 'Z' timezone marker if the data isn't properlly processed.
 * For the processed data, we use ensureUTCDate, adding the 'Z' if missing.
 * When displaying the dates, we convert to the local timezone automatically through Date objects.
 * When making any API calls, we use toISOString(), ensuring proper UTC formatting.
 */

// The cache for the formatters.
const formatterCache = {
  date: {},
  time: {},
  datetime: {}
};

// Get the cached formatter for datetime ops, and create a cache key from the options. Then return if exists. 
// Or else, create a new formatter.
const getCachedFormatter = (type, options) => {
  const key = JSON.stringify(options);
  
  if (formatterCache[type][key]) {
    return formatterCache[type][key];
  }
  
  const formatter = new Intl.DateTimeFormat(undefined, options);
  formatterCache[type][key] = formatter;
  return formatter;
};

// Ensures a date string is properly formatted with UTC timezone.
// If the date doesn't have timezone info, it assumes UTC and adds a Z.
// This is because we use the UTC format inthe API
export const ensureUTCDate = (dateString) => {
  if (!dateString) return dateString;
  
  if (typeof dateString !== 'string') return dateString;
  
  if (/Z|[+-]\d{2}:\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  return `${dateString}Z`;
};

// Format the date string into a human-readable format.
//If the date string contains any timezone info, convert it to the local time.
export const formatDate = (dateInput) => {
  if (!dateInput) return 'Unknown date';
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    };
    
    const formatter = getCachedFormatter('date', options);
    return formatter.format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return typeof dateInput === 'string' ? dateInput : 'Invalid date';
  }
};

// Format a datetime string with both the date and the time in local timezone.
export const formatDateTime = (dateInput, includeSeconds = false) => {
  if (!dateInput) return 'Unknown date';
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      timeZoneName: 'short'
    };
    
    const formatter = getCachedFormatter('datetime', options);
    return formatter.format(date);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return typeof dateInput === 'string' ? dateInput : 'Invalid date';
  }
};

export const formatTime = (dateInput, include12Hour = true) => {
  if (!dateInput) return '';
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    const options = { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: include12Hour
    };
    
    const formatter = getCachedFormatter('time', options);
    return formatter.format(date);
  } catch (error) {
    console.error('Error formatting time:', error);
    return '';
  }
};

const TIME_UNITS = {
  minute: 60,
  hour: 60 * 60,
  day: 24 * 60 * 60,
  month: 30 * 24 * 60 * 60,
  year: 365 * 24 * 60 * 60
};

export const timeAgo = (dateInput) => {
  if (!dateInput) return '';
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    }
    
    if (diffInSeconds < TIME_UNITS.hour) {
      const minutes = Math.floor(diffInSeconds / TIME_UNITS.minute);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    if (diffInSeconds < TIME_UNITS.day) {
      const hours = Math.floor(diffInSeconds / TIME_UNITS.hour);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    
    if (diffInSeconds < TIME_UNITS.month) {
      const days = Math.floor(diffInSeconds / TIME_UNITS.day);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
    
    if (diffInSeconds < TIME_UNITS.year) {
      const months = Math.floor(diffInSeconds / TIME_UNITS.month);
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    }
    
    const years = Math.floor(diffInSeconds / TIME_UNITS.year);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  } catch (error) {
    console.error('Error calculating time ago:', error);
    return typeof dateInput === 'string' ? dateInput : 'Invalid date';
  }
};

export const formatDateCustom = (dateInput, format = "MM/DD/YYYY") => {
  if (!dateInput) return '';
  
  try {
    // Convert to Date object if string
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    
    let result = format;
    result = result.replace('MM', month);
    result = result.replace('DD', day);
    result = result.replace('YYYY', year);
    
    return result;
  } catch (error) {
    console.error('Error formatting date with custom format:', error);
    return '';
  }
}; 