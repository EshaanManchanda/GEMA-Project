import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUsers, 
  FiTrendingUp, 
  FiShield, 
  FiGlobe, 
  FiCheckCircle,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiDollarSign,
  FiStar,
  FiArrowRight,
  FiSend,
  FiHeart,
  FiTarget,
  FiAward,
  FiZap,
  FiGift,
  FiTrendingDown,
  FiClock,
  FiUserCheck
} from 'react-icons/fi';

const PartnerWithUsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('vendor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    partnershipType: 'vendor',
    website: '',
    message: '',
    agreeToTerms: false
  });

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.message.trim()) {
      errors.message = 'Message is required';
    }
    
    if (!formData.agreeToTerms) {
      errors.agreeToTerms = 'You must agree to the terms and conditions';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setFormErrors({});
    
    try {
      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        organization: '',
        partnershipType: 'vendor',
        website: '',
        message: '',
        agreeToTerms: false
      });
      
      // Reset success message after 5 seconds
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error) {
      console.error('Form submission error:', error);
      setFormErrors({ submit: 'Something went wrong. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

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
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6
      }
    }
  };

  const partnershipTypes = [
    {
      id: 'vendor',
      title: 'Event Vendors',
      icon: FiCalendar,
      description: 'Create, manage, and promote your kids\' events — Gema handles bookings and payments.',
      features: ['Vendor dashboard', 'Analytics & performance tracking', 'Featured placement options'],
      cta: 'Apply as Vendor',
      color: 'var(--primary-color)',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 'influencer',
      title: 'Influencers & Ambassadors',
      icon: FiStar,
      description: 'Help us spread joy! Collaborate to promote events and earn commissions.',
      features: ['Personalized referral codes', 'Commission on every booking', 'Social media features'],
      cta: 'Join Ambassador Program',
      color: 'var(--accent-color)',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      id: 'school',
      title: 'Schools & Activity Centers',
      icon: FiUsers,
      description: 'Partner to organize workshops, competitions, and after-school programs.',
      features: ['Dedicated school portal', 'Event co-branding opportunities', 'On-site QR check-ins'],
      cta: 'Partner with Gema',
      color: 'var(--primary-color)',
      gradient: 'from-green-500 to-teal-500'
    },
    {
      id: 'affiliate',
      title: 'Affiliates & Bloggers',
      icon: FiTrendingUp,
      description: 'Earn revenue by referring families to Gema events.',
      features: ['Affiliate dashboard', 'Real-time analytics', 'Automated monthly payouts'],
      cta: 'Join Affiliate Program',
      color: 'var(--accent-color)',
      gradient: 'from-orange-500 to-red-500'
    }
  ];

  const benefits = [
    {
      icon: FiTarget,
      title: 'Reach More Families',
      description: 'Showcase your events to parents actively searching for fun, trusted experiences.',
      color: 'var(--primary-color)',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100'
    },
    {
      icon: FiDollarSign,
      title: 'Boost Your Revenue',
      description: 'Generate bookings directly through our platform and get detailed analytics.',
      color: 'var(--accent-color)',
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100'
    },
    {
      icon: FiShield,
      title: 'Trusted Platform',
      description: 'We manage payments, customer support, and ticketing — you focus on delivering amazing events.',
      color: 'var(--primary-color)',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100'
    },
    {
      icon: FiGlobe,
      title: 'Community Impact',
      description: 'Join our mission to help kids explore, learn, and grow beyond the classroom.',
      color: 'var(--accent-color)',
      bgColor: 'bg-orange-50',
      iconBg: 'bg-orange-100'
    },
    {
      icon: FiAward,
      title: 'Safe & Secure',
      description: 'Transparent commission structure and protected payments.',
      color: 'var(--primary-color)',
      bgColor: 'bg-teal-50',
      iconBg: 'bg-teal-100'
    }
  ];

  const steps = [
    {
      icon: FiSend,
      title: 'Apply Online',
      description: 'Fill out the quick partner form — tell us how you\'d like to collaborate.'
    },
    {
      icon: FiCheckCircle,
      title: 'Get Approved',
      description: 'Our team reviews and approves your partnership application.'
    },
    {
      icon: FiZap,
      title: 'Start Earning',
      description: 'Access your dashboard, track performance, and start growing with Gema!'
    },
    {
      icon: FiHeart,
      title: 'Ongoing Support',
      description: 'We\'ll help you optimize your listings, promotions, and collaborations.'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Event Organizer',
      company: 'Tiny Explorers Academy',
      content: 'Gema has helped us fill our weekend workshops consistently! The platform is user-friendly and the support team is amazing.',
      rating: 5
    },
    {
      name: 'Mike Chen',
      role: 'Parenting Blogger',
      company: 'Parenting with Joy',
      content: 'We love how easy it is to track commissions and the transparent reporting. Great partnership experience!',
      rating: 5
    },
    {
      name: 'Emma Rodriguez',
      role: 'School Coordinator',
      company: 'Sunshine Elementary',
      content: 'Partnering with Gema has expanded our reach to families we never would have connected with otherwise.',
      rating: 5
    }
  ];

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 blur-3xl"></div>
          </div>
          
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-8"
              style={{ 
                backgroundColor: 'rgba(0, 142, 199, 0.1)',
                color: 'var(--primary-color)',
                border: '1px solid rgba(0, 142, 199, 0.2)'
              }}
            >
              <FiGift className="mr-2" />
              Join Our Growing Community
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
            >
              Partner with Gema
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed"
            >
              Whether you're an <span className="font-semibold" style={{ color: 'var(--primary-color)' }}>event organizer</span>, <span className="font-semibold" style={{ color: 'var(--accent-color)' }}>influencer</span>, <span className="font-semibold" style={{ color: 'var(--primary-color)' }}>school</span>, or <span className="font-semibold" style={{ color: 'var(--accent-color)' }}>affiliate</span>, Gema helps you connect with thousands of parents looking for meaningful activities for their children.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <button 
                onClick={() => document.getElementById('partnership-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="group px-8 py-4 font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                style={{ 
                  background: 'linear-gradient(135deg, var(--primary-color) 0%, #0070a3 100%)',
                  color: 'white'
                }}
              >
                <span className="flex items-center justify-center">
                  Become a Partner
                  <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              
              <button 
                onClick={() => window.location.href = '/contact'}
                className="group px-8 py-4 font-semibold rounded-xl border-2 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                style={{ 
                  borderColor: 'var(--accent-color)',
                  color: 'var(--accent-color)',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'var(--accent-color)';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = 'var(--accent-color)';
                }}
              >
                <span className="flex items-center justify-center">
                  Contact Our Team
                  <FiMail className="ml-2 group-hover:scale-110 transition-transform" />
                </span>
              </button>
            </motion.div>
          </div>
        </motion.div>

        {/* Why Partner Section */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="py-16 px-4 sm:px-6 lg:px-8"
        >
          <div className="max-w-7xl mx-auto">
            <motion.div variants={itemVariants} className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--primary-color)' }}>
                Why Collaborate with Gema?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Gema isn't just a platform — it's a growing ecosystem that connects families with verified, high-quality experiences.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className={`${benefit.bgColor} rounded-2xl shadow-lg p-8 text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-white/50`}
                >
                  <div 
                    className={`w-20 h-20 mx-auto mb-6 rounded-2xl ${benefit.iconBg} flex items-center justify-center shadow-lg`}
                  >
                    <benefit.icon className="w-10 h-10" style={{ color: benefit.color }} />
                  </div>
                  <h3 className="text-xl font-bold mb-4" style={{ color: benefit.color }}>
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Partnership Opportunities */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="py-20 px-4 sm:px-6 lg:px-8 bg-white"
        >
          <div className="max-w-7xl mx-auto">
            <motion.div variants={itemVariants} className="text-center mb-20">
              <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-6"
                style={{ 
                  backgroundColor: 'rgba(0, 142, 199, 0.1)',
                  color: 'var(--primary-color)',
                  border: '1px solid rgba(0, 142, 199, 0.2)'
                }}
              >
                <FiUsers className="mr-2" />
                Partnership Types
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Choose How You'd Like to Partner
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Different opportunities for individuals, creators, and organizations.
              </p>
            </motion.div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap justify-center gap-4 mb-16">
              {partnershipTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setActiveTab(type.id)}
                  className={`px-8 py-4 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg text-lg ${
                    activeTab === type.id
                      ? 'text-white shadow-2xl scale-105'
                      : 'text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-50'
                  }`}
                  style={{
                    background: activeTab === type.id 
                      ? (type.id === 'vendor' || type.id === 'school' 
                          ? 'linear-gradient(135deg, #008EC7 0%, #0070a3 100%)'
                          : 'linear-gradient(135deg, #8B4513 0%, #A0522D 100%)')
                      : 'white',
                    border: activeTab === type.id ? 'none' : '2px solid #e5e7eb',
                    color: activeTab === type.id ? 'white' : (type.id === 'vendor' || type.id === 'school' ? '#008EC7' : '#8B4513')
                  }}
                >
                  <span className="flex items-center">
                    <type.icon className="w-6 h-6 mr-3" />
                    {type.title}
                  </span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-12 shadow-2xl border border-gray-100"
            >
              {partnershipTypes.map((type) => (
                activeTab === type.id && (
                  <div key={type.id} className="text-center">
                    <div 
                      className="w-28 h-28 mx-auto mb-8 rounded-3xl flex items-center justify-center shadow-2xl"
                      style={{ 
                        background: type.id === 'vendor' || type.id === 'school' 
                          ? 'linear-gradient(135deg, #008EC7 0%, #0070a3 100%)'
                          : 'linear-gradient(135deg, #8B4513 0%, #A0522D 100%)'
                      }}
                    >
                      <type.icon className="w-14 h-14 text-white" />
                    </div>
                    <h3 className="text-4xl font-bold mb-6" style={{ 
                      color: type.id === 'vendor' || type.id === 'school' ? '#008EC7' : '#8B4513'
                    }}>
                      {type.title}
                    </h3>
                    <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
                      {type.description}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                      {type.features.map((feature, index) => (
                        <div key={index} className="flex items-center justify-center bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                          <FiCheckCircle className="w-7 h-7 mr-4" style={{ 
                            color: type.id === 'vendor' || type.id === 'school' ? '#008EC7' : '#8B4513'
                          }} />
                          <span className="text-gray-700 font-semibold text-lg">{feature}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => document.getElementById('partnership-form')?.scrollIntoView({ behavior: 'smooth' })}
                      className="group px-12 py-5 font-bold rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl text-xl"
                      style={{ 
                        background: type.id === 'vendor' || type.id === 'school' 
                          ? 'linear-gradient(135deg, #008EC7 0%, #0070a3 100%)'
                          : 'linear-gradient(135deg, #8B4513 0%, #A0522D 100%)',
                        color: 'white'
                      }}
                    >
                      <span className="flex items-center justify-center">
                        {type.cta}
                        <FiArrowRight className="ml-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </button>
                  </div>
                )
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-purple-50"
        >
          <div className="max-w-7xl mx-auto">
            <motion.div variants={itemVariants} className="text-center mb-20">
              <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-6"
                style={{ 
                  backgroundColor: 'rgba(0, 142, 199, 0.1)',
                  color: 'var(--primary-color)',
                  border: '1px solid rgba(0, 142, 199, 0.2)'
                }}
              >
                <FiClock className="mr-2" />
                Simple Process
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Getting Started is Simple
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Follow these easy steps to begin your partnership journey with Gema
              </p>
            </motion.div>

            <div className="relative">
              {/* Connection Line */}
              <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
                {steps.map((step, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    className="relative text-center group"
                  >
                    {/* Step Number Badge */}
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg"
                        style={{ backgroundColor: 'var(--primary-color)' }}
                      >
                        {index + 1}
                      </div>
                    </div>
                    
                    {/* Main Card */}
                    <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2 border border-gray-100 mt-4">
                      <div 
                        className="w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300"
                        style={{ 
                          background: `linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%)`
                        }}
                      >
                        <step.icon className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--primary-color)' }}>
                        {step.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Revenue Opportunities */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="py-20 px-4 sm:px-6 lg:px-8 bg-white"
        >
          <div className="max-w-7xl mx-auto">
            <motion.div variants={itemVariants} className="text-center mb-20">
              <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-6"
                style={{ 
                  backgroundColor: 'rgba(0, 142, 199, 0.1)',
                  color: 'var(--primary-color)',
                  border: '1px solid rgba(0, 142, 199, 0.2)'
                }}
              >
                <FiDollarSign className="mr-2" />
                Revenue Details
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Transparent Earnings, Real Growth
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Clear commission structures and payment schedules for all partnership types
              </p>
            </motion.div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-hidden rounded-3xl shadow-2xl border border-gray-100">
              <table className="w-full bg-white">
                <thead>
                  <tr 
                    className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
                  >
                    <th className="px-8 py-6 text-left text-white font-bold text-lg">Partnership Type</th>
                    <th className="px-8 py-6 text-left text-white font-bold text-lg">Revenue Source</th>
                    <th className="px-8 py-6 text-left text-white font-bold text-lg">Frequency</th>
                    <th className="px-8 py-6 text-left text-white font-bold text-lg">Commission Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 hover:bg-blue-50 transition-colors duration-300">
                    <td className="px-8 py-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mr-4" style={{ backgroundColor: 'var(--primary-color)' }}>
                          <FiCalendar className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-semibold text-lg">Vendor</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-gray-700">Commission per booking</td>
                    <td className="px-8 py-6 text-gray-700">Automated payouts</td>
                    <td className="px-8 py-6">
                      <span className="px-4 py-2 rounded-full text-sm font-semibold" style={{ backgroundColor: 'rgba(0, 142, 199, 0.1)', color: 'var(--primary-color)' }}>
                        5-15%
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-purple-50 transition-colors duration-300">
                    <td className="px-8 py-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mr-4" style={{ backgroundColor: 'var(--accent-color)' }}>
                          <FiTrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-semibold text-lg">Affiliate</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-gray-700">% on each successful referral</td>
                    <td className="px-8 py-6 text-gray-700">Monthly</td>
                    <td className="px-8 py-6">
                      <span className="px-4 py-2 rounded-full text-sm font-semibold" style={{ backgroundColor: 'rgba(139, 69, 19, 0.1)', color: 'var(--accent-color)' }}>
                        10-25%
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-pink-50 transition-colors duration-300">
                    <td className="px-8 py-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mr-4" style={{ backgroundColor: 'var(--accent-color)' }}>
                          <FiStar className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-semibold text-lg">Influencer</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-gray-700">Campaign-based collaboration</td>
                    <td className="px-8 py-6 text-gray-700">Per campaign</td>
                    <td className="px-8 py-6">
                      <span className="px-4 py-2 rounded-full text-sm font-semibold" style={{ backgroundColor: 'rgba(139, 69, 19, 0.1)', color: 'var(--accent-color)' }}>
                        $500-5000
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-green-50 transition-colors duration-300">
                    <td className="px-8 py-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mr-4" style={{ backgroundColor: 'var(--primary-color)' }}>
                          <FiUsers className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-semibold text-lg">School Partner</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-gray-700">Co-branded events</td>
                    <td className="px-8 py-6 text-gray-700">Per event</td>
                    <td className="px-8 py-6">
                      <span className="px-4 py-2 rounded-full text-sm font-semibold" style={{ backgroundColor: 'rgba(0, 142, 199, 0.1)', color: 'var(--primary-color)' }}>
                        3-8%
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-6">
              {[
                { type: 'Vendor', icon: FiCalendar, color: 'var(--primary-color)', bgColor: 'bg-blue-50', source: 'Commission per booking', frequency: 'Automated payouts', rate: '5-15%' },
                { type: 'Affiliate', icon: FiTrendingUp, color: 'var(--accent-color)', bgColor: 'bg-purple-50', source: '% on each successful referral', frequency: 'Monthly', rate: '10-25%' },
                { type: 'Influencer', icon: FiStar, color: 'var(--accent-color)', bgColor: 'bg-pink-50', source: 'Campaign-based collaboration', frequency: 'Per campaign', rate: '$500-5000' },
                { type: 'School Partner', icon: FiUsers, color: 'var(--primary-color)', bgColor: 'bg-green-50', source: 'Co-branded events', frequency: 'Per event', rate: '3-8%' }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className={`${item.bgColor} rounded-2xl p-6 shadow-lg border border-gray-100`}
                >
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mr-4" style={{ backgroundColor: item.color }}>
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold" style={{ color: item.color }}>{item.type}</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Revenue Source:</span>
                      <span className="font-medium">{item.source}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Frequency:</span>
                      <span className="font-medium">{item.frequency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rate:</span>
                      <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: item.color + '20', color: item.color }}>
                        {item.rate}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Testimonials */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 via-white to-blue-50"
        >
          <div className="max-w-7xl mx-auto">
            <motion.div variants={itemVariants} className="text-center mb-20">
              <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-6"
                style={{ 
                  backgroundColor: 'rgba(0, 142, 199, 0.1)',
                  color: 'var(--primary-color)',
                  border: '1px solid rgba(0, 142, 199, 0.2)'
                }}
              >
                <FiStar className="mr-2" />
                Partner Success Stories
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                What Our Partners Say
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Real feedback from our successful partners who are growing with Gema
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
                >
                  {/* Quote Icon */}
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
                    </svg>
                  </div>
                  
                  {/* Rating */}
                  <div className="flex mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <FiStar key={i} className="w-6 h-6 mr-1" style={{ color: 'var(--primary-color)' }} />
                    ))}
                  </div>
                  
                  {/* Content */}
                  <p className="text-gray-600 mb-8 italic text-lg leading-relaxed">"{testimonial.content}"</p>
                  
                  {/* Author */}
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-lg mr-4">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{testimonial.name}</p>
                      <p className="text-sm text-gray-500">{testimonial.role}</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--primary-color)' }}>
                        {testimonial.company}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Trust Indicators */}
            <motion.div variants={itemVariants} className="mt-20 text-center">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2" style={{ color: 'var(--primary-color)' }}>500+</div>
                  <div className="text-gray-600">Active Partners</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2" style={{ color: 'var(--accent-color)' }}>98%</div>
                  <div className="text-gray-600">Satisfaction Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2" style={{ color: 'var(--primary-color)' }}>$2M+</div>
                  <div className="text-gray-600">Partner Earnings</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2" style={{ color: 'var(--accent-color)' }}>24h</div>
                  <div className="text-gray-600">Response Time</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Partnership Form */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          id="partnership-form"
          className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-white"
        >
          <div className="max-w-4xl mx-auto">
            <motion.div variants={itemVariants} className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Let's Get Started
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Fill out the form and our partnership team will reach out to you within 24 hours.
              </p>
            </motion.div>

            {submitSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8 p-6 bg-green-50 border border-green-200 rounded-xl text-center"
              >
                <FiCheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-800 mb-2">Application Submitted!</h3>
                <p className="text-green-600">Thank you for your interest in partnering with Gema. We'll contact you within 24 hours.</p>
              </motion.div>
            )}

            <motion.div variants={itemVariants} className="bg-white rounded-3xl p-10 shadow-2xl border border-gray-100">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-3">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className={`w-full px-4 py-4 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-300 ${
                        formErrors.name 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                      }`}
                      placeholder="Enter your full name"
                    />
                    {formErrors.name && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FiUserCheck className="w-4 h-4 mr-1" />
                        {formErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-3">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className={`w-full px-4 py-4 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-300 ${
                        formErrors.email 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                      }`}
                      placeholder="Enter your email address"
                    />
                    {formErrors.email && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <FiMail className="w-4 h-4 mr-1" />
                        {formErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-3">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:border-blue-500 focus:ring-blue-100 transition-all duration-300"
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div>
                    <label htmlFor="organization" className="block text-sm font-semibold text-gray-700 mb-3">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      id="organization"
                      name="organization"
                      value={formData.organization}
                      onChange={handleChange}
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:border-blue-500 focus:ring-blue-100 transition-all duration-300"
                      placeholder="Enter your organization name"
                    />
                  </div>

                  <div>
                    <label htmlFor="partnershipType" className="block text-sm font-semibold text-gray-700 mb-3">
                      Type of Partnership *
                    </label>
                    <select
                      id="partnershipType"
                      name="partnershipType"
                      value={formData.partnershipType}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:border-blue-500 focus:ring-blue-100 transition-all duration-300"
                    >
                      <option value="vendor">Event Vendor</option>
                      <option value="influencer">Influencer & Ambassador</option>
                      <option value="school">School & Activity Center</option>
                      <option value="affiliate">Affiliate & Blogger</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="website" className="block text-sm font-semibold text-gray-700 mb-3">
                      Website / Social Link
                    </label>
                    <input
                      type="url"
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      placeholder="https://yourwebsite.com"
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:border-blue-500 focus:ring-blue-100 transition-all duration-300"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-3">
                    Message / Proposal *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    placeholder="Tell us about your organization and how you'd like to partner with Gema..."
                    className={`w-full px-4 py-4 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-300 resize-none ${
                      formErrors.message 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                    }`}
                  />
                  {formErrors.message && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <FiSend className="w-4 h-4 mr-1" />
                      {formErrors.message}
                    </p>
                  )}
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="agreeToTerms"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleChange}
                    required
                    className="mt-2 mr-4 w-5 h-5 rounded border-2 border-gray-300 focus:ring-2 focus:ring-blue-500"
                    style={{ accentColor: 'var(--primary-color)' }}
                  />
                  <label htmlFor="agreeToTerms" className="text-sm text-gray-600 leading-relaxed">
                    I agree to the <a href="/terms" className="underline font-semibold" style={{ color: 'var(--primary-color)' }}>Terms & Conditions</a> and <a href="/privacy" className="underline font-semibold" style={{ color: 'var(--accent-color)' }}>Privacy Policy</a>
                  </label>
                </div>
                {formErrors.agreeToTerms && (
                  <p className="text-sm text-red-600 flex items-center">
                    <FiCheckCircle className="w-4 h-4 mr-1" />
                    {formErrors.agreeToTerms}
                  </p>
                )}

                {formErrors.submit && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-600 text-sm">{formErrors.submit}</p>
                  </div>
                )}

                <div className="text-center pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group px-12 py-5 font-bold rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl text-lg"
                    style={{ 
                      background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%)',
                      color: 'white'
                    }}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting Application...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        Submit Application
                        <FiSend className="ml-3 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </motion.div>

        {/* Footer CTA */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 blur-3xl"></div>
          </div>
          
          <div className="max-w-6xl mx-auto text-center relative z-10">
            <motion.div variants={itemVariants}>
              {/* Badge */}
              <div className="inline-flex items-center px-6 py-3 rounded-full text-sm font-medium mb-8"
                style={{ 
                  backgroundColor: 'rgba(0, 142, 199, 0.1)',
                  color: 'var(--primary-color)',
                  border: '1px solid rgba(0, 142, 199, 0.2)'
                }}
              >
                <FiHeart className="mr-2" />
                Ready to Start Your Journey?
              </div>
              
              {/* Main Heading */}
              <h2 className="text-5xl md:text-6xl font-bold mb-8 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Ready to Partner?
              </h2>
              
              {/* Subtitle */}
              <p className="text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
                Join thousands of partners already growing with Gema and start building meaningful connections with families today.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
                <button 
                  onClick={() => document.getElementById('partnership-form')?.scrollIntoView({ behavior: 'smooth' })}
                  className="group px-12 py-6 font-bold rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl text-xl"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--primary-color) 0%, #0070a3 100%)',
                    color: 'white'
                  }}
                >
                  <span className="flex items-center justify-center">
                    <FiArrowRight className="mr-3 group-hover:translate-x-1 transition-transform" />
                    Join Now
                    <FiArrowRight className="ml-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
                
                <button 
                  onClick={() => window.location.href = '/contact'}
                  className="group px-12 py-6 font-bold rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl text-xl"
                  style={{ 
                    borderColor: 'var(--accent-color)',
                    color: 'var(--accent-color)',
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--accent-color)';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = 'var(--accent-color)';
                  }}
                >
                  <span className="flex items-center justify-center">
                    <FiMail className="mr-3 group-hover:scale-110 transition-transform" />
                    Contact Our Team
                  </span>
                </button>
              </div>
              
              {/* Additional Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    <FiClock className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--primary-color)' }}>
                    Quick Response
                  </h3>
                  <p className="text-gray-600">
                    Get approved within 24 hours
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: 'var(--accent-color)' }}
                  >
                    <FiShield className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--accent-color)' }}>
                    Secure Platform
                  </h3>
                  <p className="text-gray-600">
                    Protected payments & data
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    <FiTrendingUp className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--primary-color)' }}>
                    Growth Focused
                  </h3>
                  <p className="text-gray-600">
                    Scale your business with us
                  </p>
                </div>
              </div>
              
              {/* Social Proof */}
              <div className="mt-16 pt-8 border-t border-gray-200">
                <p className="text-gray-500 text-sm mb-4">Trusted by partners worldwide</p>
                <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
                  <div className="text-2xl font-bold" style={{ color: 'var(--primary-color)' }}>EventBrite</div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--accent-color)' }}>Meetup</div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--primary-color)' }}>Eventful</div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--accent-color)' }}>Localist</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default PartnerWithUsPage;
