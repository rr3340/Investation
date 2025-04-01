import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Alert } from 'react-bootstrap';
import { FaCalendarAlt, FaEdit, FaUserPlus, FaEnvelope, FaUser, FaCameraRetro } from 'react-icons/fa';
import './ProfileHeader.css';
import { useAuth } from '../../lib/hooks/useAuth';
import { formatDate } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import EditProfileModal from './EditProfileModal';

// The defined constant for default images
const DEFAULT_PROFILE_IMAGE = '/Default_pfp.jpg';

// The default profile image component
const DefaultProfileImage = () => (
  <div className="profile-avatar default-profile-image">
    <img 
      src={DEFAULT_PROFILE_IMAGE} 
      alt="Default profile" 
      className="profile-avatar"
    />
  </div>
);

const ProfileHeader = ({ user, isCurrentUser, onProfileUpdate }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [profileImageFailed, setProfileImageFailed] = useState(!user?.profile_img);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [notificationType, setNotificationType] = useState('success');
  const [notificationMessage, setNotificationMessage] = useState('');
  
  // Resets the image failed state when user changes.
  useEffect(() => {
    setProfileImageFailed(!user?.profile_img);
  }, [user?.id, user?.profile_img]);

  const handleImageError = () => {
    setProfileImageFailed(true);
  };

  // Formatting the join date
  const joinDate = user?.created_at ? formatDate(user.created_at) : 'Unknown';
  
  const handleEditProfile = () => {
    setShowEditModal(true);
  };
  
  const handleEditBanner = () => {
    setShowEditModal(true);
  };
  
  const handleModalClose = () => {
    setShowEditModal(false);
  };
  
  const handleProfileUpdateComplete = (updatedUser, error) => {
    console.log('Profile update complete in ProfileHeader:', updatedUser);
    
    if (error) {
      setShowUpdateNotification(true);
      setNotificationType('error');
      setNotificationMessage(error);
    } else if (updatedUser) {
      // Resets the image failed state based on updated user data.
      if (updatedUser.profile_img) {
        setProfileImageFailed(false);
      }
      
      // Shows the success notification.
      setShowUpdateNotification(true);
      setNotificationType('success');
      setNotificationMessage('Your changes have been saved and your profile has been updated.');
      
      // Passes the updated user data to the parent component.
      if (onProfileUpdate) {
        onProfileUpdate(updatedUser);
      }
    }
    
    // Notifications last for 3 sections, matching the animation duration to hide.
    setTimeout(() => {
      const notification = document.querySelector('.profile-update-notification');
      if (notification) {
        notification.classList.add('hiding');
        
        setTimeout(() => {
          setShowUpdateNotification(false);
        }, 300);
      } else {
        setShowUpdateNotification(false);
      }
    }, 3000);
  };
  
  return (
    <div className="profile-header">
      {showUpdateNotification && (
        <div className="profile-update-notification">
          <Alert variant={notificationType} onClose={() => setShowUpdateNotification(false)} dismissible>
            <div className="d-flex align-items-center">
              {notificationType === 'success' ? (
                <span className="notification-icon success-icon me-2">✓</span>
              ) : (
                <span className="notification-icon error-icon me-2">!</span>
              )}
              <div>
                <strong>
                  {notificationType === 'success' ? 'Profile updated successfully!' : 'Error updating profile'}
                </strong>
                <p className="mb-0">{notificationMessage}</p>
              </div>
            </div>
          </Alert>
        </div>
      )}
      
      <div 
        className="profile-banner" 
        style={user?.profile_banner ? { backgroundImage: `url(${user.profile_banner})` } : {}}
      >
        {isCurrentUser && (
          <Button 
            className="edit-banner-btn" 
            title="Edit banner image"
            onClick={handleEditBanner}
          >
            <FaCameraRetro />
          </Button>
        )}
      </div>
      
      <Container>
        <div className="profile-avatar-container">
          {profileImageFailed ? (
            <DefaultProfileImage />
          ) : (
            <img
              src={user?.profile_img}
              alt={`${user?.username || 'User'}'s profile`}
              className="profile-avatar"
              onError={handleImageError}
            />
          )}
          
          {isCurrentUser && (
            <Button 
              className="edit-avatar-btn" 
              title="Edit profile picture"
              onClick={handleEditProfile}
            >
              <FaEdit />
            </Button>
          )}
        </div>
        
        <div className="profile-info-container">
          <Row>
            <Col md={8} className="profile-info">
              <h1 className="profile-name">{user?.display_name || user?.username || 'User'}</h1>
              <div className="profile-username">@{user?.username || 'username'}</div>
              
              {user?.about && (
                <p className="profile-bio">{user.about}</p>
              )}
              
              <div className="profile-meta">
                <div className="profile-joined">
                  <FaCalendarAlt className="meta-icon" />
                  Joined {joinDate}
                </div>
                {user?.nationality && (
                  <div className="profile-nationality ms-3">
                    <span className="meta-icon">🌍</span>
                    {user.nationality}
                  </div>
                )}
              </div>
            </Col>
            
            <Col md={4} className="profile-actions-col">
              <div className="profile-actions">
                {isCurrentUser ? (
                  <Button 
                    variant="outline-primary" 
                    className="edit-profile-btn"
                    onClick={handleEditProfile}
                  >
                    <FaEdit className="btn-icon" />
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button variant="primary" className="follow-btn">
                      <FaUserPlus className="btn-icon" />
                      Follow
                    </Button>
                    <Button variant="outline-secondary" className="message-btn">
                      <FaEnvelope className="btn-icon" />
                      Message
                    </Button>
                  </>
                )}
              </div>
            </Col>
          </Row>
        </div>
      </Container>
      
      {/* Edit Profile Modal */}
      <EditProfileModal 
        show={showEditModal} 
        onHide={handleModalClose} 
        user={user}
        onProfileUpdate={handleProfileUpdateComplete}
      />
    </div>
  );
};

export default ProfileHeader; 