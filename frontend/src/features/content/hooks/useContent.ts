import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import blogAPI from '@services/api/blogAPI';
import bannerAPI from '@services/api/bannerAPI';
import reelAPI from '@services/api/reelsAPI';

export function useBlogs(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['blogs', params],
    queryFn: () => blogAPI.getAllBlogs(params as any),
  });
}

export function useBlog(slug: string) {
  return useQuery({
    queryKey: ['blogs', slug],
    queryFn: () => blogAPI.getBlogBySlug(slug),
    enabled: !!slug,
  });
}

export function useFeaturedBlogs(limit?: number) {
  return useQuery({
    queryKey: ['blogs', 'featured'],
    queryFn: () => blogAPI.getFeaturedBlogs(limit),
  });
}

export function usePopularBlogs(limit?: number) {
  return useQuery({
    queryKey: ['blogs', 'popular'],
    queryFn: () => blogAPI.getPopularBlogs(limit),
  });
}

export function useBlogCategories() {
  return useQuery({
    queryKey: ['blogs', 'categories'],
    queryFn: () => blogAPI.getBlogCategories(),
  });
}

export function useLikeBlog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => blogAPI.likeBlog(slug),
    onSuccess: (_, slug) => qc.invalidateQueries({ queryKey: ['blogs', slug] }),
  });
}

export function useActiveBanners() {
  return useQuery({
    queryKey: ['banners', 'active'],
    queryFn: () => bannerAPI.getActiveBanners(),
  });
}

export function useReels(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['reels', params],
    queryFn: () => reelAPI.getPublicReels(params as any),
  });
}

export function useReel(id: string) {
  return useQuery({
    queryKey: ['reels', id],
    queryFn: () => reelAPI.getReelById(id),
    enabled: !!id,
  });
}

export function useToggleLikeReel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, increment }: { id: string; increment?: boolean }) =>
      reelAPI.toggleLike(id, increment),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['reels', id] }),
  });
}

export function useIncrementView() {
  return useMutation({
    mutationFn: (id: string) => reelAPI.incrementView(id),
  });
}
