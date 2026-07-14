import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Search } from 'lucide-react';
import eventsAPI from '@/services/api/eventsAPI';

const EXAMPLE_QUERIES = [
  'Free outdoor events in Dubai this weekend',
  'Art classes for ages 5-10 under 100',
  'Online events tomorrow',
];

/** Maps parsed AI-search filters onto the same URL params SearchPage reads. */
function buildSearchUrl(query: string, filters: Record<string, any>): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('q', filters.search);
  else if (query) params.set('q', query);
  if (filters.category) params.set('category', filters.category);
  if (filters.city) params.set('city', filters.city);
  if (filters.venueType) params.set('venueType', filters.venueType);
  if (filters.minPrice != null) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice != null) params.set('maxPrice', String(filters.maxPrice));
  if (filters.ageMin != null) params.set('ageMin', String(filters.ageMin));
  if (filters.ageMax != null) params.set('ageMax', String(filters.ageMax));
  if (filters.featured) params.set('featured', 'true');
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  return `/search?${params.toString()}`;
}

const AiEventFinder: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const runSearch = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const { filters } = await eventsAPI.aiSearch(trimmed);
      navigate(buildSearchUrl(trimmed, filters || {}));
    } catch {
      // Fall back to a plain keyword search rather than stranding the user
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-6 px-4 md:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-bold text-gray-900">Find an event, just describe it</h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. free outdoor events in Dubai this weekend"
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
            maxLength={300}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Finding…' : 'Find'}
          </button>
        </form>
        <div className="flex flex-wrap gap-2 mt-3">
          {EXAMPLE_QUERIES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setQuery(ex);
                runSearch(ex);
              }}
              className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AiEventFinder;
