import React from 'react';
import { Navbar, Nav, NavDropdown, Container, Button } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/hooks/useAuth';
import './Navbar.css';

const MyNavbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated, logout } = useAuth();
    const currentPath = location.pathname;
    
    //Checks if the current path is home
    const isHomePath = currentPath === '/' || currentPath === '/home';
    
    const handleLogout = () => {
        logout();
        navigate('/');
    };
    
    return (
      <Navbar expand="lg" className="main-navbar" fixed="top">
        <Container>
          <Navbar.Brand as={Link} to="/home">Investat<span style={{ color: 'var(--pet-sounds-beige)' }}>ion</span></Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/home" className={isHomePath ? 'active' : ''}>Home</Nav.Link>
              {!isAuthenticated ? (
                <Nav.Link as={Link} to="/login" className={currentPath === '/login' ? 'active' : ''}>Login</Nav.Link>
              ) : (
                <Nav.Link onClick={handleLogout} className="logout-link">Logout</Nav.Link>
              )}
              <Nav.Link as={Link} to="/about" className={currentPath === '/about' ? 'active' : ''}>About</Nav.Link>
              <Nav.Link as={Link} to="/contact" className={currentPath === '/contact' ? 'active' : ''}>Contact</Nav.Link>
              {isAuthenticated && (
                <NavDropdown title="Explore" id="basic-nav-dropdown" active={currentPath.startsWith('/action/')}>
                  <NavDropdown.Item as={Link} to="/action/3.1" active={currentPath === '/action/3.1'}>Markets</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/stocks" active={currentPath === '/stocks'}>Stock Directory</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/action/3.3" active={currentPath === '/action/3.3'}>Crypto</NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item as={Link} to="/action/3.4" active={currentPath === '/action/3.4'}>Learning Center</NavDropdown.Item>
                </NavDropdown>
              )}
            </Nav>
            {!isAuthenticated ? (
              <Button variant="outline-light" as={Link} to="/signup" className="signup-button">
                Sign Up
              </Button>
            ) : (
              <Button variant="outline-light" onClick={handleLogout} className="logout-button">
                Logout
              </Button>
            )}
          </Navbar.Collapse>
        </Container>
      </Navbar>
    );
  };

export default MyNavbar;