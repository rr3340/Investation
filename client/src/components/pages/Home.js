import React, { useEffect, useState } from 'react';
import { Button, Container, Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/hooks/useAuth';

const HomePage = () => {
    const { isAuthenticated, currentUser, logout } = useAuth();
    const navigate = useNavigate();
    
    //Redirects to dashboard if authenticated
    useEffect(() => {
        if (isAuthenticated && currentUser) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, currentUser, navigate]);
    
    const handleLogout = () => {
        logout();
        navigate('/');
    };
    
    const handleManualLogout = () => {
        //Clears localStorage directly for tokens when logging out.
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        //Reloads the page to reset app state.
        window.location.reload();
    };
    
    return (
        <Container className="home py-5" style={{ marginTop: '4rem' }}>
            <Row className="mb-5">
                <Col>
                    <div className="text-center mb-4">
                        <h1 className="display-4 mb-3">Welcome to Investation</h1>
                        <p className="lead">Your personal investment management platform</p>
                    </div>
                    
                    {isAuthenticated ? (
                        <Card className="text-center p-4 mb-5">
                            <Card.Body>
                                <p className="mb-3">You are currently logged in as {currentUser.email}</p>
                                <div className="d-flex gap-3 justify-content-center">
                                    <Button 
                                        variant="primary" 
                                        onClick={() => navigate(`/profile/${currentUser.id}`)}
                                        style={{ 
                                            backgroundColor: 'var(--pet-sounds-green)', 
                                            borderColor: 'var(--pet-sounds-green)' 
                                        }}
                                    >
                                        Go to Profile
                                    </Button>
                                    <Button 
                                        variant="primary" 
                                        onClick={handleLogout}
                                        style={{ 
                                            backgroundColor: 'var(--pet-sounds-green)', 
                                            borderColor: 'var(--pet-sounds-green)' 
                                        }}
                                    >
                                        Logout
                                    </Button>
                                    <Button 
                                        variant="secondary" 
                                        onClick={handleManualLogout}
                                        style={{ 
                                            backgroundColor: 'var(--pet-sounds-brown)', 
                                            borderColor: 'var(--pet-sounds-brown)' 
                                        }}
                                    >
                                        Force Logout
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    ) : (
                        <Card className="text-center p-4 mb-5">
                            <Card.Body>
                                <p className="mb-3">Get started by logging in or creating an account</p>
                                <div className="d-flex gap-3 justify-content-center">
                                    <Button 
                                        variant="primary" 
                                        onClick={() => navigate('/login')}
                                        style={{ 
                                            backgroundColor: 'var(--pet-sounds-green)', 
                                            borderColor: 'var(--pet-sounds-green)' 
                                        }}
                                    >
                                        Login
                                    </Button>
                                    <Button 
                                        variant="outline-primary" 
                                        onClick={() => navigate('/signup')}
                                        style={{ 
                                            borderColor: 'var(--pet-sounds-green)',
                                            color: 'var(--pet-sounds-green)'
                                        }}
                                    >
                                        Sign Up
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    )}
                </Col>
            </Row>
            
            <Row className="mb-5">
                <Col md={4} className="mb-4 mb-md-0">
                    <Card className="h-100">
                        <Card.Body className="d-flex flex-column">
                            <Card.Title>Track Your Investments</Card.Title>
                            <Card.Text>
                                Monitor your portfolio performance and track your investment growth over time.
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4} className="mb-4 mb-md-0">
                    <Card className="h-100">
                        <Card.Body className="d-flex flex-column">
                            <Card.Title>Discover New Opportunities</Card.Title>
                            <Card.Text>
                                Explore trending stocks and find new investment opportunities based on market data.
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="h-100">
                        <Card.Body className="d-flex flex-column">
                            <Card.Title>Get Personalized Insights</Card.Title>
                            <Card.Text>
                                Receive tailored investment recommendations based on your risk profile and goals.
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default HomePage;