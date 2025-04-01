import React, { createContext, useState, useEffect } from 'react';
import { authApi } from '../api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [tokens, setTokens] = useState({
    accessToken: localStorage.getItem('accessToken') || null,
    refreshToken: localStorage.getItem('refreshToken') || null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Checks if the user is logged on a mount, parsing the stored user and ID.
  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem('user');
      const accessToken = localStorage.getItem('accessToken');
      
      if (storedUser && accessToken) {
        try {
          const parsedUser = JSON.parse(storedUser);
          const user = {
            ...parsedUser,
            id: parseInt(parsedUser.id, 10)
          };
          
          console.log('Initializing auth with user:', user);
          console.log('User ID type:', typeof user.id);
          
          // Updates the localStorage with the corrected user object.
          localStorage.setItem('user', JSON.stringify(user));
          
          setCurrentUser(user);
        } catch (error) {
          console.error('Error parsing stored user:', error);
          localStorage.removeItem('user');
        }
      }
      
      setLoading(false);
    };
    
    initAuth();
  }, []);

  useEffect(() => {
    if (tokens.accessToken) {
      localStorage.setItem('accessToken', tokens.accessToken);
    } else {
      localStorage.removeItem('accessToken');
    }
    
    if (tokens.refreshToken) {
      localStorage.setItem('refreshToken', tokens.refreshToken);
    } else {
      localStorage.removeItem('refreshToken');
    }
  }, [tokens]);

  // Registers a new user.
  const signup = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authApi.signup(userData);
      return response;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Authenticates a new user.
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authApi.login(credentials);
      
      const user = {
        ...response.user,
        id: parseInt(response.user.id, 10)
      };
      
      console.log('Login successful, user data:', user);
      console.log('User ID type:', typeof user.id);
      
      setCurrentUser(user);
      setTokens({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
      });
      
      localStorage.setItem('user', JSON.stringify(user));
      
      return response;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Refreshes the access token.
  const refreshAccessToken = async () => {
    if (!tokens.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      const response = await authApi.refreshToken(tokens.refreshToken);
      
      setTokens({
        ...tokens,
        accessToken: response.access_token,
      });
      
      return response;
    } catch (error) {
      logout();
      throw error;
    }
  };

  // Logs out of the current user.
  const logout = () => {
    setCurrentUser(null);
    setTokens({ accessToken: null, refreshToken: null });
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  // Updates the current user.
  const updateCurrentUser = (userData) => {
    if (!currentUser) {
      console.error('Cannot update user: No user is currently logged in');
      return;
    }
    
    // Merges the current user with the updated data.
    const updatedUser = {
      ...currentUser,
      ...userData
    };
    
    console.log('Updating current user in AuthContext:', updatedUser);
    
    setCurrentUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    currentUser,
    tokens,
    loading,
    error,
    signup,
    login,
    logout,
    refreshAccessToken,
    updateCurrentUser,
    isAuthenticated: !!tokens.accessToken && !!currentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider; 