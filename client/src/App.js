import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/context/AuthContext';
import { ConditionalRender, RouteLogger } from './lib/middleware';
import { RedirectIfAuthenticated, RequireAuth } from './lib/middleware/AuthMiddleware';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import ForgotPassword from './components/auth/ForgotPassword';
import Home from './components/pages/Home';
import About from './components/pages/About';
import Contact from './components/pages/Contact';
import MyNavbar from './components/layout/Navbar';
import Profile from './components/profile/Profile';
import AuthNavbar from './components/layout/AuthNavbar';
import StockDirectory from './components/stock/StockDirectory';
import Footer from './components/layout/Footer';
import ScrollToTop from './components/layout/ScrollToTop';
import StockDetail from './components/stock/StockDetail';
import Notifications from './components/pages/Notifications';
import marketScheduler from './services/MarketScheduler';
import './App.css';

const App = () => {
  // Starts the market scheduler when the app loads
  useEffect(() => {
    // The market scheduler is now auto-started when imported. 
    // It stops when the app close.
    return () => {
      marketScheduler.stop();
    };
  }, []);

  // Function to determine if the navbar should be shown.
  const shouldShowNavbar = (location) => {
    const hideNavbarPaths = ['/signup', '/forgot-password'];
    return !hideNavbarPaths.includes(location.pathname);
  };

  // Function to determine which navbar should be shown based on the authentication.
  const renderNavbar = (isAuthenticated) => {
    return isAuthenticated ? <AuthNavbar /> : <MyNavbar />;
  };

  // Function to determine if the footer should be shown.
  const shouldShowFooter = (location) => {
    const hideFooterPaths = ['/signup', '/login', '/forgot-password'];
    return !hideFooterPaths.includes(location.pathname);
  };

  return (
    <AuthProvider>
      <RouteLogger>
        <ScrollToTop />
        <div className="app-container">
          <ConditionalRender 
            shouldRender={shouldShowNavbar}
            renderContent={(isAuthenticated) => renderNavbar(isAuthenticated)}
          />
          
          <div className="content-container">            
            <Routes>
              {/* Auth Routes */}
              <Route path="/login" element={
                <RedirectIfAuthenticated>
                  <Login />
                </RedirectIfAuthenticated>
              } />
              <Route path="/signup" element={
                <RedirectIfAuthenticated>
                  <SignUp />
                </RedirectIfAuthenticated>
              } />
              <Route path="/forgot-password" element={
                <RedirectIfAuthenticated>
                  <ForgotPassword />
                </RedirectIfAuthenticated>
              } />
              
              {/* Protected Routes */}
              <Route path="/profile/:userId" element={
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              } />
              <Route path="/stocks" element={
                <RequireAuth>
                  <StockDirectory />
                </RequireAuth>
              } />
              
              {/* Redirects for backward compatibility */}
              <Route path="/dashboard" element={
                <Navigate replace to="/stocks" />
              } />
              
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/stock/:stockKey" element={<StockDetail />} />
              <Route
                path="/notifications"
                element={
                  <RequireAuth>
                    <Notifications />
                  </RequireAuth>
                }
              />
            </Routes>
          </div>
          
          <ConditionalRender shouldRender={shouldShowFooter}>
            <Footer />
          </ConditionalRender>
        </div>
      </RouteLogger>
    </AuthProvider>
  );
};

export default App; 