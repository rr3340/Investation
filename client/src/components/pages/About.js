import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

const AboutPage = () => {
    return (
        <Container className="py-5">
            <Row className="mb-5">
                <Col>
                    <h1 className="mb-4" style={{ color: 'var(--pet-sounds-green)' }}>About Investation</h1>
                    <p className="lead">
                        Welcome to Investation - your premier stock market simulation platform that combines 
                        cutting-edge AI prediction technology with a risk-free investment environment.
                    </p>
                    <div className="bg-light p-3 mb-4" style={{ borderLeft: '4px solid var(--pet-sounds-green)' }}>
                        <strong>IMPORTANT DISCLAIMER:</strong> Investation uses entirely simulated money. 
                        This platform is designed for educational purposes only. No real money is involved, 
                        and all investments are purely fictional.
                    </div>
                </Col>
            </Row>
            
            <Row className="mb-5">
                <Col>
                    <h2 style={{ color: 'var(--pet-sounds-green)' }}>What We Offer</h2>
                    <p>
                        Investation provides a comprehensive simulation of stock market trading with advanced 
                        features that help you learn and practice investment strategies without any financial risk.
                    </p>
                </Col>
            </Row>
            
            <Row className="mb-5">
                <Col md={4} className="mb-4">
                    <Card className="h-100" style={{ borderColor: 'var(--pet-sounds-tan)' }}>
                        <Card.Header style={{ backgroundColor: 'var(--pet-sounds-green)', color: 'white' }}>
                            <h3 className="h5 mb-0">Live Stock Predictions</h3>
                        </Card.Header>
                        <Card.Body>
                            <p>
                                Our advanced AI algorithms analyze market trends, historical data, and current events 
                                to predict future stock prices in real-time. Watch as our system forecasts potential 
                                market movements and use these insights to inform your investment decisions.
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4} className="mb-4">
                    <Card className="h-100" style={{ borderColor: 'var(--pet-sounds-tan)' }}>
                        <Card.Header style={{ backgroundColor: 'var(--pet-sounds-green)', color: 'white' }}>
                            <h3 className="h5 mb-0">Virtual Trading</h3>
                        </Card.Header>
                        <Card.Body>
                            <p>
                                Buy and sell stocks using virtual currency in a simulated environment that mirrors 
                                real market conditions. Build your portfolio, track your performance, and learn 
                                investment strategies without risking real money.
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4} className="mb-4">
                    <Card className="h-100" style={{ borderColor: 'var(--pet-sounds-tan)' }}>
                        <Card.Header style={{ backgroundColor: 'var(--pet-sounds-green)', color: 'white' }}>
                            <h3 className="h5 mb-0">Performance Analytics</h3>
                        </Card.Header>
                        <Card.Body>
                            <p>
                                Track your investment performance with detailed analytics and visualizations. 
                                Compare your results against market benchmarks, analyze your trading history, 
                                and gain insights into your investment strategies.
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            
            <Row>
                <Col>
                    <h2 style={{ color: 'var(--pet-sounds-green)' }}>Educational Purpose</h2>
                    <p>
                        Investation is designed as an educational tool to help users understand stock market dynamics, 
                        practice investment strategies, and learn about financial markets in a risk-free environment. 
                        Our platform combines realistic market simulation with predictive technology to create an 
                        immersive learning experience.
                    </p>
                    <p>
                        <strong>Remember:</strong> While our AI prediction technology aims to provide realistic 
                        forecasts based on historical data and market trends, all predictions are simulations and 
                        should not be used for actual investment decisions. Real markets are influenced by countless 
                        factors that no prediction model can fully account for.
                    </p>
                </Col>
            </Row>
        </Container>
    );
};

export default AboutPage;