import React from 'react';
import { motion } from 'framer-motion';
import SEO from '@/components/common/SEO';

const PrivacyPage: React.FC = () => {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  // Last updated date
  const lastUpdated = 'January 15, 2023';

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Privacy Policy', url: '/privacy' }
  ];

  return (
    <>
      <SEO
        title="Privacy Policy - Gema Events"
        description="Learn about Gema Events privacy policy and how we protect your personal information. Understand our data collection, usage, and security practices for kids activities platform."
        keywords={['privacy policy', 'data protection', 'gema events privacy', 'user privacy', 'data security']}
        breadcrumbs={breadcrumbs}
      />
      <div className="container mx-auto px-4 py-12">
      <motion.div 
        className="max-w-4xl mx-auto"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">Privacy Policy</h1>
          <p className="text-gray-600">Last Updated: {lastUpdated}</p>
        </motion.div>

        {/* Introduction */}
        <motion.div variants={itemVariants} className="mb-10">
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600 mb-4">
              At Gema Events, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.
            </p>
            <p className="text-gray-600">
              We reserve the right to make changes to this Privacy Policy at any time and for any reason. We will alert you about any changes by updating the "Last Updated" date of this Privacy Policy. You are encouraged to periodically review this Privacy Policy to stay informed of updates. You will be deemed to have been made aware of, will be subject to, and will be deemed to have accepted the changes in any revised Privacy Policy by your continued use of the website after the date such revised Privacy Policy is posted.
            </p>
          </div>
        </motion.div>

        {/* Information We Collect */}
        <motion.div variants={itemVariants} className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Information We Collect</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <h3 className="text-xl font-semibold mb-3 text-gray-800">Personal Data</h3>
            <p className="text-gray-600 mb-4">
              Personally identifiable information, such as your name, shipping address, email address, telephone number, and demographic information, such as your age, gender, hometown, and interests, that you voluntarily give to us when you register with our website or when you choose to participate in various activities related to the website. You are under no obligation to provide us with personal information of any kind, however your refusal to do so may prevent you from using certain features of the website.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 text-gray-800 mt-6">Derivative Data</h3>
            <p className="text-gray-600 mb-4">
              Information our servers automatically collect when you access the website, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the website. If you are using our mobile application, this information may also include your device name and type, your operating system, your phone number, your country, your likes and replies, and other interactions with the application and other users via server log files, as well as any other information you choose to provide.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 text-gray-800 mt-6">Financial Data</h3>
            <p className="text-gray-600 mb-4">
              Financial information, such as data related to your payment method (e.g. valid credit card number, card brand, expiration date) that we may collect when you purchase, order, return, exchange, or request information about our services from the website. We store only very limited, if any, financial information that we collect. Otherwise, all financial information is stored by our payment processor and you are encouraged to review their privacy policy and contact them directly for responses to your questions.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 text-gray-800 mt-6">Data From Social Networks</h3>
            <p className="text-gray-600">
              User information from social networking sites, such as Facebook, Google+, Instagram, Pinterest, Twitter, including your name, your social network username, location, gender, birth date, email address, profile picture, and public data for contacts, if you connect your account to such social networks. This information may also include the contact information of anyone you invite to use and/or join the website.
            </p>
          </div>
        </motion.div>

        {/* How We Use Your Information */}
        <motion.div variants={itemVariants} className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">How We Use Your Information</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600 mb-4">
              Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the website to:
            </p>
            
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Create and manage your account.</li>
              <li>Process your bookings and transactions.</li>
              <li>Send you a booking confirmation.</li>
              <li>Email you regarding your account or order.</li>
              <li>Send you administrative communications, such as administrative emails, confirmation emails, technical notices, updates on policies, or security alerts.</li>
              <li>Respond to your comments, questions, and requests.</li>
              <li>Send you a newsletter.</li>
              <li>Send you promotional information about features, services, and events we think you may find interesting.</li>
              <li>Monitor and analyze usage and trends to improve your experience with the website.</li>
              <li>Notify you of updates to the website.</li>
              <li>Resolve disputes and troubleshoot problems.</li>
              <li>Prevent fraudulent transactions, monitor against theft, and protect against criminal activity.</li>
              <li>Request feedback and contact you about your use of the website.</li>
            </ul>
          </div>
        </motion.div>

        {/* Disclosure of Your Information */}
        <motion.div variants={itemVariants} className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Disclosure of Your Information</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600 mb-4">
              We may share information we have collected about you in certain situations. Your information may be disclosed as follows:
            </p>
            
            <h3 className="text-xl font-semibold mb-3 text-gray-800">By Law or to Protect Rights</h3>
            <p className="text-gray-600 mb-4">
              If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation. This includes exchanging information with other entities for fraud protection and credit risk reduction.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 text-gray-800 mt-6">Third-Party Service Providers</h3>
            <p className="text-gray-600 mb-4">
              We may share your information with third parties that perform services for us or on our behalf, including payment processing, data analysis, email delivery, hosting services, customer service, and marketing assistance.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 text-gray-800 mt-6">Marketing Communications</h3>
            <p className="text-gray-600 mb-4">
              With your consent, or with an opportunity for you to withdraw consent, we may share your information with third parties for marketing purposes, as permitted by law.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 text-gray-800 mt-6">Interactions with Other Users</h3>
            <p className="text-gray-600 mb-4">
              If you interact with other users of the website, those users may see your name, profile photo, and descriptions of your activity, including sending invitations to other users, chatting with other users, liking posts, following events.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 text-gray-800 mt-6">Online Postings</h3>
            <p className="text-gray-600">
              When you post comments, contributions or other content to the website, your posts may be viewed by all users and may be publicly distributed outside the website in perpetuity.
            </p>
          </div>
        </motion.div>

        {/* Security of Your Information */}
        <motion.div variants={itemVariants} className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Security of Your Information</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600 mb-4">
              We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse. Any information disclosed online is vulnerable to interception and misuse by unauthorized parties. Therefore, we cannot guarantee complete security if you provide personal information.
            </p>
          </div>
        </motion.div>

        {/* Policy for Children */}
        <motion.div variants={itemVariants} className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Policy for Children</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600 mb-4">
              We do not knowingly solicit information from or market to children under the age of 13. If you become aware of any data we have collected from children under age 13, please contact us using the contact information provided below.
            </p>
          </div>
        </motion.div>

        {/* Your Privacy Rights */}
        <motion.div variants={itemVariants} className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Your Privacy Rights</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <h3 className="text-xl font-semibold mb-3 text-gray-800">Account Information</h3>
            <p className="text-gray-600 mb-4">
              You may at any time review or change the information in your account or terminate your account by:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Logging into your account settings and updating your account</li>
              <li>Contacting us using the contact information provided below</li>
            </ul>
            <p className="text-gray-600 mb-4">
              Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, some information may be retained in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our Terms of Use and/or comply with legal requirements.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 text-gray-800 mt-6">Emails and Communications</h3>
            <p className="text-gray-600 mb-4">
              If you no longer wish to receive correspondence, emails, or other communications from us, you may opt-out by:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Noting your preferences at the time you register your account with the website</li>
              <li>Logging into your account settings and updating your preferences</li>
              <li>Contacting us using the contact information provided below</li>
            </ul>
            <p className="text-gray-600">
              If you no longer wish to receive correspondence, emails, or other communications from third parties, you are responsible for contacting the third party directly.
            </p>
          </div>
        </motion.div>

        {/* Contact Us */}
        <motion.div variants={itemVariants}>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Contact Us</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600 mb-4">
              If you have questions or comments about this Privacy Policy, please contact us at:
            </p>
            <div className="text-gray-600">
              <p>Gema Events</p>
              <p>123 Event Street, Suite 200</p>
              <p>New York, NY 10001</p>
              <p>Email: privacy@gemaevents.com</p>
              <p>Phone: +1 (555) 123-4567</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
    </>
  );
};

export default PrivacyPage;