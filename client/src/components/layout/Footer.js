import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaLinkedin, FaGithub } from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <Container>
        <Row className="footer-content">
          <Col md={6} className="footer-brand mb-4 mb-md-0">
            <h3>Investat<span style={{ color: 'var(--pet-sounds-beige)' }}>ion</span></h3>
            <p>Your personal finance companion for smart investing and wealth management.</p>
            <div className="social-icons">
              <a href="https://www.linkedin.com/in/rohan-r-7409202b4/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <FaLinkedin />
              </a>
              <a href="https://github.com/rr3340" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                <FaGithub />
              </a>
            </div>
          </Col>
          
          <Col md={6} sm={6} className="footer-links">
            <h5>Company</h5>
            <ul>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </Col>
        </Row>
        
        <hr className="footer-divider" />
        
        <Row className="footer-bottom">
          <Col className="footer-copyright">
            <p>&copy; {currentYear} Investat<span style={{ color: 'var(--pet-sounds-beige)' }}>ion</span>. All rights reserved.</p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer; 