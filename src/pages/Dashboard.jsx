import { useState, useEffect, useMemo } from 'react';
import db from '@/services/db';
import { Radar } from 'lucide-react';
import StatsCards from '@/components/StatsCards';
import FilterBar from '@/components/FilterBar';
import OpportunityTable from '@/components/OpportunityTable';
import QuickFilters from '@/components/QuickFilters';
import ClientList from '@/components/ClientList';
import RejectedCandidateTable from '@/components/RejectedCandidateTable';

const emptyFilters = {
  search: '', client: '', status: '', category: '', subreddit: '', location: '', state: '',
  intentMin: '', intentMax: '', dateFrom: '', dateTo: '',
};

export default function Dashboard() {
  const [tab, setTab] = useState('opportunities');
  const [opportunities, setOpportunities] = useState([]);
  const [clients, setClients] = useState([]);
  const [rejections, setRejections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [activeQuickFilters, setActiveQuickFilters] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [opps, cls, rejs] = await Promise.all([
        db.opportunities.list('-created_date', 500),
        db.clients.list(),
        db.rejections.list('-created_date', 200),
      ]);
      setOpportunities(opps);
      setClients(cls);
      setRejections(rejs);
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

  const toggleQuickFilter = (key) => {
    setActiveQuickFilters(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

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
      if (activeQuickFilters.includes('highIntent') && (o.intent_score || 0) < 80) return false;
      if (activeQuickFilters.includes('hasLocation') && !o.detected_location) return false;
      if (activeQuickFilters.includes('personalInjury')) {
        const cat = (o.detected_category || '').toLowerCase();
        if (!cat.includes('injury') && !cat.includes('legal') && !cat.includes('law')) return false;
      }
      if (activeQuickFilters.includes('dental')) {
        const cat = (o.detected_category || '').toLowerCase();
        if (!cat.includes('dental') && !cat.includes('dentist')) return false;
      }
      if (activeQuickFilters.includes('statusNew') && o.status !== 'new') return false;
      if (activeQuickFilters.includes('needsReview') && o.status !== 'reviewed') return false;
      return true;
    }).sort((a, b) => {
      const intentDiff = (b.intent_score || 0) - (a.intent_score || 0);
      if (intentDiff !== 0) return intentDiff;
      const dateDiff = new Date(b.created_date) - new Date(a.created_date);
      if (dateDiff !== 0) return dateDiff;
      const aEngagement = (a.reddit_score || 0) + (a.reddit_num_comments || 0);
      const bEngagement = (b.reddit_score || 0) + (b.reddit_num_comments || 0);
      return bEngagement - aEngagement;
    });
  }, [opportunities, filters, activeQuickFilters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-7 h-7 border-[2.5px] border-border border-t-accent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-[hsl(220,14%,98%)]/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Radar className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-foreground">LeadRadar</span>
          </div>
          <div className="flex items-center gap-1 p-0.5 bg-secondary rounded-xl">
            <button
              onClick={() => setTab('opportunities')}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                tab === 'opportunities' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Opportunities
            </button>
            <button
              onClick={() => setTab('clients')}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                tab === 'clients' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Clients
            </button>
            <button
              onClick={() => setTab('rejections')}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                tab === 'rejections' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Rejections
            </button>
          </div>
        </div>
      </header>

      {tab === 'opportunities' ? (
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-[28px] font-semibold text-foreground tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">{filtered.length} opportunities · sorted by priority</p>
            </div>
          </div>
          <StatsCards opportunities={opportunities} />
          <QuickFilters activeFilters={activeQuickFilters} onToggle={toggleQuickFilter} />
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
      ) : tab === 'clients' ? (
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-[28px] font-semibold text-foreground tracking-tight">Clients</h1>
          </div>
          <ClientList clients={clients} />
        </div>
      ) : (
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-[28px] font-semibold text-foreground tracking-tight">Rejected Candidates</h1>
            <p className="text-sm text-muted-foreground mt-1">{rejections.length} Stage 2 rejections · audit log for pipeline validation</p>
          </div>
          <RejectedCandidateTable items={rejections} />
        </div>
      )}
    </div>
  );
}