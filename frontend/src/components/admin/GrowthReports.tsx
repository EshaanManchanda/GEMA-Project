import React from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { useTrafficReportQuery } from '@/hooks/queries/useAdminQuery';

/* eslint-disable @typescript-eslint/no-explicit-any -- report rows are plain JSON tables */
type Row = Record<string, any>;

export type GrowthTab = 'acquisition' | 'funnel' | 'behaviour' | 'content' | 'events' | 'organisers';

const CHANNEL_LABELS: Record<string, string> = {
  paid: 'Paid ads',
  organic_search: 'Google / organic search',
  social: 'Social media',
  whatsapp: 'WhatsApp',
  email: 'Email',
  referral: 'Referral',
  direct: 'Direct',
  unknown: 'Unknown',
};

const fmt = (n: number | undefined) => (n ?? 0).toLocaleString();

// Search terms / campaign names come from anonymous visitors: stop spreadsheets
// from evaluating a cell like "=HYPERLINK(...)" as a formula.
const csvCell = (v: unknown) => {
  let s = String(v ?? '');
  if (typeof v !== 'number' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

const toCsv = (rows: Row[], cols: Col[]) =>
  [cols.map((c) => c.label), ...rows.map((r) => cols.map((c) => r[c.key]))]
    .map((line) => line.map(csvCell).join(','))
    .join('\n');

const download = (name: string, csv: string) => {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `${name}.csv` });
  a.click();
  URL.revokeObjectURL(url);
};

interface Col {
  key: string;
  label: string;
  num?: boolean;
  render?: (r: Row) => React.ReactNode;
}

const Card: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; csv?: { name: string; rows: Row[]; cols: Col[] } }> = ({
  title,
  subtitle,
  children,
  csv,
}) => (
  <section className="bg-white rounded-xl border border-gray-200 p-5">
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {csv && csv.rows.length > 0 && (
        <button
          onClick={() => download(csv.name, toCsv(csv.rows, csv.cols))}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap"
        >
          Export CSV
        </button>
      )}
    </div>
    {children}
  </section>
);

const Table: React.FC<{ rows: Row[]; cols: Col[]; empty?: string }> = ({ rows, cols, empty = 'No data for this period yet.' }) =>
  rows.length === 0 ? (
    <p className="text-center text-gray-400 text-xs py-6">{empty}</p>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b">
            {cols.map((c) => (
              <th key={c.key} className={`py-2 pr-3 font-medium ${c.num ? 'text-right' : ''}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              {cols.map((c) => (
                <td key={c.key} className={`py-2 pr-3 text-gray-700 ${c.num ? 'text-right tabular-nums' : 'max-w-[260px] truncate'}`}>
                  {c.render ? c.render(r) : c.num ? fmt(r[c.key]) : String(r[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

/** Card + table + CSV export for one list of rows. */
const TableCard: React.FC<{ title: string; subtitle?: string; name: string; rows?: Row[]; cols: Col[]; empty?: string }> = ({
  title,
  subtitle,
  name,
  rows = [],
  cols,
  empty,
}) => (
  <Card title={title} subtitle={subtitle} csv={{ name, rows, cols }}>
    <Table rows={rows} cols={cols} empty={empty} />
  </Card>
);

const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4">
    <p className="text-xs font-medium text-gray-500">{label}</p>
    <p className="text-2xl font-bold text-gray-800 mt-1 tabular-nums">{value}</p>
    {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
  </div>
);

const barOptions = (horizontal = false) => ({
  indexAxis: horizontal ? ('y' as const) : ('x' as const),
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: { grid: { display: false } }, y: { grid: { display: false } } },
});

const channelName = (r: Row) => CHANNEL_LABELS[r.channel] ?? r.channel;
const pct = (n: number | undefined) => `${n ?? 0}%`;
const delta = (now: number, prev: number) => {
  if (!prev) return now ? 'new this period' : undefined;
  const d = Math.round(((now - prev) / prev) * 100);
  return `${d >= 0 ? '+' : ''}${d}% vs previous period`;
};

// ── Summary (shown on the Overview tab) ─────────────────────────────────────
export const GrowthSummary: React.FC<{ days: number }> = ({ days }) => {
  const { data, isLoading } = useTrafficReportQuery<Row>('summary', days);
  if (isLoading || !data) return <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />;
  const t = data.totals;
  const p = data.previous;
  const monthly: Row[] = data.monthly ?? [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Unique visitors" value={fmt(t.visitors)} hint={delta(t.visitors, p.visitors)} />
        <Stat label="New / returning" value={`${fmt(t.newVisitors)} / ${fmt(t.returningVisitors)}`} hint="Visitors seen for the first time vs before" />
        <Stat label="Pages per session" value={t.pagesPerSession} hint={`${fmt(t.sessions)} sessions`} />
        <Stat label="Avg. engaged time" value={`${t.avgEngagementSec}s`} hint="Visible time per session" />
        <Stat label="Registrations" value={fmt(t.registrations)} hint={delta(t.registrations, p.registrations)} />
        <Stat label="Visitor → sign-up" value={t.visitors ? `${((t.registrations / t.visitors) * 100).toFixed(1)}%` : '—'} />
        <Stat label="Top browser" value={data.byBrowser?.[0]?.key ?? '—'} />
        <Stat label="Top OS" value={data.byOs?.[0]?.key ?? '—'} />
      </div>
      {monthly.length > 1 && (
        <Card title="Monthly unique visitors" subtitle="Kept beyond the 90-day raw window by the nightly rollup">
          <div className="h-56">
            <Line
              data={{
                labels: monthly.map((m) => new Date(m.start).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })),
                datasets: [
                  { label: 'Visitors', data: monthly.map((m) => m.visitors), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.1)', fill: true, tension: 0.3 },
                  { label: 'Registrations', data: monthly.map((m) => m.registrations), borderColor: '#16a34a', tension: 0.3 },
                ],
              }}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } } }}
            />
          </div>
        </Card>
      )}
    </div>
  );
};

// ── Tabs ────────────────────────────────────────────────────────────────────
const Acquisition: React.FC<{ d: Row }> = ({ d }) => {
  const channels: Row[] = d.channels ?? [];
  return (
    <>
      <Card title="Visitors by source">
        {channels.length ? (
          <div className="h-64">
            <Bar
              data={{ labels: channels.map(channelName), datasets: [{ data: channels.map((c) => c.visitors), backgroundColor: '#3b82f6' }] }}
              options={barOptions(true)}
            />
          </div>
        ) : (
          <p className="text-center text-gray-400 text-xs py-6">No tracked visits yet.</p>
        )}
      </Card>
      <TableCard
        title="Sources → registrations"
        subtitle="Registrations use the first source a visitor arrived from"
        name="acquisition-channels"
        rows={channels.map((c) => ({ ...c, name: channelName(c) }))}
        cols={[
          { key: 'name', label: 'Source' },
          { key: 'visitors', label: 'Visitors', num: true },
          { key: 'newVisitors', label: 'New', num: true },
          { key: 'sessions', label: 'Sessions', num: true },
          { key: 'registrations', label: 'Registrations', num: true },
          { key: 'conversionRate', label: 'Conversion', num: true, render: (r) => pct(r.conversionRate) },
        ]}
      />
      <TableCard
        title="UTM campaigns"
        subtitle="Links tagged with utm_campaign"
        name="campaigns"
        rows={d.campaigns}
        empty="No tagged campaign links yet. Add ?utm_source=…&utm_medium=…&utm_campaign=… to shared links."
        cols={[
          { key: 'campaign', label: 'Campaign' },
          { key: 'source', label: 'Source' },
          { key: 'medium', label: 'Medium' },
          { key: 'visitors', label: 'Visitors', num: true },
          { key: 'sessions', label: 'Sessions', num: true },
          { key: 'registrations', label: 'Registrations', num: true },
        ]}
      />
    </>
  );
};

const Funnel: React.FC<{ d: Row }> = ({ d }) => {
  const steps: Row[] = d.steps ?? [];
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {steps.map((s, i) => (
          <Stat key={s.step} label={s.step} value={fmt(s.n)} hint={i ? `${s.ofPrevious}% of previous step` : undefined} />
        ))}
      </div>
      <Card title="Visitor → booking funnel" subtitle={`Checkout abandonment: ${d.checkoutAbandonmentRate ?? 0}%`}>
        <div className="h-64">
          <Bar
            data={{ labels: steps.map((s) => s.step), datasets: [{ data: steps.map((s) => s.n), backgroundColor: '#8b5cf6' }] }}
            options={barOptions(true)}
          />
        </div>
      </Card>
    </>
  );
};

const Behaviour: React.FC<{ d: Row }> = ({ d }) => (
  <>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <Stat label="Sessions that searched" value={fmt(d.searchSessions)} />
      <Stat label="Search → event opened" value={pct(d.searchToEventRate)} />
      <Stat label="Tracked actions" value={fmt((d.actions ?? []).reduce((s: number, a: Row) => s + a.n, 0))} />
    </div>
    <div className="grid md:grid-cols-2 gap-6">
      <TableCard title="Top searches" name="top-searches" rows={d.topSearches} cols={[{ key: 'query', label: 'Search' }, { key: 'n', label: 'Times', num: true }]} />
      <TableCard
        title="Searches with no results"
        subtitle="Demand Kidrove can't serve yet"
        name="zero-result-searches"
        rows={d.zeroResultSearches}
        cols={[{ key: 'query', label: 'Search' }, { key: 'n', label: 'Times', num: true }]}
      />
      <TableCard
        title="Filters used"
        name="filters"
        rows={d.filters}
        cols={[{ key: 'filter', label: 'Filter' }, { key: 'value', label: 'Value' }, { key: 'n', label: 'Times', num: true }]}
      />
      <TableCard
        title="Exit pages"
        subtitle="Last page of a session; bounces = one-page sessions"
        name="exit-pages"
        rows={d.exitPages}
        cols={[{ key: 'path', label: 'Page' }, { key: 'exits', label: 'Exits', num: true }, { key: 'bounces', label: 'Bounces', num: true }]}
      />
    </div>
    <TableCard title="Actions" name="actions" rows={d.actions} cols={[{ key: 'type', label: 'Action' }, { key: 'n', label: 'Count', num: true }]} />
  </>
);

const Content: React.FC<{ d: Row }> = ({ d }) => (
  <>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <Stat label="Published blogs" value={fmt(d.totalPublished)} />
      <Stat label="Blog → event sessions" value={fmt(d.blogToEventSessions)} hint="Read a blog, then opened an event" />
    </div>
    <TableCard
      title="Blogs"
      name="blogs"
      rows={d.blogs}
      cols={[
        { key: 'title', label: 'Blog' },
        { key: 'views', label: 'Views', num: true },
        { key: 'visitors', label: 'Visitors', num: true },
        { key: 'shares', label: 'Shares', num: true },
        { key: 'lifetimeViews', label: 'Lifetime views', num: true },
      ]}
    />
    <TableCard
      title="Blog landing pages"
      subtitle="Organic = arrived from a search engine"
      name="blog-pages"
      rows={d.landingPages}
      cols={[
        { key: 'path', label: 'Page' },
        { key: 'views', label: 'Views', num: true },
        { key: 'organic', label: 'Organic', num: true },
        { key: 'avgEngagementSec', label: 'Avg. time (s)', num: true },
      ]}
    />
  </>
);

const Events: React.FC<{ d: Row }> = ({ d }) => {
  const c = d.counts ?? {};
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Stat label="Listed events" value={fmt(c.total)} />
        <Stat label="Live" value={fmt(c.live)} />
        <Stat label="Upcoming" value={fmt(c.upcoming)} />
        <Stat label="Expired" value={fmt(c.expired)} />
        <Stat label="Live with zero views" value={fmt(d.zeroViewCount)} hint="In this period" />
      </div>
      <TableCard
        title="Top events"
        name="events"
        rows={d.topEvents}
        cols={[
          { key: 'title', label: 'Event' },
          { key: 'category', label: 'Category' },
          { key: 'views', label: 'Views', num: true },
          { key: 'bookingClicks', label: 'Book clicks', num: true },
          { key: 'bookings', label: 'Bookings', num: true },
          { key: 'shares', label: 'Shares', num: true },
          { key: 'favourites', label: 'Favourites', num: true },
        ]}
      />
      <div className="grid md:grid-cols-2 gap-6">
        <TableCard
          title="Categories"
          name="categories"
          rows={d.categories}
          cols={[
            { key: 'category', label: 'Category' },
            { key: 'events', label: 'Events', num: true },
            { key: 'views', label: 'Views', num: true },
            { key: 'bookings', label: 'Bookings', num: true },
          ]}
        />
        <TableCard title="Live events by city" name="cities" rows={d.byCity} cols={[{ key: 'city', label: 'City' }, { key: 'events', label: 'Events', num: true }]} />
      </div>
      <TableCard
        title="Live events with no views"
        name="zero-view-events"
        rows={d.zeroViewEvents}
        cols={[{ key: 'title', label: 'Event' }, { key: 'category', label: 'Category' }]}
      />
    </>
  );
};

const Organisers: React.FC<{ d: Row }> = ({ d }) => (
  <>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Stat label="Organisers" value={fmt(d.total)} />
      <Stat label="New this period" value={fmt(d.newInRange)} />
      <Stat label="Active" value={fmt(d.active)} hint="With a live listing" />
      <Stat label="Inactive" value={fmt(d.inactive)} />
    </div>
    <TableCard title="Listings created" name="listings" rows={d.listingsCreated} cols={[{ key: 'status', label: 'Status' }, { key: 'n', label: 'Listings', num: true }]} />
    <TableCard
      title="Organiser performance"
      name="organisers"
      rows={d.topOrganisers}
      cols={[
        { key: 'name', label: 'Organiser' },
        { key: 'totalEvents', label: 'Events', num: true },
        { key: 'views', label: 'Views', num: true },
        { key: 'bookingClicks', label: 'Book clicks', num: true },
        { key: 'profileClicks', label: 'Organiser profile clicks', num: true },
        { key: 'bookings', label: 'Bookings', num: true },
      ]}
    />
  </>
);

const TABS: Record<GrowthTab, React.FC<{ d: Row }>> = {
  acquisition: Acquisition,
  funnel: Funnel,
  behaviour: Behaviour,
  content: Content,
  events: Events,
  organisers: Organisers,
};

export const GrowthReport: React.FC<{ tab: GrowthTab; days: number }> = ({ tab, days }) => {
  const { data, isLoading, error } = useTrafficReportQuery<Row>(tab, days);
  if (isLoading) return <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />;
  if (error || !data) return <p className="text-sm text-red-600">Couldn't load this report.</p>;
  const View = TABS[tab];
  return (
    <div className="space-y-6">
      <View d={data} />
    </div>
  );
};
