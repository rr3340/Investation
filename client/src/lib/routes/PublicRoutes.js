import React from 'react';
import { Route } from 'react-router-dom';
import Home from '../../components/Home';
import About from '../../components/About';
import Contact from '../../components/Contact';

//Public routes which do not require authentication.
export const PublicRoutes = () => {
  return [
    <Route key="root" path="/" element={<Home />} />,
    <Route key="home" path="/home" element={<Home />} />,
    <Route key="about" path="/about" element={<About />} />,
    <Route key="contact" path="/contact" element={<Contact />} />,
  ];
};

export default PublicRoutes; 