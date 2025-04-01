// Validating the email format.
export const isValidEmail = (email) => {
  return /\S+@\S+\.\S+/.test(email);
};

// Validating the username format.
export const isValidUsername = (username) => {
  return /^[a-zA-Z0-9_]{3,15}$/.test(username);
};

// Password strength.
//Criteria is at least 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special char.
export const isStrongPassword = (password) => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(password);
};

// Validation erors for the signup form.
export const validateSignupForm = (data) => {
  const errors = {};
  
  if (!data.username) {
    errors.username = 'Username is required';
  } else if (!isValidUsername(data.username)) {
    errors.username = 'Username must be 3-15 characters and can only contain letters, numbers, and underscores';
  }
  
  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Invalid email format';
  }
  
  if (!data.password) {
    errors.password = 'Password is required';
  } else if (!isStrongPassword(data.password)) {
    errors.password = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character';
  }
  
  return errors;
}; 