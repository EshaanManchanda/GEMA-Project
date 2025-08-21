import React, { useState, useEffect } from 'react';
import vendorAPI from '../../services/api/vendorAPI';

interface VendorProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  description: string;
  logo: string;
  coverImage: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  website: string;
  socialMedia: {
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  };
  businessHours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  contactPerson: {
    name: string;
    position: string;
    email: string;
    phone: string;
  };
  verificationStatus: 'verified' | 'pending' | 'unverified';
  memberSince: string;
  taxInformation: {
    taxId: string;
    businessType: string;
  };
}

const VendorProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedProfile, setEditedProfile] = useState<VendorProfile | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchVendorProfile = async () => {
      setIsLoading(true);
      try {
        // Fetch real vendor profile from backend
        const profileData = await vendorAPI.getVendorProfile();
        
        // Transform backend data to match frontend interface
        const transformedProfile: VendorProfile = {
          id: profileData._id || profileData.id,
          name: profileData.businessName || profileData.name || 'Your Business Name',
          email: profileData.email || '',
          phone: profileData.phone || '',
          description: profileData.description || '',
          logo: profileData.logo || 'https://via.placeholder.com/150',
          coverImage: profileData.coverImage || 'https://via.placeholder.com/1200x300',
          address: profileData.address?.street || profileData.address || '',
          city: profileData.address?.city || profileData.city || '',
          state: profileData.address?.state || profileData.state || '',
          zipCode: profileData.address?.zipCode || profileData.zipCode || '',
          country: profileData.address?.country || profileData.country || 'United States',
          website: profileData.website || '',
          socialMedia: {
            facebook: profileData.socialMedia?.facebook || '',
            instagram: profileData.socialMedia?.instagram || '',
            twitter: profileData.socialMedia?.twitter || '',
            youtube: profileData.socialMedia?.youtube || '',
          },
          businessHours: {
            monday: profileData.businessHours?.monday || 'Closed',
            tuesday: profileData.businessHours?.tuesday || 'Closed',
            wednesday: profileData.businessHours?.wednesday || 'Closed',
            thursday: profileData.businessHours?.thursday || 'Closed',
            friday: profileData.businessHours?.friday || 'Closed',
            saturday: profileData.businessHours?.saturday || 'Closed',
            sunday: profileData.businessHours?.sunday || 'Closed',
          },
          contactPerson: {
            name: profileData.contactPerson?.name || profileData.firstName + ' ' + profileData.lastName || '',
            position: profileData.contactPerson?.position || '',
            email: profileData.contactPerson?.email || profileData.email || '',
            phone: profileData.contactPerson?.phone || profileData.phone || '',
          },
          verificationStatus: profileData.verificationStatus || 'unverified',
          memberSince: profileData.createdAt || new Date().toISOString(),
          taxInformation: {
            taxId: profileData.taxInformation?.taxId || '',
            businessType: profileData.taxInformation?.businessType || '',
          },
        };
        
        setProfile(transformedProfile);
        setEditedProfile(transformedProfile);
      } catch (error) {
        console.error('Error fetching vendor profile:', error);
        
        // Fallback to basic profile structure if API fails
        const fallbackProfile: VendorProfile = {
          id: 'temp',
          name: 'Your Business Name',
          email: '',
          phone: '',
          description: '',
          logo: 'https://via.placeholder.com/150',
          coverImage: 'https://via.placeholder.com/1200x300',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'United States',
          website: '',
          socialMedia: {
            facebook: '',
            instagram: '',
            twitter: '',
            youtube: '',
          },
          businessHours: {
            monday: 'Closed',
            tuesday: 'Closed',
            wednesday: 'Closed',
            thursday: 'Closed',
            friday: 'Closed',
            saturday: 'Closed',
            sunday: 'Closed',
          },
          contactPerson: {
            name: '',
            position: '',
            email: '',
            phone: '',
          },
          verificationStatus: 'unverified',
          memberSince: new Date().toISOString(),
          taxInformation: {
            taxId: '',
            businessType: '',
          },
        };
        
        setProfile(fallbackProfile);
        setEditedProfile(fallbackProfile);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVendorProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle nested properties
    if (name.includes('.') && editedProfile) {
      const [parent, child] = name.split('.');
      setEditedProfile({
        ...editedProfile,
        [parent]: {
          ...(editedProfile[parent as keyof VendorProfile] as Record<string, string>),
          [child]: value,
        },
      });
    } else {
      setEditedProfile(prev => prev ? { ...prev, [name]: value } : null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'coverImage') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        if (type === 'logo') {
          setLogoPreview(reader.result as string);
          setLogoFile(file);
        } else {
          setCoverImagePreview(reader.result as string);
          setCoverImageFile(file);
        }
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!editedProfile) return;
    
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      // Transform frontend data to backend format
      const profileData = {
        businessName: editedProfile.name,
        email: editedProfile.email,
        phone: editedProfile.phone,
        description: editedProfile.description,
        website: editedProfile.website,
        address: {
          street: editedProfile.address,
          city: editedProfile.city,
          state: editedProfile.state,
          zipCode: editedProfile.zipCode,
          country: editedProfile.country,
        },
        socialMedia: {
          facebook: editedProfile.socialMedia.facebook,
          instagram: editedProfile.socialMedia.instagram,
          twitter: editedProfile.socialMedia.twitter,
          youtube: editedProfile.socialMedia.youtube,
        },
        businessHours: editedProfile.businessHours,
        contactPerson: {
          name: editedProfile.contactPerson.name,
          position: editedProfile.contactPerson.position,
          email: editedProfile.contactPerson.email,
          phone: editedProfile.contactPerson.phone,
        },
        taxInformation: {
          taxId: editedProfile.taxInformation.taxId,
          businessType: editedProfile.taxInformation.businessType,
        },
      };
      
      // Update profile via API
      await vendorAPI.updateVendorProfile(profileData);
      
      // Update business hours if they've changed
      if (JSON.stringify(editedProfile.businessHours) !== JSON.stringify(profile?.businessHours)) {
        try {
          await vendorAPI.updateBusinessHours(editedProfile.businessHours);
        } catch (businessHoursError) {
          console.error('Error updating business hours:', businessHoursError);
        }
      }
      
      // Update social media if they've changed  
      if (JSON.stringify(editedProfile.socialMedia) !== JSON.stringify(profile?.socialMedia)) {
        try {
          await vendorAPI.updateSocialMedia(editedProfile.socialMedia);
        } catch (socialMediaError) {
          console.error('Error updating social media:', socialMediaError);
        }
      }
      
      // Handle image uploads if there are file changes
      if (logoFile) {
        try {
          const logoResponse = await vendorAPI.uploadVendorImage(logoFile);
          // Update the profile with the new avatar URL
          if (logoResponse?.data?.url) {
            editedProfile.logo = logoResponse.data.url;
          }
        } catch (uploadError) {
          console.error('Error uploading logo:', uploadError);
          setSaveMessage({ type: 'error', text: 'Failed to upload logo image. Profile saved without logo update.' });
        }
      }
      
      if (coverImageFile) {
        // For cover image, we'd need to implement a separate upload endpoint
        // For now, we'll just log that it's not implemented
        console.log('Cover image upload not yet implemented, but file is ready:', coverImageFile.name);
      }
      
      // Update the profile with the edited values
      setProfile(editedProfile);
      
      setIsEditing(false);
      setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Clear previews and files
      setLogoPreview(null);
      setCoverImagePreview(null);
      setLogoFile(null);
      setCoverImageFile(null);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update profile. Please try again.';
      setSaveMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedProfile(profile);
    setLogoPreview(null);
    setCoverImagePreview(null);
    setLogoFile(null);
    setCoverImageFile(null);
    setSaveMessage(null);
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>Failed to load vendor profile. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Vendor Profile</h1>
        
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Edit Profile
          </button>
        ) : (
          <div className="flex space-x-3">
            <button
              onClick={handleCancelEdit}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
      
      {saveMessage && (
        <div className={`${saveMessage.type === 'success' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-red-100 border-red-500 text-red-700'} border-l-4 p-4 mb-6`} role="alert">
          <p>{saveMessage.text}</p>
        </div>
      )}
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {/* Cover Image */}
        <div className="relative h-48 md:h-64 bg-gray-200">
          {isEditing ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <img 
                src={coverImagePreview || editedProfile?.coverImage} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <label className="cursor-pointer bg-white text-gray-700 px-4 py-2 rounded-md shadow hover:bg-gray-100">
                  Change Cover Image
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => handleFileChange(e, 'coverImage')}
                  />
                </label>
              </div>
            </div>
          ) : (
            <img 
              src={profile.coverImage} 
              alt="Cover" 
              className="w-full h-full object-cover"
            />
          )}
        </div>
        
        {/* Logo and Basic Info */}
        <div className="relative px-6 pt-16 pb-6">
          <div className="absolute -top-12 left-6">
            <div className="relative h-24 w-24 rounded-full border-4 border-white bg-white shadow-md overflow-hidden">
              {isEditing ? (
                <div className="relative h-full w-full">
                  <img 
                    src={logoPreview || editedProfile?.logo} 
                    alt="Logo" 
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <label className="cursor-pointer text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleFileChange(e, 'logo')}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <img 
                  src={profile.logo} 
                  alt="Logo" 
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between">
            <div>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={editedProfile?.name || ''}
                  onChange={handleInputChange}
                  className="text-2xl font-bold text-gray-900 border-b border-gray-300 focus:outline-none focus:border-primary pb-1 mb-2"
                />
              ) : (
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{profile.name}</h2>
              )}
              
              <div className="flex items-center mb-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${profile.verificationStatus === 'verified' ? 'bg-green-100 text-green-800' : profile.verificationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                  {profile.verificationStatus === 'verified' ? (
                    <>
                      <svg className="-ml-0.5 mr-1.5 h-3 w-3 text-green-400" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M3.707 5.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L5 7.586 3.707 5.293z" />
                      </svg>
                      Verified
                    </>
                  ) : profile.verificationStatus === 'pending' ? 'Verification Pending' : 'Unverified'}
                </span>
                <span className="ml-4 text-sm text-gray-500">Member since {formatDate(profile.memberSince)}</span>
              </div>
            </div>
          </div>
          
          {/* Description */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">About</h3>
            {isEditing ? (
              <textarea
                name="description"
                value={editedProfile?.description || ''}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            ) : (
              <p className="text-gray-700">{profile.description}</p>
            )}
          </div>
        </div>
        
        {/* Contact Information */}
        <div className="px-6 pb-6 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Business Contact</h4>
              <div className="space-y-3">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mt-0.5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={editedProfile?.email || ''}
                      onChange={handleInputChange}
                      className="flex-1 border-b border-gray-300 focus:outline-none focus:border-primary"
                    />
                  ) : (
                    <span className="text-gray-700">{profile.email}</span>
                  )}
                </div>
                
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mt-0.5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={editedProfile?.phone || ''}
                      onChange={handleInputChange}
                      className="flex-1 border-b border-gray-300 focus:outline-none focus:border-primary"
                    />
                  ) : (
                    <span className="text-gray-700">{profile.phone}</span>
                  )}
                </div>
                
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mt-0.5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                  </svg>
                  {isEditing ? (
                    <input
                      type="url"
                      name="website"
                      value={editedProfile?.website || ''}
                      onChange={handleInputChange}
                      className="flex-1 border-b border-gray-300 focus:outline-none focus:border-primary"
                    />
                  ) : (
                    <a href={`https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-dark">
                      {profile.website}
                    </a>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Primary Contact Person</h4>
              <div className="space-y-3">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mt-0.5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  {isEditing ? (
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        name="contactPerson.name"
                        value={editedProfile?.contactPerson.name || ''}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-300 focus:outline-none focus:border-primary"
                        placeholder="Name"
                      />
                      <input
                        type="text"
                        name="contactPerson.position"
                        value={editedProfile?.contactPerson.position || ''}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-300 focus:outline-none focus:border-primary"
                        placeholder="Position"
                      />
                    </div>
                  ) : (
                    <div>
                      <span className="text-gray-700 block">{profile.contactPerson.name}</span>
                      <span className="text-gray-500 text-sm">{profile.contactPerson.position}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mt-0.5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  {isEditing ? (
                    <input
                      type="email"
                      name="contactPerson.email"
                      value={editedProfile?.contactPerson.email || ''}
                      onChange={handleInputChange}
                      className="flex-1 border-b border-gray-300 focus:outline-none focus:border-primary"
                    />
                  ) : (
                    <span className="text-gray-700">{profile.contactPerson.email}</span>
                  )}
                </div>
                
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mt-0.5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="contactPerson.phone"
                      value={editedProfile?.contactPerson.phone || ''}
                      onChange={handleInputChange}
                      className="flex-1 border-b border-gray-300 focus:outline-none focus:border-primary"
                    />
                  ) : (
                    <span className="text-gray-700">{profile.contactPerson.phone}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Address */}
        <div className="px-6 pb-6 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Business Address</h3>
          
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={editedProfile?.address || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={editedProfile?.city || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={editedProfile?.state || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              
              <div>
                <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">Zip/Postal Code</label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  value={editedProfile?.zipCode || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={editedProfile?.country || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mt-0.5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">
                {profile.address}, {profile.city}, {profile.state} {profile.zipCode}, {profile.country}
              </span>
            </div>
          )}
        </div>
        
        {/* Social Media */}
        <div className="px-6 pb-6 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Social Media</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isEditing ? (
              <>
                <div>
                  <label htmlFor="facebook" className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      facebook.com/
                    </span>
                    <input
                      type="text"
                      id="facebook"
                      name="socialMedia.facebook"
                      value={(editedProfile?.socialMedia.facebook || '').replace('facebook.com/', '')}
                      onChange={handleInputChange}
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      instagram.com/
                    </span>
                    <input
                      type="text"
                      id="instagram"
                      name="socialMedia.instagram"
                      value={(editedProfile?.socialMedia.instagram || '').replace('instagram.com/', '')}
                      onChange={handleInputChange}
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="twitter" className="block text-sm font-medium text-gray-700 mb-1">Twitter</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      twitter.com/
                    </span>
                    <input
                      type="text"
                      id="twitter"
                      name="socialMedia.twitter"
                      value={(editedProfile?.socialMedia.twitter || '').replace('twitter.com/', '')}
                      onChange={handleInputChange}
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="youtube" className="block text-sm font-medium text-gray-700 mb-1">YouTube</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      youtube.com/
                    </span>
                    <input
                      type="text"
                      id="youtube"
                      name="socialMedia.youtube"
                      value={(editedProfile?.socialMedia.youtube || '').replace('youtube.com/', '')}
                      onChange={handleInputChange}
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="col-span-2 flex flex-wrap gap-4">
                {profile.socialMedia.facebook && (
                  <a href={`https://${profile.socialMedia.facebook}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200">
                    <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                    </svg>
                    Facebook
                  </a>
                )}
                
                {profile.socialMedia.instagram && (
                  <a href={`https://${profile.socialMedia.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1 rounded-full bg-pink-100 text-pink-800 hover:bg-pink-200">
                    <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
                    </svg>
                    Instagram
                  </a>
                )}
                
                {profile.socialMedia.twitter && (
                  <a href={`https://${profile.socialMedia.twitter}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200">
                    <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                    Twitter
                  </a>
                )}
                
                {profile.socialMedia.youtube && (
                  <a href={`https://${profile.socialMedia.youtube}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 hover:bg-red-200">
                    <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                    </svg>
                    YouTube
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Business Hours */}
        <div className="px-6 pb-6 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Business Hours</h3>
          
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(profile.businessHours).map(([day, hours]) => (
                <div key={day}>
                  <label htmlFor={day} className="block text-sm font-medium text-gray-700 mb-1 capitalize">{day}</label>
                  <input
                    type="text"
                    id={day}
                    name={`businessHours.${day}`}
                    value={editedProfile?.businessHours[day as keyof typeof profile.businessHours] || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="e.g. 9:00 AM - 5:00 PM or Closed"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(profile.businessHours).map(([day, hours]) => (
                <div key={day} className="flex justify-between">
                  <span className="text-gray-700 capitalize">{day}:</span>
                  <span className="text-gray-500">{hours}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Tax Information */}
        <div className="px-6 pb-6 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
          
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-1">Tax ID / Business Registration Number</label>
                <input
                  type="text"
                  id="taxId"
                  name="taxInformation.taxId"
                  value={editedProfile?.taxInformation.taxId || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              
              <div>
                <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                <select
                  id="businessType"
                  name="taxInformation.businessType"
                  value={editedProfile?.taxInformation.businessType || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                >
                  <option value="">Select Business Type</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                  <option value="LLC">LLC</option>
                  <option value="Corporation">Corporation</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Non-Profit">Non-Profit</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between">
                <span className="text-gray-700">Tax ID / Business Registration:</span>
                <span className="text-gray-500">{profile.taxInformation.taxId}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-700">Business Type:</span>
                <span className="text-gray-500">{profile.taxInformation.businessType}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorProfilePage;