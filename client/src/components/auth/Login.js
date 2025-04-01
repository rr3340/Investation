import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authApi } from '../../lib/api';
import { useAuth } from '../../lib/hooks/useAuth';
import './Login.css';

const Login = () => {
    // console.log('Login component rendered');
    
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const { 
        register, 
        handleSubmit, 
        watch,
        formState: { errors, isSubmitting, isSubmitted, isValid },
        reset,
        setError,
        clearErrors
    } = useForm({
        defaultValues: {
            usernameOrEmail: '',
            password: ''
        },
        mode: 'onChange'
    });
    
    // State for password visibility
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [serverError, setServerError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(
        location.state?.message || null
    );
    
    // Watch for the form fields
    const watchedUsernameOrEmail = watch("usernameOrEmail");
    const watchedPassword = watch("password");
    
    // console.log('Watched usernameOrEmail:', watchedUsernameOrEmail);
    // console.log('Watched password:', watchedPassword);
    // console.log('Form errors:', errors);
    // console.log('Form state:', { isSubmitting, isSubmitted, isValid });
    // console.log('Password visible:', passwordVisible);
    
    // Functions to check if input is an email.
    const isEmail = (value) => {
        const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
        return emailRegex.test(value);
    };
    
    // Toggles password visibility.
    const togglePasswordVisibility = () => {
        // console.log('Toggle password visibility from:', passwordVisible, 'to:', !passwordVisible);
        setPasswordVisible(!passwordVisible);
    };
    
    const onSubmit = async (data) => {
        // console.log('Login form submitted with data:', data);
        setServerError(null);
        
        // Determines if input is email or user.
        const isInputEmail = isEmail(data.usernameOrEmail);
        
        // Prepare data for submission, uses same order as backend model.
        const submissionData = {
            username: isInputEmail ? null : data.usernameOrEmail,
            email: isInputEmail ? data.usernameOrEmail : null,
            password: data.password
        };
        
        //Logs the submission data to console
        // console.log('Login submission data prepared:', submissionData);
        // console.log('Login data as JSON string:', JSON.stringify(submissionData, null, 2));
        // console.log('Input detected as:', isInputEmail ? 'email' : 'username');
        
        try {
            // Calls the login API through the authentication context.
            const response = await login(submissionData);
            // console.log('Login successful:', response);
            
            // Navigates to dashboard after successful login.
            // console.log('Navigating to dashboard...');
            navigate('/dashboard');
        } catch (error) {
            console.error('Login error:', error);
            
            //Handles validation errors from the server.
            if (error.errors) {
                Object.keys(error.errors).forEach(key => {
                    //Map backend field names to frontend field names if needed.
                    const fieldName = key === 'auth' ? 'usernameOrEmail' : key;
                    
                    setError(fieldName, {
                        type: 'server',
                        message: error.errors[key]
                    });
                });
            } else {
                // Sets a general error message.
                setServerError(error.message || 'An error occurred during login');
            }
        }
    };

    return (
        <div className="login-page">
            <div className="login-content">
                <div className="login-left">
                    <h2 className="tagline">Manage your investments with Investation.</h2>
                </div>
                
                <div className="login-form-container">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        {serverError && (
                            <p className="error-message server-error">{serverError}</p>
                        )}
                        
                        {successMessage && (
                            <p className="success-message">{successMessage}</p>
                        )}
                        
                        <div className="form-group">
                            <input
                                type="text"
                                placeholder="Email or Username"
                                {...register("usernameOrEmail", {
                                    required: "Email or username is required",
                                    minLength: {
                                        value: 3,
                                        message: "Must be at least 3 characters"
                                    }
                                })}
                            />
                            {errors.usernameOrEmail && <p className="error-message">{errors.usernameOrEmail.message}</p>}
                        </div>
                        
                        <div className="form-group">
                            <div className="password-container">
                                <input
                                    type={passwordVisible ? "text" : "password"}
                                    placeholder="Password"
                                    {...register("password", {
                                        required: "Password is required",
                                        minLength: {
                                            value: 8,
                                            message: "Password must be at least 8 characters"
                                        }
                                    })}
                                />
                            </div>
                            {errors.password && <p className="error-message">{errors.password.message}</p>}
                            
                            <div className="show-password-container">
                                <label className="show-password-label">
                                    <input
                                        type="checkbox"
                                        checked={passwordVisible}
                                        onChange={togglePasswordVisibility}
                                    />
                                    <span>Show password</span>
                                </label>
                            </div>
                        </div>
                        
                        <button 
                            type="submit" 
                            className="login-button"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Logging in...' : 'Log In'}
                        </button>
                        
                        <div className="forgot-password">
                            <Link to="/forgot-password">Forgot password?</Link>
                        </div>
                        
                        <hr />
                        
                        <div className="create-account">
                            <Link to="/signup" className="create-account-button">Create new account</Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;