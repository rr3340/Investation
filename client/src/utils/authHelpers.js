// Auth helper functions for token management and user authentication

// Decode the JWT token to get user information
export const decodeToken = (token) => {
    if (!token) {
        console.error('No token provided to decode');
        return null;
    }

    try {
        // JWT tokens are divided into 3 parts: header, payload, signature. 
        //Split the token by dots and get the payload.
        const base64Url = token.split('.')[1];
        
        if (!base64Url) {
            console.error('Invalid token format - missing payload');
            return null;
        }
        
        //Transform into base64
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        
        // Decode the base64 payload to get the JSON strings.
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        
        // Parses the JSON string to get the payload object.
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};

// Check if the user's token is valid and not expired.

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

// Get the current user ID from the token

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