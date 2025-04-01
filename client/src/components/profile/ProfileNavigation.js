import React from 'react';
import { Nav } from 'react-bootstrap';
import { 
    FaChartPie, 
    FaChartLine, 
    FaStar, 
    FaCog
} from 'react-icons/fa';
import './ProfileNavigation.css';

const ProfileNavigation = ({ activeTab, setActiveTab, isCurrentUser }) => {
    const tabs = [
        {
            id: 'portfolio',
            label: 'Portfolio',
            icon: <FaChartPie className="nav-icon" />
        },
        {
            id: 'investments',
            label: 'Investments',
            icon: <FaChartLine className="nav-icon" />
        },
        {
            id: 'watchlist',
            label: 'Watchlist',
            icon: <FaStar className="nav-icon" />
        }
    ];
    
    if (isCurrentUser) {
        tabs.push({
            id: 'settings',
            label: 'Settings',
            icon: <FaCog className="nav-icon" />
        });
    }
    
    return (
        <Nav className="profile-navigation">
            {tabs.map(tab => (
                <Nav.Link
                    key={tab.id}
                    className={`profile-nav-link ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                >
                    {tab.icon}
                    <span>{tab.label}</span>
                </Nav.Link>
            ))}
        </Nav>
    );
};

export default ProfileNavigation; 