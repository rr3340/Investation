import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { authApi } from '../../lib/api';
import './ForgotPassword.css';

const ForgotPasswordPage = () => {
    console.log('ForgotPassword component rendered');
    
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
            email: ''
        },
        mode: 'onChange'
    });
    
    // State for server errors.
    const [serverError, setServerError] = useState(null);
    // State for success messages.
    const [successMessage, setSuccessMessage] = useState(null);
    
    // Watch for the form fields.
    const watchedEmail = watch("email");
    
    console.log('Watched email:', watchedEmail);
    console.log('Form errors:', errors);
    console.log('Form state:', { isSubmitting, isSubmitted, isValid });
    
    // Function to check if input is an email.
    const isEmail = (value) => {
        const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
        return emailRegex.test(value);
    };
    
    const onSubmit = async (data) => {
        console.log('Form submitted with data:', data);
        setServerError(null);
        setSuccessMessage(null);
        
        try {
            console.log('Sending password reset request for email:', data.email);
            
            // Calls the forgotPassword API.
            const response = await authApi.forgotPassword(data.email);
            
            console.log('Password reset email sent successfully:', response);
            setSuccessMessage('Password reset instructions have been sent to your email.');
            reset();
            
        } catch (error) {
            console.error('Password reset request failed:', error);
            
            // Handles server validation errors.
            if (error.errors) {
                Object.keys(error.errors).forEach(key => {
                    setError(key, {
                        type: 'server',
                        message: error.errors[key]
                    });
                });
            }
            
            // Sets general server error.
            setServerError(error.message || 'Failed to send password reset email. Please try again.');
        }
    };
    
    return (
        <div className="forgot-password-container">
            <div className="forgot-password-form-container">
                <h2>Forgot Password</h2>
                <p className="forgot-password-description">
                    Enter your email address and we'll send you instructions to reset your password.
                </p>
                
                {serverError && (
                    <div className="server-error">
                        {serverError}
                    </div>
                )}
                
                {successMessage && (
                    <div className="success-message">
                        {successMessage}
                    </div>
                )}
                
                <form onSubmit={handleSubmit(onSubmit)} className="forgot-password-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                            placeholder="Enter your email"
                            {...register("email", {
                                required: "Email is required",
                                validate: {
                                    validEmail: (value) => isEmail(value) || "Please enter a valid email address"
                                }
                            })}
                        />
                        {errors.email && (
                            <div className="error-message">{errors.email.message}</div>
                        )}
                    </div>
                    
                    <button 
                        type="submit" 
                        className="btn btn-primary forgot-password-btn"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Sending...' : 'Reset Password'}
                    </button>
                    
                    <div className="forgot-password-links">
                        <button 
                            type="button"
                            className="back-to-login-btn"
                            onClick={() => window.location.href = '/login'}
                        >
                            Take me back to login
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ForgotPasswordPage; 