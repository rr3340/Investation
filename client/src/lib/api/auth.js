import { API_BASE_URL } from '../utils/constants';

//Authentication API 

export const authApi = {
  //Register a new users
  signup: async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw { 
          status: response.status,
          errors: data.errors || {},
          message: data.message || 'Signup failed'
        };
      }
      
      return data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  },
  
  //Authenticates a user.
  login: async (credentials) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw { 
          status: response.status,
          errors: data.errors || {},
          message: data.message || 'Login failed'
        };
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  refreshToken: async (refreshToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw { 
          status: response.status,
          message: data.message || 'Token refresh failed'
        };
      }
      
      return data;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  },
  
  forgotPassword: async (email) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw { 
          status: response.status,
          errors: data.errors || {},
          message: data.message || 'Password reset request failed'
        };
      }
      
      return data;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  },

  resetPassword: async (resetData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resetData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw { 
          status: response.status,
          errors: data.errors || {},
          message: data.message || 'Password reset failed'
        };
      }
      
      return data;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }
};

export default authApi; 