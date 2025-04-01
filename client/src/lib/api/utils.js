//Handles API error responses

export const handleApiError = async (response) => {
  try {
    const data = await response.json();
    
    if (data && data.message) {
      return new Error(data.message);
    }
    
    if (data && data.detail) {
      return new Error(data.detail);
    }
    
    switch (response.status) {
      case 400:
        return new Error('Bad request. Please check your input.');
      case 401:
        return new Error('Unauthorized. Please log in again.');
      case 403:
        return new Error('Forbidden. You do not have permission to access this resource.');
      case 404:
        return new Error('Resource not found.');
      case 500:
        return new Error('Server error. Please try again later.');
      default:
        return new Error(`Request failed with status: ${response.status}`);
    }
  } catch (error) {
    return new Error(`Request failed with status: ${response.status}`);
  }
}; 