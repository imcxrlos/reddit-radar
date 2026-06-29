import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import StatsCards from '@/components/StatsCards';
import FilterBar from '@/components/FilterBar';
import OpportunityTable from '@/components/OpportunityTable';

const emptyFilters = {
  search: '', client: '', status: '', category: '', subreddit: '', location: '', state: '',
  intentMin: '', intentMax: '', dateFrom: '', dateTo: '',
};

export default function Dashboard() {
  const [opportunities, setOpportunities] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [opps, cls] = await Promise.all([
        base44.entities.Opportunity.list('-created_date', 500),
        base44.entities.Client.list(),
      ]);
      setOpportunities(opps);
      setClients(cls);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const subreddits = useMemo(() => [...new Set(opportunities.map(o => o.subreddit).filter(Boolean))].sort(), [opportunities]);
  const categories = useMemo(() => [...new Set(opportunities.map(o => o.detected_category).filter(Boolean))].sort(), [opportunities]);
  const locations = useMemo(() => [...new Set(opportunities.map(o => o.detected_location).filter(Boolean))].sort(), [opportunities]);
  const states = useMemo(() => [...new Set(opportunities.map(o => o.detected_state).filter(Boolean))].sort(), [opportunities]);

  const filtered = useMemo(() => {
    return opportunities.filter(o => {
      if (filters.client && o.client_id !== filters.client) return false;
      if (filters.status && o.status !== filters.status) return false;
      if (filters.category && o.detected_category !== filters.category) return false;
      if (filters.subreddit && o.subreddit !== filters.subreddit) return false;
      if (filters.location && o.detected_location !== filters.location) return false;
      if (filters.state && o.detected_state !== filters.state) return false;
      if (filters.intentMin !== '' && (o.intent_score || 0) < Number(filters.intentMin)) return false;
      if (filters.intentMax !== '' && (o.intent_score || 0) > Number(filters.intentMax)) return false;
      if (filters.dateFrom && new Date(o.created_date) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(o.created_date) > new Date(filters.dateTo + 'T23:59:59')) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const haystack = `${o.reddit_title || ''} ${o.ai_summary || ''} ${o.reddit_body || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      const dc = new Date(b.created_date) - new Date(a.created_date);
      if (dc !== 0) return dc;
      return (b.intent_score || 0) - (a.intent_score || 0);
    });
  }, [opportunities, filters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} opportunities found</p>
        </div>
      </div>
      <StatsCards opportunities={opportunities} />
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        clients={clients}
        subreddits={subreddits}
        categories={categories}
        locations={locations}
        states={states}
      />
      <OpportunityTable opportunities={filtered} />
    </div>
  );
}