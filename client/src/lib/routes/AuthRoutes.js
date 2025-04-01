import React from 'react';
import { Route } from 'react-router-dom';
import { RedirectIfAuthenticated } from '../middleware';
import Login from '../../components/Login';
import SignUp from '../../components/SignUp';
import ForgotPassword from '../../components/ForgotPassword';

//Authentication routes.
export const AuthRoutes = () => {
  return [
    <Route 
      key="login" 
      path="/login" 
      element={
        <RedirectIfAuthenticated>
          <Login />
        </RedirectIfAuthenticated>
      } 
    />,
    <Route 
      key="signup" 
      path="/signup" 
      element={
        <RedirectIfAuthenticated>
          <SignUp />
        </RedirectIfAuthenticated>
      } 
    />,
    <Route 
      key="forgot-password" 
      path="/forgot-password" 
      element={
        <RedirectIfAuthenticated>
          <ForgotPassword />
        </RedirectIfAuthenticated>
      } 
    />
  ];
};

export default AuthRoutes; 