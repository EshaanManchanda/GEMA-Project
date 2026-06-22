import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getPublicReels, Reel } from '@/services/api/reelsAPI';
import ReelsFeed from '@/components/client/ReelsFeed';

const REELS_PER_PAGE = 10;

const ReelsPage: React.FC = () => {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['publicReels'],
    queryFn: ({ pageParam = 1 }) => getPublicReels({ page: pageParam, limit: REELS_PER_PAGE }),
    getNextPageParam: (lastPage) => {
      const pagination = lastPage?.data?.pagination;
      if (!pagination) return undefined;
      return pagination.page < pagination.pages ? pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const allReels: Reel[] = data?.pages.flatMap(page => page?.data?.reels || []) || [];

  if (isLoading) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white" />
      </div>
    );
  }

  if (allReels.length === 0) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🎬</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Reels Yet</h3>
          <p className="text-gray-400">Check back later for amazing content!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-black">
      <ReelsFeed
        reels={allReels}
        variant="feed"
        onReachEnd={hasNextPage ? () => fetchNextPage() : undefined}
        isLoadingMore={isFetchingNextPage}
      />
    </div>
  );
};

export default ReelsPage;
