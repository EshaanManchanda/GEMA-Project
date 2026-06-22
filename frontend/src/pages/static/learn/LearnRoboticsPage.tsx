import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/common/SEO';
import { getAppNameFull } from '@/utils/brandConfig';

const LearnRoboticsPage: React.FC = () => {
  const baseUrl = import.meta.env.VITE_APP_URL || 'https://kidrove.com';
  const appName = getAppNameFull();

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Learn', url: '/learn' },
    { name: 'Robotics', url: '/learn/robotics' },
  ];

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: 'Robotics for Kids',
      description: 'Hands-on robotics workshops where kids build, program, and test real robots. Learn engineering, electronics, and coding through STEM projects.',
      url: `${baseUrl}/learn/robotics`,
      provider: {
        '@type': ['Organization', 'EducationalOrganization'],
        name: appName,
        url: baseUrl,
      },
      audience: {
        '@type': 'PeopleAudience',
        suggestedMinAge: 6,
        suggestedMaxAge: 16,
      },
      educationalLevel: 'Beginner to Intermediate',
      inLanguage: 'en',
      isAccessibleForFree: false,
      teaches: ['Robotics', 'Engineering', 'Electronics', 'Programming', 'Problem solving'],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How Kids Learn Robotics',
      description: 'Step-by-step path for children learning robotics, from basic builds to autonomous robots.',
      step: [
        { '@type': 'HowToStep', name: 'Build your first robot', text: 'Assemble motors, sensors, and a controller to build a simple moving robot.' },
        { '@type': 'HowToStep', name: 'Program movement', text: 'Write code to make the robot follow lines, avoid obstacles, or respond to commands.' },
        { '@type': 'HowToStep', name: 'Add sensors', text: 'Use ultrasonic, infrared, and touch sensors to make the robot interact with its environment.' },
        { '@type': 'HowToStep', name: 'Compete and collaborate', text: 'Join robotics challenges and team projects to apply skills in real scenarios.' },
      ],
    },
  ];

  return (
    <>
      <SEO
        title={`Robotics for Kids | STEM Workshops | ${appName}`}
        description="Kids learn robotics through hands-on workshops. Build, program, and test real robots. Ages 6-16. Find robotics classes and camps in the UAE."
        keywords={['robotics for kids', 'STEM workshops', 'kids robotics UAE', 'coding robots', 'engineering for children', 'robotics camp']}
        breadcrumbs={breadcrumbs}
        structuredData={structuredData}
      />
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        {/* Hero */}
        <section className="container mx-auto px-4 pt-16 pb-12 text-center">
          <span className="inline-block bg-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">Ages 6–16</span>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Robotics for Kids</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Hands-on STEM workshops where kids build, program, and test real robots.
            They learn engineering, electronics, and coding through project-based challenges.
          </p>
          <Link
            to="/events?category=stem&search=robotics"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Robotics Workshops
          </Link>
        </section>

        {/* What Kids Learn */}
        <section className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">What Kids Learn</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { title: 'Mechanical Engineering', desc: 'Build structures with gears, wheels, and motors. Understand how machines work.' },
              { title: 'Electronics Basics', desc: 'Wire sensors, LEDs, and controllers. Learn circuits and power management.' },
              { title: 'Programming Logic', desc: 'Write code to control robot behaviour — loops, conditionals, and sensor input.' },
              { title: 'Problem Solving', desc: 'Debug, iterate, and optimise designs through real-world engineering challenges.' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Platforms */}
        <section className="bg-white py-12">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Popular Robotics Platforms</h2>
            <ul className="space-y-4 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-blue-500 mt-1 font-bold">1.</span>
                <span><strong>LEGO Education</strong> — SPIKE Prime and Mindstorms for structured builds and block-based coding.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-500 mt-1 font-bold">2.</span>
                <span><strong>Arduino</strong> — Open-source microcontrollers for older kids ready to write real code.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-500 mt-1 font-bold">3.</span>
                <span><strong>VEX Robotics</strong> — Competition-grade kits used in international STEM tournaments.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-500 mt-1 font-bold">4.</span>
                <span><strong>micro:bit</strong> — Pocket-sized computer for quick experiments and wearable tech projects.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Build Something Amazing</h2>
          <p className="text-gray-600 mb-8 max-w-lg mx-auto">
            Find robotics workshops, camps, and classes for kids near you in the UAE.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/events?category=stem&search=robotics"
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Find Robotics Classes
            </Link>
            <Link
              to="/events"
              className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Browse All Activities
            </Link>
          </div>
        </section>
      </div>
    </>
  );
};

export default LearnRoboticsPage;
