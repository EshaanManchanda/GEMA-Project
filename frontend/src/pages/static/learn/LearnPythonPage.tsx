import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/common/SEO';
import { getAppNameFull } from '@/utils/brandConfig';

const LearnPythonPage: React.FC = () => {
  const baseUrl = import.meta.env.VITE_APP_URL || 'https://kidrove.com';
  const appName = getAppNameFull();

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Learn', url: '/learn' },
    { name: 'Python', url: '/learn/python' },
  ];

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: 'Python Programming for Kids',
      description: 'Kids learn text-based programming with Python. Build projects, automate tasks, and explore data science and AI fundamentals through guided workshops.',
      url: `${baseUrl}/learn/python`,
      provider: {
        '@type': ['Organization', 'EducationalOrganization'],
        name: appName,
        url: baseUrl,
      },
      audience: {
        '@type': 'PeopleAudience',
        suggestedMinAge: 8,
        suggestedMaxAge: 17,
      },
      educationalLevel: 'Beginner to Intermediate',
      inLanguage: 'en',
      isAccessibleForFree: false,
      teaches: ['Python programming', 'Text-based coding', 'Data science basics', 'Automation', 'AI fundamentals'],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How Kids Learn Python Programming',
      description: 'Step-by-step learning path for children ages 8-17 to learn Python.',
      step: [
        { '@type': 'HowToStep', name: 'Learn Python syntax', text: 'Write your first lines of code: variables, print statements, and input.' },
        { '@type': 'HowToStep', name: 'Build with logic', text: 'Use if-else, loops, and functions to solve puzzles and build small programs.' },
        { '@type': 'HowToStep', name: 'Create projects', text: 'Build text adventures, calculators, quizzes, and simple data visualisations.' },
        { '@type': 'HowToStep', name: 'Explore advanced topics', text: 'Dive into web scraping, data analysis with pandas, or intro AI with machine learning libraries.' },
      ],
    },
  ];

  return (
    <>
      <SEO
        title={`Python Programming for Kids | Learn Coding | ${appName}`}
        description="Kids learn Python programming through guided workshops. Build real projects, explore data science, and start their coding journey. Ages 8-17. UAE classes available."
        keywords={['python for kids', 'kids coding', 'learn python UAE', 'text-based programming', 'coding classes children', 'python workshop kids']}
        breadcrumbs={breadcrumbs}
        structuredData={structuredData}
      />
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        {/* Hero */}
        <section className="container mx-auto px-4 pt-16 pb-12 text-center">
          <span className="inline-block bg-green-100 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">Ages 8–17</span>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Python Programming for Kids</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            The world's most popular programming language, made accessible for young learners.
            Kids write real code, build projects, and explore the foundations of data science and AI.
          </p>
          <Link
            to="/events?category=coding&search=python"
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
          >
            Browse Python Workshops
          </Link>
        </section>

        {/* What Kids Learn */}
        <section className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">What Kids Learn</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { title: 'Text-Based Coding', desc: 'Write real code with proper syntax — the next step after visual programming.' },
              { title: 'Logic and Algorithms', desc: 'Think like a programmer: variables, loops, functions, and data structures.' },
              { title: 'Project Building', desc: 'Create quizzes, chat bots, data dashboards, and automation scripts.' },
              { title: 'Real-World Skills', desc: 'Python is used in data science, AI, web development, and scientific research.' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why Python */}
        <section className="bg-white py-12">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Why Python for Kids?</h2>
            <ul className="space-y-4 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1 font-bold">1.</span>
                <span><strong>Readable syntax</strong> — Python reads almost like English, making it the easiest text language to start with.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1 font-bold">2.</span>
                <span><strong>#1 language worldwide</strong> — Most taught language in schools and universities globally.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1 font-bold">3.</span>
                <span><strong>Versatile career path</strong> — Used in AI, data science, web development, and game design.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1 font-bold">4.</span>
                <span><strong>Instant feedback</strong> — Run code and see results immediately, keeping kids engaged.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Start Writing Real Code</h2>
          <p className="text-gray-600 mb-8 max-w-lg mx-auto">
            Find Python programming workshops and classes for kids in the UAE.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/events?category=coding&search=python"
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
            >
              Find Python Classes
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

export default LearnPythonPage;
