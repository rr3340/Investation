export const decodeToken = (token) => {
  if (!token) {
    console.error('No token provided to decode');
    return null;
  }

  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      console.error('Invalid token format - missing payload');
      return null;
    }
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export const isAuthenticated = () => {
  const token = localStorage.getItem('accessToken');
  
  if (!token) {
    return false;
  }
  
  const decodedToken = decodeToken(token);
  
  if (!decodedToken) {
    return false;
  }
  
  const currentTime = Date.now() / 1000;
  return decodedToken.exp > currentTime;
};

export const getCurrentUserId = () => {
  const token = localStorage.getItem('accessToken');
  
  if (!token) {
    return null;
  }
  
  const decodedToken = decodeToken(token);
  
  if (!decodedToken) {
    return null;
  }
  
  return decodedToken.sub;
};

export const hasRole = (role) => {
  const token = localStorage.getItem('accessToken');
  
  if (!token) {
    return false;
  }
  
  const decodedToken = decodeToken(token);
  
  if (!decodedToken || !decodedToken.roles) {
    return false;
  }
  
  return decodedToken.roles.includes(role);
}; 