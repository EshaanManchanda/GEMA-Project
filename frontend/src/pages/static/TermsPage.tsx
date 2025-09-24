import React from 'react';
import { motion } from 'framer-motion';
import SEO from '@/components/common/SEO';

const TermsPage: React.FC = () => {
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
    { name: 'Terms & Conditions', url: '/terms' }
  ];

  return (
    <>
      <SEO
        title="Terms & Conditions - Gema Events"
        description="Read the terms and conditions for using Gema Events platform. Learn about our policies for booking kids activities, payments, cancellations, and user responsibilities."
        keywords={['terms and conditions', 'gema events terms', 'booking terms', 'user agreement', 'privacy policy']}
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
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">Terms of Service</h1>
          <p className="text-gray-600">Last Updated: {lastUpdated}</p>
        </motion.div>

        {/* Introduction */}
        <motion.div variants={itemVariants} className="mb-10">
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600 mb-4">
              Welcome to Gema Events. Please read these Terms of Service ("Terms", "Terms of Service") carefully before using our website and services operated by Gema Events.
            </p>
            <p className="text-gray-600">
              Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who access or use the Service. By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.
            </p>
          </div>
        </motion.div>

        {/* Account Terms */}
        <motion.div variants={itemVariants} className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Account Terms</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600 mb-4">
              When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
            </p>
            <p className="text-gray-600 mb-4">
              You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password, whether your password is with our Service or a third-party service.
            </p>
            <p className="text-gray-600">
              You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
            </p>
          </div>
        </motion.div>

        {/* User Conduct */}
        <motion.div variants={itemVariants} className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">User Conduct</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600 mb-4">
              You agree not to use the Service:
            </p>
            
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>In any way that violates any applicable national or international law or regulation.</li>
              <li>For the purpose of exploiting, harming, or attempting to exploit or harm minors in any way by exposing them to inappropriate content, asking for personally identifiable information, or otherwise.</li>
              <li>To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail", "chain letter," "spam," or any other similar solicitation.</li>
              <li>To impersonate or attempt to impersonate the Company, a Company employee, another user, or any other person or entity.</li>
              <li>In any way that infringes upon the rights of others, or in any way is illegal, threatening, fraudulent, or harmful, or in connection with any unlawful, illegal, fraudulent, or harmful purpose or activity.</li>
              <li>To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the Service, or which, as determined by us, may harm or offend the Company or users of the Service or expose them to liability.</li>
            </ul>
            
            <p className="text-gray-600">
              Additionally, you agree not to:
            </p>
            
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Use the Service in any manner that could disable, overburden, damage, or impair the site or interfere with any other party's use of the Service, including their ability to engage in real-time activities through the Service.</li>
              <li>Use any robot, spider, or other automatic device, process, or means to access the Service for any purpose, including monitoring or copying any of the material on the Service.</li>
              <li>Use any manual process to monitor or copy any of the material on the Service or for any other unauthorized purpose without our prior written consent.</li>
              <li>Use any device, software, or routine that interferes with the proper working of the Service.</li>
              <li>Introduce any viruses, trojan horses, worms, logic bombs, or other material which is malicious or technologically harmful.</li>
              <li>Attempt to gain unauthorized access to, interfere with, damage, or disrupt any parts of the Service, the server on which the Service is stored, or any server, computer, or database connected to the Service.</li>
              <li>Attack the Service via a denial-of-service attack or a distributed denial-of-service attack.</li>
              <li>Otherwise attempt to interfere with the proper working of the Service.</li>
            </ul>
          </div>
        </motion.div>

        {/* Event Bookings */}
        <motion.div variants={itemVariants} className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Event Bookings</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600 mb-4">
              Gema Events provides a platform for users to discover and book events. When you book an event through our Service, you are entering into a contract with the event organizer, not with Gema Events. We act as an intermediary between you and the event organizer.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 text-gray-800 mt-6">Booking Confirmation</h3>
            <p className="text-gray-600 mb-4">
              Your booking is confirmed once you have received a confirmation email from us. The confirmation email will contain important information about your booking, including the date, time, location, and any specific instructions from the event organizer.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 text-gray-800 mt-6">Cancellations and Refunds</h3>
            <p className="text-gray-600 mb-4">
              Cancellation and refund policies vary by event and are set by the event organizers. Please review the specific cancellation policy for each event before completing your booking. In general, if you cancel your booking, you may be entitled to a full or partial refund, depending on how far in advance you cancel and the specific policy of the event organizer.
            </p>
            <p className="text-gray-600 mb-4">
              If an event is canceled by the organizer, you will be entitled to a full refund of the booking price. In some cases, the organizer may reschedule the event instead of canceling it. If the event is rescheduled and you cannot attend on the new date, you may be entitled to a refund, subject to the organizer's policy.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 text-gray-800 mt-6">Pricing and Payments</h3>
            <p className="text-gray-600">
              All prices listed on our Service are in the specified currency and include applicable taxes unless otherwise stated. Payment for bookings must be made through our secure payment system. We accept various payment methods, including credit cards, debit cards, and other electronic payment methods as specified on our payment page.
            </p>
          </div>
        </motion.div>

        {/* Intellectual Property */}
        <motion.div variants={itemVariants} className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Intellectual Property</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600 mb-4">
              The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of Gema Events and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Gema Events.
            </p>
            <p className="text-gray-600">
              User-generated content that you post, upload, or otherwise make available through the Service may be used by Gema Events in connection with the Service and may be visible to other users. By posting content on the Service, you grant Gema Events a non-exclusive, transferable, sub-licensable, royalty-free, worldwide license to use, copy, modify, create derivative works based on, distribute, publicly display, publicly perform, and otherwise exploit in any manner such content in all formats and distribution channels now known or hereafter devised (including in connection with the Service and Gema Events's business and on third-party sites and services), without further notice to or consent from you, and without the requirement of payment to you or any other person or entity.
            </p>
          </div>
        </motion.div>

        {/* Limitation of Liability */}
        <motion.div variants={itemVariants} className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Limitation of Liability</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600 mb-4">
              In no event shall Gema Events, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage, and even if a remedy set forth herein is found to have failed of its essential purpose.
            </p>
          </div>
        </motion.div>

        {/* Disclaimer */}
        <motion.div variants={itemVariants} className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Disclaimer</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600 mb-4">
              Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement or course of performance.
            </p>
            <p className="text-gray-600">
              Gema Events, its subsidiaries, affiliates, and its licensors do not warrant that a) the Service will function uninterrupted, secure or available at any particular time or location; b) any errors or defects will be corrected; c) the Service is free of viruses or other harmful components; or d) the results of using the Service will meet your requirements.
            </p>
          </div>
        </motion.div>

        {/* Governing Law */}
        <motion.div variants={itemVariants} className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Governing Law</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600 mb-4">
              These Terms shall be governed and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
            </p>
            <p className="text-gray-600">
              Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect. These Terms constitute the entire agreement between us regarding our Service, and supersede and replace any prior agreements we might have between us regarding the Service.
            </p>
          </div>
        </motion.div>

        {/* Changes to Terms */}
        <motion.div variants={itemVariants} className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Changes to Terms</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600 mb-4">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
            </p>
            <p className="text-gray-600">
              By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, please stop using the Service.
            </p>
          </div>
        </motion.div>

        {/* Contact Us */}
        <motion.div variants={itemVariants}>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Contact Us</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600 mb-4">
              If you have any questions about these Terms, please contact us at:
            </p>
            <div className="text-gray-600">
              <p>Gema Events</p>
              <p>123 Event Street, Suite 200</p>
              <p>New York, NY 10001</p>
              <p>Email: legal@gemaevents.com</p>
              <p>Phone: +1 (555) 123-4567</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
    </>
  );
};

export default TermsPage;