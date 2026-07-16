import React from 'react';

const HomeSkeleton: React.FC = () => (
    <div className="w-full bg-gray-50 animate-pulse">
        {/* Banner Skeleton — height matches BannerCarousel.tsx's keen-slider container exactly to prevent CLS */}
        <div className="w-full aspect-[16/9] sm:aspect-auto sm:h-[55vh] md:h-[65vh] lg:h-[70vh] max-h-[800px] bg-gradient-to-br from-gray-200 to-gray-300 relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-6 bg-gray-300 rounded-full"></div>
                <div className="w-80 h-12 bg-gray-300 rounded"></div>
                <div className="w-64 h-4 bg-gray-300 rounded"></div>
                <div className="w-96 h-12 bg-gray-300 rounded-lg"></div>
            </div>
        </div>

        {/* Featured Events Skeleton */}
        <div className="max-w-screen-xl mx-auto px-6 py-16">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <div className="w-20 h-6 bg-gray-200 rounded-full mb-4"></div>
                    <div className="w-48 h-8 bg-gray-200 rounded mb-2"></div>
                    <div className="w-64 h-4 bg-gray-200 rounded"></div>
                </div>
                <div className="w-32 h-6 bg-gray-200 rounded"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden">
                        <div className="w-full h-80 bg-gray-200"></div>
                        <div className="p-6 space-y-3">
                            <div className="w-3/4 h-6 bg-gray-200 rounded"></div>
                            <div className="w-full h-4 bg-gray-200 rounded"></div>
                            <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
                            <div className="flex justify-between items-center mt-4">
                                <div className="w-24 h-4 bg-gray-200 rounded"></div>
                                <div className="w-20 h-8 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Stats Skeleton */}
        <div className="w-full py-16 bg-gray-100">
            <div className="max-w-6xl mx-auto px-6">
                <div className="text-center mb-12">
                    <div className="w-24 h-6 bg-gray-200 rounded-full mx-auto mb-4"></div>
                    <div className="w-64 h-8 bg-gray-200 rounded mx-auto mb-4"></div>
                    <div className="w-96 h-4 bg-gray-200 rounded mx-auto"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white rounded-xl shadow-md p-6 text-center">
                            <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-4"></div>
                            <div className="w-16 h-8 bg-gray-200 rounded mx-auto mb-2"></div>
                            <div className="w-20 h-4 bg-gray-200 rounded mx-auto"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

export default HomeSkeleton;
