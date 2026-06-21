import React from 'react';
import {
  FaTrophy,
  FaGraduationCap,
  FaFire,
  FaGlobeAmericas,
  FaCheckCircle,
  FaMicrophone
} from 'react-icons/fa';

export interface Benefit {
  icon: React.ReactNode;
  title: string;
  description: string;
  glowClass: string;
  iconBgClass: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface WorkshopCard {
  title: string;
  category: string;
  image: string;
  grades: string;
  duration: string;
  themeColor: string;
  bgColor: string;
  textColor: string;
}

export const BENEFITS: Benefit[] = [
  {
    icon: <FaTrophy className="text-2xl text-amber-600" />,
    title: 'Certificates & Awards',
    description: 'Earn recognized credentials and awards that showcase your achievements.',
    glowClass: 'shadow-amber-500/10 hover:shadow-amber-500/20 border-amber-100',
    iconBgClass: 'bg-amber-50',
  },
  {
    icon: <FaGraduationCap className="text-2xl text-indigo-650" />,
    title: 'University Exposure',
    description: 'Get visible to admissions and learn skills top global universities care about.',
    glowClass: 'shadow-indigo-500/10 hover:shadow-indigo-500/20 border-indigo-100',
    iconBgClass: 'bg-indigo-50',
  },
  {
    icon: <FaFire className="text-2xl text-rose-500" />,
    title: 'Real Practical Skills',
    description: 'Bridge the gap between school curriculum and career-ready applications.',
    glowClass: 'shadow-rose-500/10 hover:shadow-rose-500/20 border-rose-100',
    iconBgClass: 'bg-rose-50',
  },
  {
    icon: <FaGlobeAmericas className="text-2xl text-emerald-500" />,
    title: 'Compete Globally',
    description: 'Challenge your peers from schools across the region in joint cohorts.',
    glowClass: 'shadow-emerald-500/10 hover:shadow-emerald-500/20 border-emerald-100',
    iconBgClass: 'bg-emerald-50',
  },
  {
    icon: <FaCheckCircle className="text-2xl text-teal-500" />,
    title: 'Build Your Portfolio',
    description: 'Collate your hands-on class projects into a public portfolio builder.',
    glowClass: 'shadow-teal-500/10 hover:shadow-teal-500/20 border-teal-100',
    iconBgClass: 'bg-teal-50',
  },
  {
    icon: <FaMicrophone className="text-2xl text-purple-500" />,
    title: 'Public Presentation',
    description: 'Grow your leadership, teamwork, public speaking, and confidence levels.',
    glowClass: 'shadow-purple-500/10 hover:shadow-purple-500/20 border-purple-100',
    iconBgClass: 'bg-purple-50',
  },
];

export const FAQS: FAQItem[] = [
  {
    question: 'Who can participate?',
    answer: 'Students from Grades 6–12 from any school or background. No prior experience needed!',
  },
  {
    question: 'Is it online or offline?',
    answer: 'It starts online—you compete from anywhere. Top performers get invited to exclusive campus finals where you present in person.',
  },
  {
    question: 'Do I need prior experience?',
    answer: 'No! Beginners are welcome. We provide workshops and mentorship to help you grow.',
  },
  {
    question: 'Will I get a certificate?',
    answer: 'Yes! All participants receive certificates. Top performers get awards and special recognition.',
  },
  {
    question: 'How much does it cost?',
    answer: 'Registration is completely FREE. All resources and workshops are provided at no cost.',
  },
  {
    question: 'Can my school participate?',
    answer: 'Absolutely! Schools can register multiple students. We provide support and resources to help your school excel.',
  },
];

export const WORKSHOPS_DATA: WorkshopCard[] = [
  {
    title: 'Advanced Algebra',
    category: 'Mathematics',
    image: '/assets/images/comingjuly26/algebra.jpeg',
    grades: 'Grades 8-12',
    duration: '4 Weeks',
    themeColor: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50 text-amber-700 border-amber-200',
    textColor: 'text-amber-700',
  },
  {
    title: 'Fun Chemistry Experiments',
    category: 'Science',
    image: '/assets/images/comingjuly26/chemistry.jpeg',
    grades: 'Grades 6-9',
    duration: '3 Weeks',
    themeColor: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-50 text-blue-700 border-blue-200',
    textColor: 'text-blue-700',
  },
  {
    title: 'Creative Sketching & Drawing',
    category: 'Creative Arts',
    image: '/assets/images/comingjuly26/sketching.jpeg',
    grades: 'Grades 6-12',
    duration: '6 Weeks',
    themeColor: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50 text-purple-700 border-purple-200',
    textColor: 'text-purple-700',
  },
  {
    title: 'Weekly Fine Art Cohort',
    category: 'Creative Arts',
    image: '/assets/images/comingjuly26/art.jpeg',
    grades: 'Grades 7-12',
    duration: 'Ongoing',
    themeColor: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-50 text-pink-700 border-pink-200',
    textColor: 'text-pink-700',
  },
  {
    title: 'Cursive & Beautiful Writing',
    category: 'Academics',
    image: '/assets/images/comingjuly26/cursive.jpeg',
    grades: 'Grades 6-8',
    duration: '2 Weeks',
    themeColor: 'from-teal-500 to-emerald-500',
    bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    textColor: 'text-emerald-700',
  },
  {
    title: 'Introduction to Biology',
    category: 'Science',
    image: '/assets/images/comingjuly26/biology.jpeg',
    grades: 'Grades 9-12',
    duration: '4 Weeks',
    themeColor: 'from-emerald-500 to-green-500',
    bgColor: 'bg-green-50 text-green-700 border-green-200',
    textColor: 'text-green-700',
  },
];
