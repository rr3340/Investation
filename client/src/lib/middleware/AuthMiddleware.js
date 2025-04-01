import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

//Middleware to protect the routes that require authentication.
export const RequireAuth = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    //If not authenticated, redirect to the login page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
};

//Middleware to redirect authenticated users away from auth pages.
export const RedirectIfAuthenticated = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (isAuthenticated) {
    //When re-authenticated, redirect to the home page, or the page user was trying to access.
    const from = location.state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }
  
  return children;
}; 