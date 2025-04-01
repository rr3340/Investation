import { API_BASE_URL } from '../utils/constants';
import { handleApiError } from './utils';

// User API service.

export const userApi = {

  getUserProfile: async (userId) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No access token found');
      }
      
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw { 
          status: response.status,
          message: data.message || 'Failed to fetch user profile'
        };
      }
      
      return data;
    } catch (error) {
      console.error('Get user profile error:', error);
      throw error;
    }
  },
  
  //Update user profile.

  updateUserProfile: async (userId, userData) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No access token found');
      }
      
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw { 
          status: response.status,
          errors: data.errors || {},
          message: data.message || 'Failed to update user profile'
        };
      }
      
      return data;
    } catch (error) {
      console.error('Update user profile error:', error);
      throw error;
    }
  },
  
  // Update user profile display information.

  updateProfileDisplay: async (userId, profileData) => {
    try {
      // Ensures the userId is a number.
      const numericUserId = parseInt(userId, 10);
      
      console.log(`Updating profile display for user ${numericUserId}:`, profileData);
      
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No access token found');
      }
      
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      console.log('Current user from localStorage:', currentUser);
      
      if (currentUser.id !== numericUserId) {
        console.warn(`Warning: Attempting to update profile for user ${numericUserId} but current user is ${currentUser.id}`);
      }
      
      console.log(`Making PUT request to ${API_BASE_URL}/users/${numericUserId}/profile-display`);
      console.log('Request headers:', {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      });
      console.log('Request body:', JSON.stringify(profileData));
      
      const response = await fetch(`${API_BASE_URL}/users/${numericUserId}/profile-display`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (!response.ok) {
        throw { 
          status: response.status,
          errors: data.errors || {},
          message: data.message || 'Failed to update profile display'
        };
      }
      
      // Stores the updated user data in localStorage.
      if (currentUser.id === numericUserId) {
        const updatedStoredUser = {
          ...currentUser,
          display_name: data.display_name || currentUser.display_name,
          about: data.about || currentUser.about,
          profile_img: data.profile_img || currentUser.profile_img,
          profile_banner: data.profile_banner || currentUser.profile_banner,
          nationality: data.nationality || currentUser.nationality
        };
        console.log('Updating localStorage user data in API:', updatedStoredUser);
        localStorage.setItem('user', JSON.stringify(updatedStoredUser));
      }
      
      return data;
    } catch (error) {
      console.error('Update profile display error:', error);
      throw error;
    }
  },
  
  // Updates the user sensitive information.
  
  updateSensitiveInfo: async (userId, sensitiveData) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No access token found');
      }
      
      // Ensures the userId is a number.
      const numericUserId = parseInt(userId, 10);
      
      const storedUser = localStorage.getItem('user');
      let currentUser = null;
      
      if (storedUser) {
        try {
          currentUser = JSON.parse(storedUser);
        } catch (error) {
          console.error('Error parsing stored user:', error);
        }
      }
      
      if (currentUser && currentUser.id !== numericUserId) {
        console.warn('User is attempting to update another user\'s sensitive information');
      }
      
      // Make the API request
      const response = await fetch(`${API_BASE_URL}/users/${numericUserId}/sensitive-info`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sensitiveData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw { 
          status: response.status,
          errors: data.errors || {},
          message: data.message || 'Failed to update sensitive information'
        };
      }
      
      if (currentUser && currentUser.id === numericUserId) {
        const updatedStoredUser = { ...currentUser };
        
        if (sensitiveData.username && data.username) {
          updatedStoredUser.username = data.username;
        }
        
        if (sensitiveData.email && data.email) {
          updatedStoredUser.email = data.email;
        }
        
        if (sensitiveData.mobile_phone && data.mobile_phone) {
          updatedStoredUser.mobile_phone = data.mobile_phone;
        }
        
        console.log('Updating localStorage user data with sensitive info:', updatedStoredUser);
        localStorage.setItem('user', JSON.stringify(updatedStoredUser));
      }
      
      return data;
    } catch (error) {
      console.error('Update sensitive info error:', error);
      throw error;
    }
  },
  
  // Change the user password.
  
  changePassword: async (userId, currentPassword, newPassword) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No access token found');
      }
      
      // Ensures the userId is a number.
      const numericUserId = parseInt(userId, 10);
      
      // Makes the API request to the auth endpoint for any password changes.
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw { 
          status: response.status,
          errors: data.errors || {},
          message: data.message || 'Failed to change password'
        };
      }
      
      return data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },
    
  uploadProfileImage: async (userId, formData) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No access token found');
      }
      
      const response = await fetch(`${API_BASE_URL}/users/${userId}/profile-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw { 
          status: response.status,
          message: data.message || 'Failed to upload profile image'
        };
      }
      
      return data;
    } catch (error) {
      console.error('Upload profile image error:', error);
      throw error;
    }
  },
    
  uploadProfileBanner: async (userId, formData) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No access token found');
      }
      
      const response = await fetch(`${API_BASE_URL}/users/${userId}/profile-banner`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw { 
          status: response.status,
          message: data.message || 'Failed to upload profile banner'
        };
      }
      
      return data;
    } catch (error) {
      console.error('Upload profile banner error:', error);
      throw error;
    }
  },
  
  // Get the user's trade history.
  getTradeHistory: async (userId) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No access token found');
      }
      
      const numericUserId = parseInt(userId, 10);
      
      console.log(`Getting trade history for user ${numericUserId}`);
      
      const response = await fetch(`${API_BASE_URL}/trade_history/user/${numericUserId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw await handleApiError(response);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get trade history error:', error);
      throw error;
    }
  },
  
  // Searching for users by username or display name.
  
  searchUsers: async (query) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No access token found');
      }
      
      // Ensure query is at least 2 characters
      if (!query || query.length < 2) {
        return [];
      }
      
      const response = await fetch(`${API_BASE_URL}/users/search?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw { 
          status: response.status,
          message: data.message || 'Failed to search users'
        };
      }
      
      return data;
    } catch (error) {
      console.error('Search users error:', error);
      return [];
    }
  },
  
  // Get user symbols for auto-suggestions with caching.
  getUsersForSuggestions: (() => {
    let cachedUsers = null;
    let lastFetchTime = 0;
    const CACHE_DURATION = 5 * 60 * 1000;
    
    return async (query) => {
      const currentTime = Date.now();
      
      try {
        // Always the fetching fresh results for user search.
        const users = await userApi.searchUsers(query);
        
        // Formatting users for suggestions display.
        return users.map(user => ({
          id: user.id,
          username: user.username,
          display_name: user.display_name || user.username,
          profile_img: user.profile_img,
          label: user.display_name ? `${user.display_name} (@${user.username})` : user.username,
          type: 'user'
        }));
        
      } catch (error) {
        console.error('Error fetching users for suggestions:', error);
        return [];
      }
    };
  })()
};