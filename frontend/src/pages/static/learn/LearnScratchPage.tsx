import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/common/SEO';
import { getAppNameFull } from '@/utils/brandConfig';

const LearnScratchPage: React.FC = () => {
  const baseUrl = import.meta.env.VITE_APP_URL || 'https://kidrove.com';
  const appName = getAppNameFull();

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Learn', url: '/learn' },
    { name: 'Scratch Programming', url: '/learn/scratch' },
  ];

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: 'Scratch Programming for Kids',
      description: 'Learn visual programming with MIT Scratch. Kids create animations, interactive stories, and coding projects while building computational thinking skills.',
      url: `${baseUrl}/learn/scratch`,
      provider: {
        '@type': ['Organization', 'EducationalOrganization'],
        name: appName,
        url: baseUrl,
      },
      audience: {
        '@type': 'PeopleAudience',
        suggestedMinAge: 5,
        suggestedMaxAge: 14,
      },
      educationalLevel: 'Beginner',
      inLanguage: 'en',
      isAccessibleForFree: true,
      teaches: ['Visual programming', 'Computational thinking', 'Animation', 'Game design'],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How Kids Learn Scratch Programming',
      description: 'Step-by-step guide to learning Scratch programming for children ages 5-14.',
      step: [
        { '@type': 'HowToStep', name: 'Start with Scratch basics', text: 'Learn to drag and snap code blocks together to make sprites move and interact.' },
        { '@type': 'HowToStep', name: 'Create animations', text: 'Build animated stories by controlling characters with sequences and loops.' },
        { '@type': 'HowToStep', name: 'Build interactive projects', text: 'Add user input, scoring, and logic to create interactive coding projects.' },
        { '@type': 'HowToStep', name: 'Share and collaborate', text: 'Publish projects to the Scratch community and remix others\' work.' },
      ],
    },
  ];

  return (
    <>
      <SEO
        title={`Scratch Programming for Kids | Learn Coding | ${appName}`}
        description="Kids learn visual programming with MIT Scratch. Create animations, interactive stories, and coding projects. Ages 5-14. Browse workshops and classes in the UAE."
        keywords={['scratch programming', 'kids coding', 'visual programming', 'MIT scratch', 'coding for kids', 'learn scratch UAE', 'children programming']}
        breadcrumbs={breadcrumbs}
        structuredData={structuredData}
      />
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
        {/* Hero */}
        <section className="container mx-auto px-4 pt-16 pb-12 text-center">
          <span className="inline-block bg-orange-100 text-orange-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">Ages 5–14</span>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Scratch Programming for Kids</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            MIT Scratch lets kids learn coding by snapping visual blocks together — no typing required.
            They build animations, stories, and interactive projects while developing computational thinking.
          </p>
          <Link
            to="/events?category=coding&search=scratch"
            className="inline-flex items-center px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
          >
            Browse Scratch Workshops
          </Link>
        </section>

        {/* What Kids Learn */}
        <section className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">What Kids Learn</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { title: 'Drag-and-Drop Coding', desc: 'Snap code blocks together to control sprites, sounds, and animations.' },
              { title: 'Computational Thinking', desc: 'Break problems into steps, use loops, conditionals, and variables.' },
              { title: 'Creative Expression', desc: 'Design characters, backgrounds, and stories with built-in art tools.' },
              { title: 'Project-Based Learning', desc: 'Build real projects: animations, quizzes, interactive stories, and more.' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why Scratch */}
        <section className="bg-white py-12">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Why Scratch?</h2>
            <ul className="space-y-4 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-orange-500 mt-1 font-bold">1.</span>
                <span>Developed by <strong>MIT Media Lab</strong> — used by millions of children in 150+ countries.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 mt-1 font-bold">2.</span>
                <span>No reading or typing needed for young learners — perfect for ages 5–7 with ScratchJr.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 mt-1 font-bold">3.</span>
                <span>Builds the foundation for Python, JavaScript, and other text-based languages.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 mt-1 font-bold">4.</span>
                <span>Free to use online — kids can continue practicing at home after workshops.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Start Coding?</h2>
          <p className="text-gray-600 mb-8 max-w-lg mx-auto">
            Find Scratch programming workshops, classes, and camps for kids near you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/events?category=coding&search=scratch"
              className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
            >
              Find Scratch Classes
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

export default LearnScratchPage;
