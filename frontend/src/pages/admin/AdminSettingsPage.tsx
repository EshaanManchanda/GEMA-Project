import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { FiSave, FiRefreshCw, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import adminAPI from '../../services/api/adminAPI';
import { fetchSocialSettings } from '../../store/slices/settingsSlice';
import { AppDispatch } from '../../store';

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  supportPhone: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  defaultLanguage: string;
  timeZone: string;
  currency: string;
  bookingFeePercentage: number;
  taxPercentage: number;
  featuredEventCost: number;
  maxImagesPerEvent: number;
  maxEventsPerVendor: number;
  autoApproveEvents: boolean;
  autoApproveVendors: boolean;
  autoApproveReviews: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
}

interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpEncryption: string;
  senderName: string;
  senderEmail: string;
  welcomeEmailTemplate: string;
  bookingConfirmationTemplate: string;
  passwordResetTemplate: string;
}

interface PaymentSettings {
  stripeEnabled: boolean;
  stripePublicKey: string;
  stripeSecretKey: string;
  paypalEnabled: boolean;
  paypalClientId: string;
  paypalSecret: string;
  bankTransferEnabled: boolean;
  bankDetails: string;
  cashOnDeliveryEnabled: boolean;
}

interface SocialSettings {
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
}

const AdminSettingsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [activeTab, setActiveTab] = useState<string>('system');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string>('');
  const [isTestingEmail, setIsTestingEmail] = useState<boolean>(false);
  const [emailTestResult, setEmailTestResult] = useState<string>('');
  
  // System Settings
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    siteName: 'Gema Events',
    siteDescription: 'Find and book the best events for kids',
    contactEmail: 'contact@gemaevents.com',
    supportPhone: '+1 (555) 123-4567',
    maintenanceMode: false,
    allowRegistration: true,
    defaultLanguage: 'en',
    timeZone: 'UTC',
    currency: 'USD',
    bookingFeePercentage: 5,
    taxPercentage: 7.5,
    featuredEventCost: 49.99,
    maxImagesPerEvent: 10,
    maxEventsPerVendor: 50,
    autoApproveEvents: false,
    autoApproveVendors: false,
    autoApproveReviews: false,
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
  });
  
  // Email Settings
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    smtpUser: 'notifications@gemaevents.com',
    smtpPassword: '********',
    smtpEncryption: 'tls',
    senderName: 'Gema Events',
    senderEmail: 'no-reply@gemaevents.com',
    welcomeEmailTemplate: '<h1>Welcome to Gema Events!</h1><p>Thank you for joining our platform.</p>',
    bookingConfirmationTemplate: '<h1>Booking Confirmed!</h1><p>Your booking has been confirmed.</p>',
    passwordResetTemplate: '<h1>Password Reset</h1><p>Click the link below to reset your password.</p>',
  });
  
  // Payment Settings
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    stripeEnabled: true,
    stripePublicKey: 'pk_test_*****',
    stripeSecretKey: 'sk_test_*****',
    paypalEnabled: true,
    paypalClientId: 'client_id_*****',
    paypalSecret: 'client_secret_*****',
    bankTransferEnabled: false,
    bankDetails: 'Bank: Example Bank\nAccount: 1234567890\nRouting: 987654321',
    cashOnDeliveryEnabled: false,
  });
  
  // Social Settings
  const [socialSettings, setSocialSettings] = useState<SocialSettings>({
    facebookUrl: 'https://facebook.com/gemaevents',
    twitterUrl: 'https://twitter.com/gemaevents',
    instagramUrl: 'https://instagram.com/gemaevents',
    youtubeUrl: 'https://youtube.com/gemaevents',
    linkedinUrl: 'https://linkedin.com/company/gemaevents',
  });

  // Fetch settings from backend API
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Fetch all settings from API
        const settingsResponse = await adminAPI.getAppSettings();

        if (settingsResponse.success) {
          const { systemSettings: fetchedSystemSettings, emailSettings: fetchedEmailSettings, paymentSettings: fetchedPaymentSettings, socialSettings: fetchedSocialSettings } = settingsResponse.data;

          // Update state with fetched data
          if (fetchedSystemSettings) setSystemSettings(prev => ({ ...prev, ...fetchedSystemSettings }));
          if (fetchedEmailSettings) setEmailSettings(prev => ({ ...prev, ...fetchedEmailSettings }));
          if (fetchedPaymentSettings) setPaymentSettings(prev => ({ ...prev, ...fetchedPaymentSettings }));
          if (fetchedSocialSettings) setSocialSettings(prev => ({ ...prev, ...fetchedSocialSettings }));
        }
      } catch (error) {
        console.log('Using default settings - API not available:', error);
        // Keep using the default values already set in state
      }
    };

    fetchSettings();
  }, []);

  const handleSystemSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setSystemSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleEmailSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setEmailSettings(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) : value
    }));
  };

  const handlePaymentSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setPaymentSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSocialSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setSocialSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError('');
    
    try {
      // Prepare settings data for API
      const settingsData = {
        systemSettings,
        emailSettings,
        paymentSettings,
        socialSettings
      };
      
      // Call the API to update settings
      const response = await adminAPI.updateAppSettings(settingsData);

      if (response.success) {
        setSaveSuccess(true);
        console.log('Settings saved successfully:', response.data);

        // Refresh social settings in Redux to sync across all components
        dispatch(fetchSocialSettings());

        // Reset success message after 3 seconds
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } else {
        throw new Error(response.message || 'Failed to save settings');
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save settings. Please try again.';
      setSaveError(errorMessage);
      
      // Reset error message after 5 seconds
      setTimeout(() => {
        setSaveError('');
      }, 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmailConnection = async () => {
    setIsTestingEmail(true);
    setEmailTestResult('');
    
    try {
      const response = await adminAPI.testEmailConnection();
      
      if (response.success) {
        setEmailTestResult('✓ Email connection test successful!');
      } else {
        setEmailTestResult('✗ Email connection test failed: ' + (response.message || 'Unknown error'));
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Connection test failed';
      setEmailTestResult('✗ Email connection test failed: ' + errorMessage);
    } finally {
      setIsTestingEmail(false);
      // Clear result after 5 seconds
      setTimeout(() => setEmailTestResult(''), 5000);
    }
  };

  const handleSendTestEmail = async () => {
    setIsTestingEmail(true);
    setEmailTestResult('');
    
    try {
      const testEmailData = {
        to: emailSettings.senderEmail,
        subject: 'Test Email from Gema Events Admin',
        body: 'This is a test email to verify that your email configuration is working correctly.'
      };
      
      const response = await adminAPI.sendTestEmail(testEmailData);
      
      if (response.success) {
        setEmailTestResult('✓ Test email sent successfully!');
      } else {
        setEmailTestResult('✗ Failed to send test email: ' + (response.message || 'Unknown error'));
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to send test email';
      setEmailTestResult('✗ Failed to send test email: ' + errorMessage);
    } finally {
      setIsTestingEmail(false);
      // Clear result after 5 seconds
      setTimeout(() => setEmailTestResult(''), 5000);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Settings</h1>
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? <FiRefreshCw className="animate-spin mr-2" /> : <FiSave className="mr-2" />}
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
      
      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md flex items-center">
          <FiCheckCircle className="mr-2" />
          Settings saved successfully and synced across the app!
        </div>
      )}
      
      {saveError && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
          <FiAlertTriangle className="mr-2" />
          {saveError}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex border-b">
          <button
            className={`px-4 py-3 font-medium ${activeTab === 'system' ? 'text-primary border-b-2 border-primary' : 'text-gray-600 hover:text-primary'}`}
            onClick={() => setActiveTab('system')}
          >
            System
          </button>
          <button
            className={`px-4 py-3 font-medium ${activeTab === 'email' ? 'text-primary border-b-2 border-primary' : 'text-gray-600 hover:text-primary'}`}
            onClick={() => setActiveTab('email')}
          >
            Email
          </button>
          <button
            className={`px-4 py-3 font-medium ${activeTab === 'payment' ? 'text-primary border-b-2 border-primary' : 'text-gray-600 hover:text-primary'}`}
            onClick={() => setActiveTab('payment')}
          >
            Payment
          </button>
          <button
            className={`px-4 py-3 font-medium ${activeTab === 'social' ? 'text-primary border-b-2 border-primary' : 'text-gray-600 hover:text-primary'}`}
            onClick={() => setActiveTab('social')}
          >
            Social Media
          </button>
        </div>
        
        <div className="p-6">
          {/* System Settings */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
                  <input
                    type="text"
                    name="siteName"
                    value={systemSettings.siteName}
                    onChange={handleSystemSettingsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={systemSettings.contactEmail}
                    onChange={handleSystemSettingsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-900"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site Description</label>
                <textarea
                  name="siteDescription"
                  value={systemSettings.siteDescription}
                  onChange={handleSystemSettingsChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-900"
                ></textarea>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Language</label>
                  <select
                    name="defaultLanguage"
                    value={systemSettings.defaultLanguage}
                    onChange={handleSystemSettingsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-900"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Zone</label>
                  <select
                    name="timeZone"
                    value={systemSettings.timeZone}
                    onChange={handleSystemSettingsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-900"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Dubai">Dubai</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    name="currency"
                    value={systemSettings.currency}
                    onChange={handleSystemSettingsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-900"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AED">AED (د.إ)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Booking Fee (%)</label>
                  <input
                    type="number"
                    name="bookingFeePercentage"
                    value={systemSettings.bookingFeePercentage}
                    onChange={handleSystemSettingsChange}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    name="taxPercentage"
                    value={systemSettings.taxPercentage}
                    onChange={handleSystemSettingsChange}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Featured Event Cost</label>
                  <input
                    type="number"
                    name="featuredEventCost"
                    value={systemSettings.featuredEventCost}
                    onChange={handleSystemSettingsChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-900"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="maintenanceMode"
                      name="maintenanceMode"
                      checked={systemSettings.maintenanceMode}
                      onChange={handleSystemSettingsChange}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-gray-700">
                      Maintenance Mode
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="allowRegistration"
                      name="allowRegistration"
                      checked={systemSettings.allowRegistration}
                      onChange={handleSystemSettingsChange}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="allowRegistration" className="ml-2 block text-sm text-gray-700">
                      Allow User Registration
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoApproveEvents"
                      name="autoApproveEvents"
                      checked={systemSettings.autoApproveEvents}
                      onChange={handleSystemSettingsChange}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="autoApproveEvents" className="ml-2 block text-sm text-gray-700">
                      Auto-approve Events
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoApproveVendors"
                      name="autoApproveVendors"
                      checked={systemSettings.autoApproveVendors}
                      onChange={handleSystemSettingsChange}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="autoApproveVendors" className="ml-2 block text-sm text-gray-700">
                      Auto-approve Vendors
                    </label>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoApproveReviews"
                      name="autoApproveReviews"
                      checked={systemSettings.autoApproveReviews}
                      onChange={handleSystemSettingsChange}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="autoApproveReviews" className="ml-2 block text-sm text-gray-700">
                      Auto-approve Reviews
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="emailNotifications"
                      name="emailNotifications"
                      checked={systemSettings.emailNotifications}
                      onChange={handleSystemSettingsChange}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-700">
                      Email Notifications
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="smsNotifications"
                      name="smsNotifications"
                      checked={systemSettings.smsNotifications}
                      onChange={handleSystemSettingsChange}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="smsNotifications" className="ml-2 block text-sm text-gray-700">
                      SMS Notifications
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="pushNotifications"
                      name="pushNotifications"
                      checked={systemSettings.pushNotifications}
                      onChange={handleSystemSettingsChange}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="pushNotifications" className="ml-2 block text-sm text-gray-700">
                      Push Notifications
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Email Settings */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                  <input
                    type="text"
                    name="smtpHost"
                    value={emailSettings.smtpHost}
                    onChange={handleEmailSettingsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
                  <input
                    type="number"
                    name="smtpPort"
                    value={emailSettings.smtpPort}
                    onChange={handleEmailSettingsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-900"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Username</label>
                  <input
                    type="text"
                    name="smtpUser"
                    value={emailSettings.smtpUser}
                    onChange={handleEmailSettingsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Password</label>
                  <input
                    type="password"
                    name="smtpPassword"
                    value={emailSettings.smtpPassword}
                    onChange={handleEmailSettingsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-900"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Encryption</label>
                  <select
                    name="smtpEncryption"
                    value={emailSettings.smtpEncryption}
                    onChange={handleEmailSettingsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-900"
                  >
                    <option value="none">None</option>
                    <option value="ssl">SSL</option>
                    <option value="tls">TLS</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sender Name</label>
                  <input
                    type="text"
                    name="senderName"
                    value={emailSettings.senderName}
                    onChange={handleEmailSettingsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sender Email</label>
                  <input
                    type="email"
                    name="senderEmail"
                    value={emailSettings.senderEmail}
                    onChange={handleEmailSettingsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-900"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Welcome Email Template</label>
                <textarea
                  name="welcomeEmailTemplate"
                  value={emailSettings.welcomeEmailTemplate}
                  onChange={handleEmailSettingsChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary font-mono text-sm bg-white text-gray-900"
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Booking Confirmation Template</label>
                <textarea
                  name="bookingConfirmationTemplate"
                  value={emailSettings.bookingConfirmationTemplate}
                  onChange={handleEmailSettingsChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary font-mono text-sm bg-white text-gray-900"
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password Reset Template</label>
                <textarea
                  name="passwordResetTemplate"
                  value={emailSettings.passwordResetTemplate}
                  onChange={handleEmailSettingsChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary font-mono text-sm bg-white text-gray-900"
                ></textarea>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleTestEmailConnection}
                  disabled={isTestingEmail}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors mr-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isTestingEmail ? (
                    <>
                      <FiRefreshCw className="animate-spin mr-2" />
                      Testing...
                    </>
                  ) : (
                    'Test Email Connection'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isTestingEmail}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send Test Email
                </button>
              </div>
              
              {emailTestResult && (
                <div className={`mt-4 p-3 rounded-md ${emailTestResult.includes('✓') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  <div className="flex items-center">
                    {emailTestResult.includes('✓') ? (
                      <FiCheckCircle className="mr-2" />
                    ) : (
                      <FiAlertTriangle className="mr-2" />
                    )}
                    {emailTestResult}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Payment Settings */}
          {activeTab === 'payment' && (
            <div className="space-y-6">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-yellow-700 text-sm">
                  <FiAlertTriangle className="inline-block mr-2" />
                  Payment credentials are sensitive information. Make sure your server is secure and uses HTTPS.
                </p>
              </div>
              
              <div className="border-b pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Stripe</h3>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="stripeEnabled"
                      name="stripeEnabled"
                      checked={paymentSettings.stripeEnabled}
                      onChange={handlePaymentSettingsChange}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="stripeEnabled" className="ml-2 block text-sm text-gray-700">
                      Enable Stripe
                    </label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Public Key</label>
                    <input
                      type="text"
                      name="stripePublicKey"
                      value={paymentSettings.stripePublicKey}
                      onChange={handlePaymentSettingsChange}
                      disabled={!paymentSettings.stripeEnabled}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500 bg-white text-gray-900"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Secret Key</label>
                    <input
                      type="password"
                      name="stripeSecretKey"
                      value={paymentSettings.stripeSecretKey}
                      onChange={handlePaymentSettingsChange}
                      disabled={!paymentSettings.stripeEnabled}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500 bg-white text-gray-900"
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-b pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">PayPal</h3>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="paypalEnabled"
                      name="paypalEnabled"
                      checked={paymentSettings.paypalEnabled}
                      onChange={handlePaymentSettingsChange}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="paypalEnabled" className="ml-2 block text-sm text-gray-700">
                      Enable PayPal
                    </label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PayPal Client ID</label>
                    <input
                      type="text"
                      name="paypalClientId"
                      value={paymentSettings.paypalClientId}
                      onChange={handlePaymentSettingsChange}
                      disabled={!paymentSettings.paypalEnabled}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500 bg-white text-gray-900"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PayPal Secret</label>
                    <input
                      type="password"
                      name="paypalSecret"
                      value={paymentSettings.paypalSecret}
                      onChange={handlePaymentSettingsChange}
                      disabled={!paymentSettings.paypalEnabled}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500 bg-white text-gray-900"
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-b pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Bank Transfer</h3>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="bankTransferEnabled"
                      name="bankTransferEnabled"
                      checked={paymentSettings.bankTransferEnabled}
                      onChange={handlePaymentSettingsChange}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="bankTransferEnabled" className="ml-2 block text-sm text-gray-700">
                      Enable Bank Transfer
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Details</label>
                  <textarea
                    name="bankDetails"
                    value={paymentSettings.bankDetails}
                    onChange={handlePaymentSettingsChange}
                    disabled={!paymentSettings.bankTransferEnabled}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500 bg-white text-gray-900"
                  ></textarea>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Cash on Delivery</h3>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="cashOnDeliveryEnabled"
                      name="cashOnDeliveryEnabled"
                      checked={paymentSettings.cashOnDeliveryEnabled}
                      onChange={handlePaymentSettingsChange}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="cashOnDeliveryEnabled" className="ml-2 block text-sm text-gray-700">
                      Enable Cash on Delivery
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Social Media Settings */}
          {activeTab === 'social' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Facebook URL</label>
                  <input
                    type="url"
                    name="facebookUrl"
                    value={socialSettings.facebookUrl}
                    onChange={handleSocialSettingsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Twitter URL</label>
                  <input
                    type="url"
                    name="twitterUrl"
                    value={socialSettings.twitterUrl}
                    onChange={handleSocialSettingsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instagram URL</label>
                  <input
                    type="url"
                    name="instagramUrl"
                    value={socialSettings.instagramUrl}
                    onChange={handleSocialSettingsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL</label>
                  <input
                    type="url"
                    name="youtubeUrl"
                    value={socialSettings.youtubeUrl}
                    onChange={handleSocialSettingsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    name="linkedinUrl"
                    value={socialSettings.linkedinUrl}
                    onChange={handleSocialSettingsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-900"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;