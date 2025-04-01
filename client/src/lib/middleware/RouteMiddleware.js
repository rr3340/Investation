import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

//Conditionally renders navbar.
export const ConditionalRender = ({ children, shouldRender, renderContent }) => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  if (typeof shouldRender === 'function' && !shouldRender(location)) {
    return null;
  }
  
  if (typeof renderContent === 'function') {
    return renderContent(isAuthenticated);
  }
  
  return children;
};

//Route changes logged.
export const RouteLogger = ({ children }) => {
  const location = useLocation();
  
  React.useEffect(() => {
    console.log(`Route changed to: ${location.pathname}`);
  }, [location]);
  
  return children;
}; 