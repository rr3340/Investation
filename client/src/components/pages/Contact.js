import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { FaGithub } from 'react-icons/fa';

const ContactPage = () => {
    return (
        <Container className="py-5">
            <Row className="mb-5">
                <Col>
                    <h1 className="mb-4" style={{ color: 'var(--pet-sounds-green)' }}>Contact Us</h1>
                    <p className="lead">
                        Have questions, feedback, or need assistance with Investation? 
                        We're here to help! Reach out to us through the channel below.
                    </p>
                </Col>
            </Row>
            
            <Row className="mb-5">
                <Col md={6} className="mb-4 mx-auto">
                    <Card className="h-100" style={{ borderColor: 'var(--pet-sounds-tan)' }}>
                        <Card.Header style={{ backgroundColor: 'var(--pet-sounds-green)', color: 'white' }}>
                            <h3 className="h5 mb-0 d-flex align-items-center">
                                <FaGithub className="me-2" /> GitHub
                            </h3>
                        </Card.Header>
                        <Card.Body className="d-flex flex-column">
                            <p>
                                Check out our GitHub repository for the latest updates, contribute to the project, 
                                or report issues you encounter while using Investation.
                            </p>
                            <div className="mt-auto">
                                <Button 
                                    variant="outline-primary" 
                                    href="https://github.com/rr3340" 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ 
                                        borderColor: 'var(--pet-sounds-green)', 
                                        color: 'var(--pet-sounds-green)'
                                    }}
                                >
                                    Visit GitHub Profile
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            
            <Row>
                <Col>
                    <div className="bg-light p-4 rounded" style={{ borderLeft: '4px solid var(--pet-sounds-green)' }}>
                        <h3 style={{ color: 'var(--pet-sounds-green)' }}>Development Team</h3>
                        <p>
                            Investation was developed and maintained by <a href="https://github.com/rr3340" target="_blank" rel="noopener noreferrer">@rr3340</a> on GitHub.
                        </p>
                    </div>
                </Col>
            </Row>
        </Container>
    );
};

export default ContactPage;