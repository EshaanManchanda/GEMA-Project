import React from 'react';
import { motion } from 'framer-motion';

interface TeacherStatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  color?: 'purple' | 'blue' | 'green' | 'orange' | 'pink' | 'indigo';
  onClick?: () => void;
}

const colorClasses = {
  purple: {
    bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    light: 'bg-purple-100',
    text: 'text-purple-600',
    shadow: 'shadow-purple-500/25',
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    light: 'bg-blue-100',
    text: 'text-blue-600',
    shadow: 'shadow-blue-500/25',
  },
  green: {
    bg: 'bg-gradient-to-br from-green-500 to-green-600',
    light: 'bg-green-100',
    text: 'text-green-600',
    shadow: 'shadow-green-500/25',
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-500 to-orange-600',
    light: 'bg-orange-100',
    text: 'text-orange-600',
    shadow: 'shadow-orange-500/25',
  },
  pink: {
    bg: 'bg-gradient-to-br from-pink-500 to-pink-600',
    light: 'bg-pink-100',
    text: 'text-pink-600',
    shadow: 'shadow-pink-500/25',
  },
  indigo: {
    bg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    light: 'bg-indigo-100',
    text: 'text-indigo-600',
    shadow: 'shadow-indigo-500/25',
  },
};

const TeacherStatsCard: React.FC<TeacherStatsCardProps> = ({
  title,
  value,
  icon,
  trend,
  subtitle,
  color = 'purple',
  onClick,
}) => {
  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className={`relative overflow-hidden bg-white rounded-2xl shadow-lg ${colors.shadow} p-6 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 opacity-10">
        <div className={`w-full h-full rounded-full ${colors.bg}`} />
      </div>

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <div className="mt-2 flex items-baseline">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {trend && (
              <span
                className={`ml-2 text-sm font-medium ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? '+' : '-'}
                {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>

        <div className={`p-3 rounded-xl ${colors.bg} text-white shadow-lg ${colors.shadow}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
};

export default TeacherStatsCard;
