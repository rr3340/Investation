import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import { FaCamera, FaTimes, FaUser } from 'react-icons/fa';
import { userApi } from '../../lib/api';
import { useAuth } from '../../lib/hooks/useAuth';
import './EditProfileModal.css';

const EditProfileModal = ({ show, onHide, user, onProfileUpdate }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  //Form states.
  const [formData, setFormData] = useState({
    display_name: user?.display_name || '',
    about: user?.about || '',
    nationality: user?.nationality || '',
  });
  
  //When the user changes, the data changes.
  useEffect(() => {
    if (user) {
      setFormData({
        display_name: user.display_name || '',
        about: user.about || '',
        nationality: user.nationality || '',
      });
      setProfileImagePreview(user.profile_img || null);
      setBannerImagePreview(user.profile_banner || null);
    }
  }, [user]);
  
  // Handles file inputs, image previews, and uploads + changes for the profile banner and picture.
  const profileImageRef = useRef(null);
  const bannerImageRef = useRef(null);
  
  const [profileImagePreview, setProfileImagePreview] = useState(user?.profile_img || null);
  const [bannerImagePreview, setBannerImagePreview] = useState(user?.profile_banner || null);
  
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [bannerImageFile, setBannerImageFile] = useState(null);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleBannerImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBannerImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const triggerProfileImageInput = () => {
    profileImageRef.current.click();
  };
  
  const triggerBannerImageInput = () => {
    bannerImageRef.current.click();
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser || !user) {
      setError('User information is missing');
      return;
    }
    
    if (currentUser.id !== user.id) {
      console.warn(`Warning: Current user ID (${currentUser.id}) does not match profile user ID (${user.id})`);
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const profileData = {
        display_name: formData.display_name || null,
        about: formData.about || null,
        nationality: formData.nationality || null
      };
      
      if (profileImageFile) {
        const reader = new FileReader();
        const profileImgPromise = new Promise((resolve) => {
          reader.onloadend = () => {
            profileData.profile_img = reader.result;
            resolve();
          };
          reader.readAsDataURL(profileImageFile);
        });
        await profileImgPromise;
      } else if (profileImagePreview && !profileImagePreview.startsWith('data:')) {
        profileData.profile_img = profileImagePreview;
      }
      
      if (bannerImageFile) {
        const reader = new FileReader();
        const bannerImgPromise = new Promise((resolve) => {
          reader.onloadend = () => {
            profileData.profile_banner = reader.result;
            resolve();
          };
          reader.readAsDataURL(bannerImageFile);
        });
        await bannerImgPromise;
      } else if (bannerImagePreview && !bannerImagePreview.startsWith('data:')) {
        profileData.profile_banner = bannerImagePreview;
      }
      
      console.log('Sending profile data to backend:', profileData);
      console.log('User ID:', user.id, 'Type:', typeof user.id);
      console.log('Current User ID:', currentUser.id, 'Type:', typeof currentUser.id);
      
      onHide();
      
      const updatedUser = await userApi.updateProfileDisplay(currentUser.id, profileData);
      
      console.log('Updated user data received:', updatedUser);
      
      if (onProfileUpdate) {
        onProfileUpdate(updatedUser);
      }
      
      setProfileImageFile(null);
      setBannerImageFile(null);
      setError(null);
      setLoading(false);
      
    } catch (err) {
      console.error('Error updating profile:', err);
      
      onHide();
      
      if (onProfileUpdate) {
        onProfileUpdate(null, err.message || 'Failed to update profile. Please try again.');
      }
      
      setError(null);
      setLoading(false);
    }
  };
  
  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      centered 
      dialogClassName="edit-profile-modal"
      backdrop="static"
    >
      <Modal.Header className="edit-profile-header">
        <div className="d-flex align-items-center justify-content-between w-100">
          <div className="d-flex align-items-center">
            <Button 
              variant="link" 
              className="close-button" 
              onClick={onHide}
              disabled={loading}
            >
              <FaTimes />
            </Button>
            <Modal.Title>Edit profile</Modal.Title>
          </div>
          <Button 
            variant="dark" 
            className="save-button" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Saving...
              </>
            ) : 'Save'}
          </Button>
        </div>
      </Modal.Header>
      
      <Modal.Body className="edit-profile-body">
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}
        
        <Form onSubmit={handleSubmit}>
          {/* Banner Image */}
          <div className="banner-container">
            <div 
              className="banner-preview" 
              style={{ 
                backgroundImage: bannerImagePreview ? `url(${bannerImagePreview})` : 'none',
                backgroundColor: !bannerImagePreview ? 'var(--pet-sounds-red)' : 'transparent'
              }}
            >
              <Button 
                variant="light" 
                className="banner-edit-button" 
                onClick={triggerBannerImageInput}
                disabled={loading}
              >
                <FaCamera />
              </Button>
              <input
                type="file"
                ref={bannerImageRef}
                onChange={handleBannerImageChange}
                accept="image/*"
                className="d-none"
              />
            </div>
          </div>
          
          {/* Profile Image */}
          <div className="profile-image-container">
            <div className="profile-image-wrapper">
              {profileImagePreview ? (
                <img 
                  src={profileImagePreview} 
                  alt="Profile" 
                  className="profile-image-preview" 
                />
              ) : (
                <div className="profile-image-placeholder">
                  <FaUser />
                </div>
              )}
              <Button 
                variant="light" 
                className="profile-edit-button" 
                onClick={triggerProfileImageInput}
                disabled={loading}
              >
                <FaCamera />
              </Button>
              <input
                type="file"
                ref={profileImageRef}
                onChange={handleProfileImageChange}
                accept="image/*"
                className="d-none"
              />
            </div>
          </div>
          
          <div className="form-fields-container">
            {/* Display Name */}
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                name="display_name"
                value={formData.display_name}
                onChange={handleInputChange}
                maxLength={50}
                disabled={loading}
              />
              <Form.Text className="text-muted">
                {formData.display_name.length}/50
              </Form.Text>
            </Form.Group>
            
            {/* About / Bio */}
            <Form.Group className="mb-3">
              <Form.Label>Bio</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="about"
                value={formData.about}
                onChange={handleInputChange}
                maxLength={160}
                disabled={loading}
              />
              <Form.Text className="text-muted">
                {formData.about.length}/160
              </Form.Text>
            </Form.Group>
            
            {/* Nationality */}
            <Form.Group className="mb-3">
              <Form.Label>Nationality</Form.Label>
              <Form.Control
                type="text"
                name="nationality"
                value={formData.nationality}
                onChange={handleInputChange}
                disabled={loading}
              />
            </Form.Group>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default EditProfileModal; 