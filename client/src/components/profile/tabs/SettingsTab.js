import React, { useState, useContext, useEffect } from 'react';
import { Form, Button, Row, Col, Card, Alert, Spinner } from 'react-bootstrap';
import { 
    FaUser, 
    FaLock, 
    FaBell, 
    FaShieldAlt, 
    FaChartLine, 
    FaPalette 
} from 'react-icons/fa';
import { AuthContext } from '../../../lib/context/AuthContext';
import { userApi } from '../../../lib/api';
import './TabStyles.css';

const SettingsTab = ({ userId, user = {}, onProfileUpdate }) => {
    const { currentUser, updateCurrentUser } = useContext(AuthContext);
    const [activeSection, setActiveSection] = useState('profile');
    const [formData, setFormData] = useState({
        username: user.username || '',
        email: user.email || '',
        mobile_phone: user.mobile_phone || '',
        current_password: '',
        new_password: '',
        confirm_password: '',
        notification_email: true,
        notification_push: true,
        notification_sms: false,
        risk_tolerance: user.risk_tolerance || 'medium',
        theme: 'light',
        currency: 'USD'
    });
    
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    //Updates form data when user prop changes
    useEffect(() => {
        if (user) {
            setFormData(prevData => ({
                ...prevData,
                username: user.username || '',
                email: user.email || '',
                mobile_phone: user.mobile_phone || ''
            }));
        }
    }, [user]);
    
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };
    
    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setSuccessMessage('');
        setErrorMessage('');
        
        try {
            //Prepares for sensitive data update.
            const sensitiveData = {
                username: formData.username,
                email: formData.email,
                mobile_phone: formData.mobile_phone
            };
            
            console.log('Updating sensitive info with data:', sensitiveData);
            
            //Calls api.
            const response = await userApi.updateSensitiveInfo(userId, sensitiveData);
            
            console.log('Sensitive info update response:', response);
            
            //Updates current user in the AuthContext.
            if (currentUser && currentUser.id === parseInt(userId)) {
                updateCurrentUser({
                    ...sensitiveData,
                    ...response.user
                });
                
                //Calls the onProfileUpdate prop if provided.
                if (onProfileUpdate) {
                    onProfileUpdate({
                        ...sensitiveData,
                        ...response.user
                    });
                }
            }
            
            setSuccessMessage('Account information updated successfully!');
        } catch (error) {
            console.error('Error updating account information:', error);
            
            //Providde more detailed error message.
            if (error.status === 403) {
                setErrorMessage('Permission denied: You can only update your own information');
            } else if (error.errors && Object.keys(error.errors).length > 0) {
                const errorMessages = Object.entries(error.errors)
                    .map(([field, message]) => `${field}: ${message}`)
                    .join(', ');
                setErrorMessage(`Failed to update account information: ${errorMessages}`);
            } else {
                setErrorMessage(error.message || 'Failed to update account information');
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setSuccessMessage('');
        setErrorMessage('');
        
        //Validates password fields
        if (formData.new_password !== formData.confirm_password) {
            setErrorMessage('New password and confirmation do not match');
            setIsLoading(false);
            return;
        }
        
        if (!formData.current_password) {
            setErrorMessage('Current password is required');
            setIsLoading(false);
            return;
        }
        
        if (formData.new_password.length < 8) {
            setErrorMessage('New password must be at least 8 characters long');
            setIsLoading(false);
            return;
        }
        
        try {
            console.log('Changing password for user ID:', userId);
            
            //Updates password via api
            const response = await userApi.changePassword(
                userId, 
                formData.current_password, 
                formData.new_password
            );
            
            console.log('Password change response:', response);
            
            //Clears password fields.
            setFormData({
                ...formData,
                current_password: '',
                new_password: '',
                confirm_password: ''
            });
            
            setSuccessMessage('Password updated successfully!');
        } catch (error) {
            console.error('Error updating password:', error);
            
            if (error.status === 401) {
                if (error.errors && error.errors.current_password) {
                    setErrorMessage('Current password is incorrect');
                } else {
                    setErrorMessage('Authentication failed: ' + (error.message || 'Please try logging in again'));
                }
            } else if (error.errors && Object.keys(error.errors).length > 0) {
                const errorMessages = Object.entries(error.errors)
                    .map(([field, message]) => `${field}: ${message}`)
                    .join(', ');
                setErrorMessage(`Failed to update password: ${errorMessages}`);
            } else {
                setErrorMessage(error.message || 'Failed to update password');
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    //Mock notification and preference submissions. Not incorporated however.
    const handleNotificationSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setSuccessMessage('');
        setErrorMessage('');
        
        try {
            setTimeout(() => {
                setSuccessMessage('Notification settings updated successfully!');
                setIsLoading(false);
            }, 1000);
        } catch (error) {
            setErrorMessage('Failed to update notification settings');
            setIsLoading(false);
        }
    };
    
    const handlePreferenceSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setSuccessMessage('');
        setErrorMessage('');
        
        try {
            setTimeout(() => {
                setSuccessMessage('Preferences updated successfully!');
                setIsLoading(false);
            }, 1000);
        } catch (error) {
            setErrorMessage('Failed to update preferences');
            setIsLoading(false);
        }
    };
    
    const renderProfileSettings = () => (
        <Form onSubmit={handleProfileSubmit}>
            <Form.Group className="mb-3">
                <Form.Label>Username</Form.Label>
                <Form.Control
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter your username"
                    disabled={isLoading}
                />
                <Form.Text className="text-muted">
                    Your unique username for logging in
                </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    disabled={isLoading}
                />
                <Form.Text className="text-muted">
                    Your email address for account notifications
                </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
                <Form.Label>Phone Number</Form.Label>
                <Form.Control
                    type="tel"
                    name="mobile_phone"
                    value={formData.mobile_phone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                    disabled={isLoading}
                />
                <Form.Text className="text-muted">
                    Your phone number for account security
                </Form.Text>
            </Form.Group>
            
            <Button variant="primary" type="submit" disabled={isLoading}>
                {isLoading ? (
                    <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Saving...
                    </>
                ) : 'Save Account Info'}
            </Button>
        </Form>
    );
    
    const renderSecuritySettings = () => (
        <Form onSubmit={handlePasswordSubmit}>
            <Form.Group className="mb-3">
                <Form.Label>Current Password</Form.Label>
                <Form.Control
                    type="password"
                    name="current_password"
                    value={formData.current_password}
                    onChange={handleInputChange}
                    placeholder="Enter your current password"
                    disabled={isLoading}
                    required
                />
                <Form.Text className="text-muted">
                    Your current password is required to make changes
                </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
                <Form.Label>New Password</Form.Label>
                <Form.Control
                    type="password"
                    name="new_password"
                    value={formData.new_password}
                    onChange={handleInputChange}
                    placeholder="Enter your new password"
                    disabled={isLoading}
                    required
                />
                <Form.Text className="text-muted">
                    Password must be at least 8 characters long
                </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
                <Form.Label>Confirm New Password</Form.Label>
                <Form.Control
                    type="password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleInputChange}
                    placeholder="Confirm your new password"
                    disabled={isLoading}
                    required
                />
            </Form.Group>
            
            <Button variant="primary" type="submit" disabled={isLoading}>
                {isLoading ? (
                    <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Updating...
                    </>
                ) : 'Update Password'}
            </Button>
        </Form>
    );
    
    const renderNotificationSettings = () => (
        <Form onSubmit={handleNotificationSubmit}>
            <Form.Group className="mb-3">
                <Form.Check
                    type="checkbox"
                    label="Email Notifications"
                    name="notification_email"
                    checked={formData.notification_email}
                    onChange={handleInputChange}
                    disabled={isLoading}
                />
                <Form.Text className="text-muted">
                    Receive important updates and alerts via email
                </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
                <Form.Check
                    type="checkbox"
                    label="Push Notifications"
                    name="notification_push"
                    checked={formData.notification_push}
                    onChange={handleInputChange}
                    disabled={isLoading}
                />
                <Form.Text className="text-muted">
                    Receive notifications on your device
                </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
                <Form.Check
                    type="checkbox"
                    label="SMS Notifications"
                    name="notification_sms"
                    checked={formData.notification_sms}
                    onChange={handleInputChange}
                    disabled={isLoading}
                />
                <Form.Text className="text-muted">
                    Receive important alerts via SMS
                </Form.Text>
            </Form.Group>
            
            <Button variant="primary" type="submit" disabled={isLoading}>
                {isLoading ? (
                    <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Saving...
                    </>
                ) : 'Save Notification Settings'}
            </Button>
        </Form>
    );
    
    const renderPreferenceSettings = () => (
        <Form onSubmit={handlePreferenceSubmit}>
            <Form.Group className="mb-3">
                <Form.Label>Risk Tolerance</Form.Label>
                <Form.Select
                    name="risk_tolerance"
                    value={formData.risk_tolerance}
                    onChange={handleInputChange}
                    disabled={isLoading}
                >
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                </Form.Select>
                <Form.Text className="text-muted">
                    This helps us tailor investment recommendations to your comfort level
                </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
                <Form.Label>Theme</Form.Label>
                <Form.Select
                    name="theme"
                    value={formData.theme}
                    onChange={handleInputChange}
                    disabled={isLoading}
                >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System Default</option>
                </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
                <Form.Label>Currency</Form.Label>
                <Form.Select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    disabled={isLoading}
                >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                </Form.Select>
            </Form.Group>
            
            <Button variant="primary" type="submit" disabled={isLoading}>
                {isLoading ? (
                    <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Saving...
                    </>
                ) : 'Save Preferences'}
            </Button>
        </Form>
    );
    
    const renderContent = () => {
        switch (activeSection) {
            case 'profile':
                return renderProfileSettings();
            case 'security':
                return renderSecuritySettings();
            case 'notifications':
                return renderNotificationSettings();
            case 'preferences':
                return renderPreferenceSettings();
            default:
                return renderProfileSettings();
        }
    };
    
    return (
        <div className="settings-tab">
            <h2 className="tab-title">Account Settings</h2>
            
            {successMessage && (
                <Alert variant="success" className="mb-4" dismissible onClose={() => setSuccessMessage('')}>
                    {successMessage}
                </Alert>
            )}
            
            {errorMessage && (
                <Alert variant="danger" className="mb-4" dismissible onClose={() => setErrorMessage('')}>
                    {errorMessage}
                </Alert>
            )}
            
            <Row>
                <Col md={3} className="mb-4">
                    <div className="settings-sidebar">
                        <div 
                            className={`settings-nav-item ${activeSection === 'profile' ? 'active' : ''}`}
                            onClick={() => setActiveSection('profile')}
                        >
                            <FaUser className="settings-nav-icon" />
                            <span>Account Info</span>
                        </div>
                        
                        <div 
                            className={`settings-nav-item ${activeSection === 'security' ? 'active' : ''}`}
                            onClick={() => setActiveSection('security')}
                        >
                            <FaLock className="settings-nav-icon" />
                            <span>Security</span>
                        </div>
                        
                        <div 
                            className={`settings-nav-item ${activeSection === 'notifications' ? 'active' : ''}`}
                            onClick={() => setActiveSection('notifications')}
                        >
                            <FaBell className="settings-nav-icon" />
                            <span>Notifications</span>
                        </div>
                        
                        <div 
                            className={`settings-nav-item ${activeSection === 'preferences' ? 'active' : ''}`}
                            onClick={() => setActiveSection('preferences')}
                        >
                            <FaPalette className="settings-nav-icon" />
                            <span>Preferences</span>
                        </div>
                    </div>
                </Col>
                
                <Col md={9}>
                    <Card className="settings-content">
                        <Card.Body>
                            {renderContent()}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default SettingsTab; 