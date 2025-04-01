import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import './SignUp.css';
import { useForm } from 'react-hook-form';
import { authApi } from '../../lib/api';

const SignUpPage = () => {
    console.log('SignUp component rendered');

    // Form state for birthday and gender selectors
    const [birthMonth, setBirthMonth] = useState('');
    const [birthDay, setBirthDay] = useState('');
    const [birthYear, setBirthYear] = useState('');
    const [gender, setGender] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [daysInMonth, setDaysInMonth] = useState([]);
    const [error, setError] = useState(null);

    // React Hook Form setup
    const { 
        register, 
        handleSubmit, 
        watch,
        formState: { errors },
        reset
    } = useForm({
        defaultValues: {
            username: '',
            firstName: '',
            lastName: '',
            email: '',
            mobilePhone: '',
            password: '',
            confirmPassword: ''
        }
    });

    // Watch the password fields for validation.
    const watchedPassword = watch("password");
    const watchedConfirmPassword = watch("confirmPassword");
    console.log('Watched password:', watchedPassword);
    console.log('Watched confirm password:', watchedConfirmPassword);

    // Months for the birthday dropdown.
    const months = [
        { value: '', label: 'Month', number: 0 },
        { value: 'Jan', label: 'Jan', number: 1 },
        { value: 'Feb', label: 'Feb', number: 2 },
        { value: 'Mar', label: 'Mar', number: 3 },
        { value: 'Apr', label: 'Apr', number: 4 },
        { value: 'May', label: 'May', number: 5 },
        { value: 'Jun', label: 'Jun', number: 6 },
        { value: 'Jul', label: 'Jul', number: 7 },
        { value: 'Aug', label: 'Aug', number: 8 },
        { value: 'Sep', label: 'Sep', number: 9 },
        { value: 'Oct', label: 'Oct', number: 10 },
        { value: 'Nov', label: 'Nov', number: 11 },
        { value: 'Dec', label: 'Dec', number: 12 }
    ];

    // Years for the birthday dropdown, goes back a hundred years.
    const currentYear = new Date().getFullYear();
    const years = [
        { value: '', label: 'Year' },
        ...Array.from({ length: 100 }, (_, i) => {
            const year = currentYear - i;
            return { value: year.toString(), label: year.toString() };
        })
    ];

    // Calculates days in month based on selected month and year.
    const getDaysInMonth = (month, year) => {
        console.log('getDaysInMonth called with:', { month, year });
        if (!month || !year) {
            return [{ value: '', label: 'Day' }];
        }
        
        const monthNumber = months.find(m => m.value === month)?.number || 0;
        if (monthNumber === 0) {
            return [{ value: '', label: 'Day' }];
        }
        
        const daysCount = new Date(parseInt(year), monthNumber, 0).getDate();
        
        return [
            { value: '', label: 'Day' },
            ...Array.from({ length: daysCount }, (_, i) => {
                const day = (i + 1).toString();
                return { value: day, label: day };
            })
        ];
    };

    // Update days when the month or year changes.
    useEffect(() => {
        setDaysInMonth(getDaysInMonth(birthMonth, birthYear));
    }, [birthMonth, birthYear]);

    // Handles birthday and gender select changes.
    const handleSelectChange = (e) => {
        console.log('Select changed:', e.target.name, e.target.value);
        const { name, value } = e.target;
        if (name === 'birthMonth') {
            setBirthMonth(value);
            console.log('Updated birthMonth to:', value);
        }
        else if (name === 'birthDay') {
            setBirthDay(value);
            console.log('Updated birthDay to:', value);
        }
        else if (name === 'birthYear') {
            setBirthYear(value);
            console.log('Updated birthYear to:', value);
        }
        else if (name === 'gender') {
            setGender(value);
            console.log('Updated gender to:', value);
        }
    };

    const togglePasswordVisibility = () => {
        console.log('Toggle password visibility from:', passwordVisible, 'to:', !passwordVisible);
        setPasswordVisible(!passwordVisible);
    };

    // Form submission handlers.
    const onSubmit = async (data) => {
        console.log('Form submitted with data:', data);
        console.log('Form errors:', errors);
        
        // Validate if a birthday is selected.
        if (!birthMonth || !birthDay || !birthYear) {
            console.log('Birthday validation failed - missing fields');
            setError('birthDate', { 
                type: 'manual', 
                message: 'Please select a complete birth date' 
            });
            return;
        }
        
        // Validate if a gender is selected.
        if (!gender) {
            console.log('Gender validation failed - not selected');
            setError('gender', { 
                type: 'manual', 
                message: 'Please select a gender' 
            });
            return;
        }
        
        // Formats the birth date as YYYY-MM-DD for the backend.
        const monthNumber = months.find(m => m.value === birthMonth)?.number || 1;
        const formattedMonth = monthNumber.toString().padStart(2, '0');
        const formattedDay = birthDay.padStart(2, '0');
        const birthDate = `${birthYear}-${formattedMonth}-${formattedDay}`;
        console.log('Formatted birth date:', birthDate);
        
        // Prepares the data for the backend in the same order as the backend model.
        const userData = {
            username: data.username,
            first_name: data.firstName,
            last_name: data.lastName,
            gender: gender.toUpperCase(),
            birth_date: birthDate,
            mobile_phone: data.mobilePhone || null,
            email: data.email,
            password: data.password
        };
        
        console.log('Final userData prepared for submission:', userData);
        console.log('userData as JSON string:', JSON.stringify(userData, null, 2));
        
        try {
            // Calls the signup API.
            const response = await authApi.signup(userData);
            console.log('Signup successful:', response);
            
            // Navigates to login page with success message.
            navigate('/login', { 
                state: { 
                    message: 'Account created successfully! Please log in.' 
                } 
            });
        } catch (error) {
            console.error('Signup error:', error);
            
            // Handles validation errors from the server.
            if (error.errors) {
                Object.keys(error.errors).forEach(key => {
                    // Map the backend field names to frontend field names if needed
                    const fieldMap = {
                        'first_name': 'firstName',
                        'last_name': 'lastName',
                        'birth_date': 'birthDate'
                    };
                    
                    const fieldName = fieldMap[key] || key;
                    
                    setError(fieldName, {
                        type: 'server',
                        message: error.errors[key]
                    });
                });
            } else {
                // Sets a general error message.
                alert(error.message || 'An error occurred during signup');
            }
        }
    };

    const navigate = useNavigate();

    return (
        <div className="signup-page">
            <div className="signup-logo">
                <h1 className="app-logo" style={{ fontSize: '3.5rem' }}>Investat<span style={{ color: 'var(--pet-sounds-beige)' }}>ion</span></h1>
            </div>
            <div className="signup-form-container">
                <div className="signup-header">
                    <h2>Create a new account</h2>
                    <p>It's quick and easy.</p>
                </div>
                
                <hr />
                
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="name-inputs">
                        <input
                            type="text"
                            placeholder="First name"
                            {...register("firstName", {
                                required: "First name is required"
                            })}
                        />
                        <input
                            type="text"
                            placeholder="Last name"
                            {...register("lastName", {
                                required: "Last name is required"
                            })}
                        />
                    </div>
                    {errors.firstName && <p className="error-message">{errors.firstName.message}</p>}
                    {errors.lastName && <p className="error-message">{errors.lastName.message}</p>}
                    
                    <div className="username-container">
                        <span className="username-prefix">@</span>
                        <input
                            type="text"
                            placeholder="Username"
                            {...register("username", {
                                required: "Username is required",
                                minLength: {
                                    value: 3,
                                    message: "Username must be at least 3 characters"
                                },
                                pattern: {
                                    value: /^[a-zA-Z0-9_]+$/,
                                    message: "Username can only contain letters, numbers and underscores"
                                }
                            })}
                            className="username-input"
                        />
                    </div>
                    {errors.username && <p className="error-message">{errors.username.message}</p>}
                    
                    <div className="birthday-section">
                        <label>Birthday <span className="info-icon">?</span></label>
                        <div className="birthday-selects">
                            <select 
                                name="birthMonth" 
                                value={birthMonth} 
                                onChange={handleSelectChange}
                                required
                            >
                                {months.map(month => (
                                    <option key={month.value || 'month-placeholder'} value={month.value}>
                                        {month.label}
                                    </option>
                                ))}
                            </select>
                            
                            <select 
                                name="birthDay" 
                                value={birthDay} 
                                onChange={handleSelectChange}
                                required
                                disabled={!birthMonth || !birthYear}
                            >
                                {daysInMonth.map(day => (
                                    <option key={day.value || 'day-placeholder'} value={day.value}>
                                        {day.label}
                                    </option>
                                ))}
                            </select>
                            
                            <select 
                                name="birthYear" 
                                value={birthYear} 
                                onChange={handleSelectChange}
                                required
                            >
                                {years.map(year => (
                                    <option key={year.value || 'year-placeholder'} value={year.value}>
                                        {year.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div className="gender-section">
                        <label>Gender <span className="info-icon">?</span></label>
                        <div className="gender-options">
                            <select 
                                name="gender" 
                                value={gender} 
                                onChange={handleSelectChange}
                                required
                            >
                                <option value="" disabled>Select gender</option>
                                <option value="female">Female</option>
                                <option value="male">Male</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    <input
                        type="email"
                        placeholder="Email"
                        {...register("email", {
                            required: "Email is required",
                            pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: "Invalid email address"
                            }
                        })}
                    />
                    {errors.email && <p className="error-message">{errors.email.message}</p>}
                    
                    <input
                        type="tel"
                        placeholder="Mobile phone (optional)"
                        {...register("mobilePhone", {
                            pattern: {
                                value: /^[+]?[0-9]{10,15}$/,
                                message: "Invalid phone number format"
                            }
                        })}
                    />
                    {errors.mobilePhone && <p className="error-message">{errors.mobilePhone.message}</p>}
                    
                    <div className="password-container">
                        <input
                            type={passwordVisible ? "text" : "password"}
                            placeholder="New password"
                            {...register("password", {
                                required: "Password is required",
                                minLength: {
                                    value: 8,
                                    message: "Password must be at least 8 characters"
                                },
                                pattern: {
                                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])[A-Za-z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{8,}$/,
                                    message: "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"
                                }
                            })}
                        />
                    </div>
                    {errors.password && <p className="error-message">{errors.password.message}</p>}
                    
                    <div className="password-container">
                        <input
                            type={passwordVisible ? "text" : "password"}
                            placeholder="Confirm password"
                            {...register("confirmPassword", {
                                required: "Please confirm your password",
                                validate: value => value === watchedPassword || "Passwords do not match"
                            })}
                        />
                    </div>
                    {errors.confirmPassword && <p className="error-message">{errors.confirmPassword.message}</p>}
                    
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
                    
                    <p className="terms-text">
                        People who use our service may have uploaded your contact information to Investation. <a href="/learn-more">Learn more</a>.
                    </p>
                    
                    <p className="terms-text">
                        By clicking Sign Up, you agree to our <a href="/terms">Terms</a>, <a href="/privacy-policy">Privacy Policy</a> and <a href="/cookies-policy">Cookies Policy</a>. You may receive SMS Notifications from us and can opt out any time.
                    </p>
                    
                    <Button 
                        type="submit" 
                        variant="primary"
                        className="w-100 mt-3 mb-3"
                        style={{ 
                            backgroundColor: 'var(--pet-sounds-green)', 
                            borderColor: 'var(--pet-sounds-green)',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: 'var(--pet-sounds-beige)'
                        }}
                    >
                        Sign Up
                    </Button>
                    
                    <div className="login-link">
                        <Link to="/login">Already have an account?</Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SignUpPage;