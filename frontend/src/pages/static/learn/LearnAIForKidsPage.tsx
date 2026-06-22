import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/common/SEO';
import { getAppNameFull } from '@/utils/brandConfig';

const LearnAIForKidsPage: React.FC = () => {
  const baseUrl = import.meta.env.VITE_APP_URL || 'https://kidrove.com';
  const appName = getAppNameFull();

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Learn', url: '/learn' },
    { name: 'AI for Kids', url: '/learn/ai-for-kids' },
  ];

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: 'Artificial Intelligence for Kids',
      description: 'Introduction to AI and machine learning for children. Kids explore how AI works, train simple models, and build AI-powered projects in a fun, hands-on environment.',
      url: `${baseUrl}/learn/ai-for-kids`,
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
      educationalLevel: 'Beginner',
      inLanguage: 'en',
      isAccessibleForFree: false,
      teaches: ['Artificial intelligence', 'Machine learning basics', 'Data literacy', 'Ethics in AI', 'Creative AI tools'],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How Kids Learn About AI',
      description: 'A structured path for children to understand and create with artificial intelligence.',
      step: [
        { '@type': 'HowToStep', name: 'Understand what AI is', text: 'Explore everyday examples of AI: voice assistants, recommendation systems, and image recognition.' },
        { '@type': 'HowToStep', name: 'Train a model', text: 'Use kid-friendly tools like Teachable Machine to train image, sound, and pose classifiers.' },
        { '@type': 'HowToStep', name: 'Build AI projects', text: 'Create AI-powered apps: smart sorting, voice control, or creative art generators.' },
        { '@type': 'HowToStep', name: 'Discuss AI ethics', text: 'Learn about bias, privacy, and responsible use of AI technology.' },
      ],
    },
  ];

  return (
    <>
      <SEO
        title={`AI for Kids | Artificial Intelligence Workshops | ${appName}`}
        description="Kids explore artificial intelligence and machine learning. Train models, build AI projects, and understand how AI works. Ages 8-17. UAE workshops available."
        keywords={['AI for kids', 'artificial intelligence children', 'machine learning kids', 'AI workshop UAE', 'kids technology', 'STEM AI courses']}
        breadcrumbs={breadcrumbs}
        structuredData={structuredData}
      />
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
        {/* Hero */}
        <section className="container mx-auto px-4 pt-16 pb-12 text-center">
          <span className="inline-block bg-purple-100 text-purple-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">Ages 8–17</span>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">AI for Kids</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Artificial intelligence is shaping every industry. Give kids a head start — they learn how AI works,
            train their own models, and build AI-powered projects in a safe, guided environment.
          </p>
          <Link
            to="/events?category=stem&search=ai"
            className="inline-flex items-center px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
          >
            Browse AI Workshops
          </Link>
        </section>

        {/* What Kids Learn */}
        <section className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">What Kids Learn</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { title: 'How AI Works', desc: 'Understand the basics: data, patterns, predictions, and how machines learn from examples.' },
              { title: 'Train Models', desc: 'Use visual tools to teach a computer to recognise images, sounds, and gestures.' },
              { title: 'Build AI Projects', desc: 'Create smart apps: sorting systems, creative art generators, and voice-controlled projects.' },
              { title: 'AI Ethics', desc: 'Discuss bias, fairness, privacy, and responsible use of artificial intelligence.' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tools & Platforms */}
        <section className="bg-white py-12">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Kid-Friendly AI Tools</h2>
            <ul className="space-y-4 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-purple-500 mt-1 font-bold">1.</span>
                <span><strong>Google Teachable Machine</strong> — Train image, sound, and pose classifiers with no code.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-500 mt-1 font-bold">2.</span>
                <span><strong>Machine Learning for Kids</strong> — Build ML projects that connect to Scratch and App Inventor.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-500 mt-1 font-bold">3.</span>
                <span><strong>AI Experiments by Google</strong> — Explore interactive demos of drawing, music, and language AI.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-500 mt-1 font-bold">4.</span>
                <span><strong>Python + scikit-learn</strong> — For older kids ready to write real ML code with real datasets.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Explore the Future of Technology</h2>
          <p className="text-gray-600 mb-8 max-w-lg mx-auto">
            Find AI and machine learning workshops for kids in the UAE.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/events?category=stem&search=ai"
              className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
            >
              Find AI Classes
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

export default LearnAIForKidsPage;
