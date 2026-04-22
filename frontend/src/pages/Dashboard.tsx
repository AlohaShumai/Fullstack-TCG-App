import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface FeaturedCard {
  id: string;
  name: string;
  supertype: string;
  types: string[];
  setName: string;
  imageSmall: string;
  imageLarge?: string;
}

interface DashboardStats {
  totalCards: number;
  collectionsCount: number;
  decksCount: number;
  uniquePokemon: number;
  cardsByType: { pokemon: number; trainer: number; energy: number };
  decks: Array<{ id: string; name: string; format: string; cardCount: number }>;
  featuredCards: FeaturedCard[];
}

interface NewsArticle {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate?: string;
}

interface TournamentEvent {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface PortfolioData {
  currentValue: number;
  history: { date: string; value: number }[];
}

const cardShadow = '0 4px 6px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)';

const sectionHeaderStyle: React.CSSProperties = {
  borderBottom: '2px solid #6366f1',
  paddingBottom: '8px',
  marginBottom: '12px',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [events, setEvents] = useState<TournamentEvent[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [statsLoading, setStatsLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [newsIndex, setNewsIndex] = useState(0);
  const [newsFade, setNewsFade] = useState(true);
  const [visible, setVisible] = useState(false);
  const [featuredCardOpen, setFeaturedCardOpen] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [featuredFade, setFeaturedFade] = useState(true);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const goToNews = (index: number) => {
    setNewsFade(false);
    setTimeout(() => {
      setNewsIndex(index);
      setNewsFade(true);
    }, 250);
  };

  // Auto-rotate featured card every 5 seconds with fade
  useEffect(() => {
    if (!stats?.featuredCards || stats.featuredCards.length <= 1) return;
    const timer = setInterval(() => {
      setFeaturedFade(false);
      setTimeout(() => {
        setFeaturedIndex((i) => (i + 1) % stats.featuredCards.length);
        setFeaturedFade(true);
      }, 300);
    }, 5000);
    return () => clearInterval(timer);
  }, [stats?.featuredCards]);

  // Auto-rotate news every 4 seconds with fade
  useEffect(() => {
    if (news.length <= 1) return;
    const timer = setInterval(() => {
      setNewsFade(false);
      setTimeout(() => {
        setNewsIndex((i) => (i + 1) % news.length);
        setNewsFade(true);
      }, 250);
    }, 4000);
    return () => clearInterval(timer);
  }, [news.length]);

  useEffect(() => {

    api.get('/users/me/portfolio')
      .then((res) => setPortfolio(res.data))
      .catch(() => {})
      .finally(() => setPortfolioLoading(false));

    api.get('/dashboard/stats')
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));

    api.get('/dashboard/news')
      .then((res) => setNews(res.data))
      .catch(() => {})
      .finally(() => setNewsLoading(false));

    api.get('/dashboard/events')
      .then((res) => setEvents(res.data))
      .catch(() => {})
      .finally(() => setEventsLoading(false));

    api
      .post('/ai/chat', {
        message: 'Based on my collection, give me one short deck building tip in 2-3 sentences.',
        history: [],
      })
      .then((res) => setAiSuggestion(res.data.response ?? ''))
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, []);

  const totalTypeCards = stats
    ? stats.cardsByType.pokemon + stats.cardsByType.trainer + stats.cardsByType.energy
    : 0;

  const typeBarPct = (count: number) =>
    totalTypeCards > 0 ? `${Math.round((count / totalTypeCards) * 100)}%` : '0%';

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };


  return (
    <div className="flex-1 min-h-0 overflow-y-auto">

      <div
        className="container mx-auto p-4 sm:p-6"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6">
          Welcome, {user?.username ?? 'Trainer'}
        </h1>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Cards',    value: statsLoading ? '—' : (stats?.totalCards ?? 0).toLocaleString(), accent: '#6366f1', bg: 'linear-gradient(135deg, #1e1b4b 0%, #16143a 100%)' },
            { label: 'Collections',   value: statsLoading ? '—' : String(stats?.collectionsCount ?? 0),        accent: '#6366f1', bg: 'linear-gradient(135deg, #1e1b4b 0%, #16143a 100%)' },
            { label: 'Decks',         value: statsLoading ? '—' : String(stats?.decksCount ?? 0),              accent: '#6366f1', bg: 'linear-gradient(135deg, #1e1b4b 0%, #16143a 100%)' },
            { label: 'Unique Pokémon',value: statsLoading ? '—' : String(stats?.uniquePokemon ?? 0),           accent: '#6366f1', bg: 'linear-gradient(135deg, #1e1b4b 0%, #16143a 100%)' },
          ].map(({ label, value, accent, bg }) => (
            <div
              key={label}
              className="rounded-lg p-4"
              style={{
                background: bg,
                borderLeft: `4px solid ${accent}`,
                boxShadow: cardShadow,
              }}
            >
              <p className="text-slate-400 text-sm">{label}</p>
              <p className="text-2xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Portfolio Value */}
        {(() => {
          const history = portfolio?.history ?? [];
          const validHistory = history.filter((p) => p.value > 0);
          const first = history[0]?.value ?? 0;
          const last = history[history.length - 1]?.value ?? 0;
          const change = first > 0 ? ((last - first) / first) * 100 : null;
          const changePos = change !== null && change >= 0;

          return (
            <div
              className="bg-slate-800 rounded-lg p-4 mb-8"
              style={{ boxShadow: cardShadow }}
            >
              <h2 className="text-lg font-bold text-white mb-4" style={sectionHeaderStyle}>
                Portfolio Value
              </h2>
              {portfolioLoading ? (
                <p className="text-slate-500 text-sm animate-pulse">Loading portfolio...</p>
              ) : (
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <div className="flex-shrink-0">
                    <p className={`text-3xl font-bold ${(portfolio?.currentValue ?? 0) > 0 ? 'text-white' : 'text-slate-400'}`}>
                      ${(portfolio?.currentValue ?? 0).toFixed(2)}
                    </p>
                    {(portfolio?.currentValue ?? 0) === 0 && (
                      <p className="text-slate-500 text-xs mt-1">No price data yet</p>
                    )}
                    {change !== null ? (
                      <p className={`text-sm font-medium mt-1 ${changePos ? 'text-emerald-400' : 'text-red-400'}`}>
                        {changePos ? '▲' : '▼'} {Math.abs(change).toFixed(1)}% (30d)
                      </p>
                    ) : (
                      <p className="text-slate-500 text-sm mt-1">— 30d change</p>
                    )}
                  </div>
                  <div className="flex-1 w-full" style={{ minWidth: 0 }}>
                    {validHistory.length >= 2 ? (
                      <ResponsiveContainer width="100%" height={100}>
                        <LineChart data={history}>
                          <XAxis dataKey="date" hide />
                          <YAxis hide domain={['auto', 'auto']} />
                          <Tooltip
                            formatter={(value: ValueType | undefined) => {
                              const num = typeof value === 'number' ? value : 0;
                              return [`$${num.toFixed(2)}`, 'Value'];
                            }}
                            labelFormatter={(label) => `Date: ${label}`}
                            contentStyle={{ background: '#1e293b', border: 'none', fontSize: 12 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={changePos ? '#34d399' : '#f87171'}
                            dot={false}
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-slate-500 text-sm pt-2">
                        Price history will appear after daily price syncs have run for a few days.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Three Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* TCG News */}
          <div
            className="bg-slate-800 rounded-lg p-4 flex flex-col"
            style={{ boxShadow: cardShadow }}
          >
            <h2 className="text-lg font-bold text-white" style={sectionHeaderStyle}>
              TCG News
            </h2>
            {newsLoading ? (
              <p className="text-slate-500 text-sm animate-pulse">Loading news...</p>
            ) : news.length === 0 ? (
              <p className="text-slate-500 text-sm">No news available.</p>
            ) : (() => {
              const article = news[newsIndex];
              const date = formatDate(article.publishedDate);
              return (
                <div className="flex flex-col flex-1">
                  {/* Article content with fade */}
                  <div
                    className="bg-slate-700 rounded-lg p-3 flex-1"
                    style={{
                      opacity: newsFade ? 1 : 0,
                      transition: 'opacity 0.25s ease',
                    }}
                  >
                    <p className="text-indigo-400 text-sm font-semibold leading-snug mb-2">
                      {article.title}
                    </p>
                    <p className="text-slate-300 text-xs leading-relaxed mb-3">
                      {article.snippet}
                    </p>
                    <div
                      className="flex items-center justify-between pt-2"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <p className="text-slate-500 text-xs">
                        {article.source}{date ? ` • ${date}` : ''}
                      </p>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 text-xs font-medium transition"
                      >
                        View full article →
                      </a>
                    </div>
                  </div>

                  {/* Pagination pinned to bottom */}
                  <div className="flex items-center justify-between mt-3">
                    <button
                      onClick={() => goToNews((newsIndex - 1 + news.length) % news.length)}
                      className="text-slate-400 hover:text-white text-sm px-2 py-1 transition"
                    >
                      ← Prev
                    </button>
                    <span className="text-slate-600 text-xs">{newsIndex + 1} / {news.length}</span>
                    <button
                      onClick={() => goToNews((newsIndex + 1) % news.length)}
                      className="text-slate-400 hover:text-white text-sm px-2 py-1 transition"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Upcoming Events */}
          <div
            className="bg-slate-800 rounded-lg p-4"
            style={{ boxShadow: cardShadow }}
          >
            <h2 className="text-lg font-bold text-white" style={{ ...sectionHeaderStyle, borderBottomColor: '#6366f1' }}>
              Upcoming Events
            </h2>
            {eventsLoading ? (
              <p className="text-slate-500 text-sm animate-pulse">Loading events...</p>
            ) : events.length === 0 ? (
              <p className="text-slate-500 text-sm">No events available.</p>
            ) : (
              <div className="space-y-4">
                {events.map((event, i) => (
                  <div key={i} className="border-l-2 border-yellow-500 pl-3">
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-yellow-400 text-sm font-medium block leading-snug transition"
                    >
                      {event.title}
                    </a>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">{event.snippet}</p>
                    <p className="text-slate-600 text-xs mt-1">{event.source}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div
            className="bg-slate-800 rounded-lg p-4"
            style={{ boxShadow: cardShadow }}
          >
            <h2 className="text-lg font-bold text-white" style={{ ...sectionHeaderStyle, borderBottomColor: '#6366f1' }}>
              Quick Actions
            </h2>
            <div className="space-y-3">
              {[
                {
                  to: '/cards',
                  label: 'Browse Cards',
                  sub: 'Search the card database',
                  badge: 'DB',
                  bg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  subColor: '#c7d2fe',
                },
                {
                  to: '/decks',
                  label: 'Build a Deck',
                  sub: 'Create or manage decks',
                  badge: 'DK',
                  bg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  subColor: '#c7d2fe',
                },
                {
                  to: '/advisor',
                  label: 'Ask Professor AI',
                  sub: 'Get deck building advice',
                  badge: 'AI',
                  bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  subColor: '#ddd6fe',
                },
              ].map(({ to, label, sub, badge, bg, subColor }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 text-white rounded-lg p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ background: bg, boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                >
                  <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold bg-white/20">
                    {badge}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs" style={{ color: subColor }}>{sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Featured Card */}
          <div
            className="bg-slate-800 rounded-lg p-4 flex flex-col"
            style={{ boxShadow: cardShadow }}
          >
            <h2 className="text-lg font-bold text-white" style={sectionHeaderStyle}>
              Featured Card
            </h2>
            {statsLoading ? (
              <p className="text-slate-500 text-sm animate-pulse">Loading...</p>
            ) : stats?.featuredCards?.length ? (
              (() => {
                const card = stats.featuredCards[featuredIndex];
                return (
                  <div
                    className="flex-1 flex flex-col items-center"
                    style={{ opacity: featuredFade ? 1 : 0, transition: 'opacity 0.3s ease' }}
                  >
                    <img
                      src={card.imageSmall}
                      alt={card.name}
                      className="w-full max-w-[160px] rounded-lg mb-3 cursor-pointer hover:scale-110 transition-all duration-300"
                      style={{ boxShadow: '0 0 20px rgba(255,255,255,0.3)' }}
                      onClick={() => setFeaturedCardOpen(true)}
                      onError={(e) => { (e.target as HTMLImageElement).src = '/card-placeholder.svg'; }}
                    />
                    <p className="text-white text-sm font-semibold text-center">{card.name}</p>
                    <p className="text-slate-400 text-xs text-center mt-0.5">
                      {card.supertype}
                      {card.types?.length ? ` · ${card.types.join('/')}` : ''}
                    </p>
                    <p className="text-slate-600 text-xs text-center mt-0.5">{card.setName}</p>
                  </div>
                );
              })()
            ) : (
              <p className="text-slate-500 text-sm">
                Add cards to your collection to see a featured card.
              </p>
            )}
          </div>

          {/* Your Decks */}
          <div
            className="bg-slate-800 rounded-lg p-4"
            style={{ boxShadow: cardShadow }}
          >
            <div className="flex items-center justify-between" style={sectionHeaderStyle}>
              <h2 className="text-lg font-bold text-white">Your Decks</h2>
              <Link to="/decks" className="text-indigo-400 hover:text-indigo-300 text-sm transition">
                View all
              </Link>
            </div>
            {statsLoading ? (
              <p className="text-slate-500 text-sm animate-pulse">Loading decks...</p>
            ) : !stats?.decks.length ? (
              <p className="text-slate-500 text-sm mb-4">No decks yet.</p>
            ) : (
              <div className="space-y-4 mb-4">
                {stats.decks.slice(0, 5).map((deck) => {
                  const pct = Math.min(Math.round((deck.cardCount / 60) * 100), 100);
                  return (
                    <div key={deck.id}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-white text-sm font-medium truncate max-w-[65%]">
                          {deck.name}
                        </span>
                        <span className="text-slate-400 text-xs">{deck.cardCount}/60</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-slate-600 text-xs capitalize">{deck.format}</span>
                        <Link
                          to={`/decks/${deck.id}`}
                          className="text-indigo-400 hover:text-indigo-300 text-xs transition"
                        >
                          Edit →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Link
              to="/decks"
              className="block w-full text-center text-white rounded-lg py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
            >
              + Create New Deck
            </Link>
          </div>

          {/* Collection Breakdown */}
          <div
            className="bg-slate-800 rounded-lg p-4"
            style={{ boxShadow: cardShadow }}
          >
            <h2 className="text-lg font-bold text-white" style={{ ...sectionHeaderStyle, borderBottomColor: '#6366f1' }}>
              Collection Breakdown
            </h2>
            {statsLoading ? (
              <p className="text-slate-500 text-sm animate-pulse">Loading...</p>
            ) : totalTypeCards === 0 ? (
              <p className="text-slate-500 text-sm">Add cards to your collection to see the breakdown.</p>
            ) : (
              <div className="space-y-5">
                {[
                  { label: 'Pokémon', count: stats!.cardsByType.pokemon, color: 'bg-red-500' },
                  { label: 'Trainer', count: stats!.cardsByType.trainer, color: 'bg-blue-500' },
                  { label: 'Energy',  count: stats!.cardsByType.energy,  color: 'bg-yellow-500' },
                ].map(({ label, count, color }) => (
                  <div key={label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-300 text-sm">{label}</span>
                      <span className="text-slate-400 text-sm">
                        {count.toLocaleString()} ({typeBarPct(count)})
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3">
                      <div
                        className={`${color} h-3 rounded-full transition-all duration-500`}
                        style={{ width: typeBarPct(count) }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-slate-600 text-xs pt-1">
                  Total owned: {totalTypeCards.toLocaleString()} cards
                </p>
              </div>
            )}
          </div>

          {/* AI Suggestion */}
          <div
            className="bg-slate-800 rounded-lg p-4 flex flex-col"
            style={{ boxShadow: cardShadow }}
          >
            <div className="flex items-center gap-2" style={sectionHeaderStyle}>
              <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-black"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: 'white' }}>
                AI
              </div>
              <h2 className="text-lg font-bold text-white">Professor AI</h2>
            </div>
            {aiLoading ? (
              <p className="text-slate-500 text-sm animate-pulse flex-1">Analyzing your collection...</p>
            ) : aiSuggestion ? (
              <div className="flex-1 flex flex-col">
                <p className="text-slate-300 text-sm leading-relaxed flex-1">{aiSuggestion}</p>
                <Link
                  to="/advisor"
                  className="mt-4 block w-full text-center text-white rounded-lg py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                >
                  Ask for more details →
                </Link>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <p className="text-slate-500 text-sm flex-1">
                  Add cards to your collection for personalized advice.
                </p>
                <Link
                  to="/advisor"
                  className="mt-4 block w-full text-center text-white rounded-lg py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                >
                  Open AI Advisor →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Featured card image modal — outside the transformed container so fixed works correctly */}
      {featuredCardOpen && stats?.featuredCards?.length && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm overflow-y-auto z-50"
          style={{ animation: 'modalFadeIn 0.2s ease-out' }}
          onClick={() => setFeaturedCardOpen(false)}
        >
          <div className="flex min-h-full items-center justify-center p-6">
            <img
              src={stats.featuredCards[featuredIndex].imageLarge ?? stats.featuredCards[featuredIndex].imageSmall}
              alt={stats.featuredCards[featuredIndex].name}
              className="rounded-xl max-h-[85vh] w-auto"
              onError={(e) => { (e.target as HTMLImageElement).src = '/card-placeholder.svg'; }}
              style={{
                boxShadow: '0 0 60px rgba(255,255,255,0.25)',
                animation: 'modalSlideIn 0.25s ease-out',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
