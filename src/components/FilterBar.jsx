import { useState, useRef, useEffect } from 'react';
import { Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react';

const selectCls = "px-3.5 py-2.5 border border-border rounded-xl text-sm bg-card text-foreground cursor-pointer hover:border-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-accent/15 transition-colors";
const inputCls = "px-3.5 py-2.5 border border-border rounded-xl text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-accent/15 transition-all placeholder:text-muted-foreground/50";
const clearFilters = { search: '', client: '', status: '', category: '', subreddit: '', location: '', state: '', intentMin: '', intentMax: '', dateFrom: '', dateTo: '' };

export default function FilterBar({ filters, setFilters, clients, subreddits, categories, locations, states }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const popoverRef = useRef(null);

  const update = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));
  const hasFilters = Object.values(filters).some(v => v !== '' && v !== null && v !== undefined);
  const hasAdvanced = ['category', 'subreddit', 'location', 'state', 'intentMin', 'intentMax', 'dateFrom', 'dateTo'].some(k => filters[k] !== '' && filters[k] !== null && filters[k] !== undefined);

  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  return (
    <div className="flex flex-wrap items-center gap-2.5 mb-5">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" strokeWidth={2} />
        <input type="text" placeholder="Search..." value={filters.search} onChange={e => update('search', e.target.value)} className={`${inputCls} w-full pl-10`} />
      </div>
      <select value={filters.client} onChange={e => update('client', e.target.value)} className={selectCls}>
        <option value="">All Clients</option>
        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={filters.status} onChange={e => update('status', e.target.value)} className={selectCls}>
        <option value="">All Status</option>
        <option value="new">New</option>
        <option value="reviewed">Reviewed</option>
        <option value="posted">Posted</option>
        <option value="ignored">Ignored</option>
      </select>
      <div className="relative" ref={popoverRef}>
        <button
          onClick={() => setMoreOpen(v => !v)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 border rounded-xl text-sm transition-colors ${
            hasAdvanced ? 'border-accent/30 bg-accent/5 text-accent' : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" strokeWidth={2} />
          More Filters
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {moreOpen && (
          <div className="absolute right-0 top-full mt-2 z-40 w-72 bg-card border border-border rounded-2xl shadow-[var(--shadow-elevated)] p-4 space-y-3.5">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Category</label>
              <select value={filters.category} onChange={e => update('category', e.target.value)} className={`${selectCls} w-full`}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Subreddit</label>
              <select value={filters.subreddit} onChange={e => update('subreddit', e.target.value)} className={`${selectCls} w-full`}>
                <option value="">All Subreddits</option>
                {subreddits.map(s => <option key={s} value={s}>r/{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">State</label>
              <select value={filters.state} onChange={e => update('state', e.target.value)} className={`${selectCls} w-full`}>
                <option value="">All States</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Location</label>
              <select value={filters.location} onChange={e => update('location', e.target.value)} className={`${selectCls} w-full`}>
                <option value="">All Locations</option>
                {locations.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Intent Score</label>
              <div className="flex items-center gap-1.5">
                <input type="number" min="0" max="100" placeholder="Min" value={filters.intentMin} onChange={e => update('intentMin', e.target.value)} className={`${inputCls} w-full text-center`} />
                <span className="text-muted-foreground/50 text-sm">–</span>
                <input type="number" min="0" max="100" placeholder="Max" value={filters.intentMax} onChange={e => update('intentMax', e.target.value)} className={`${inputCls} w-full text-center`} />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Date Range</label>
              <div className="flex items-center gap-1.5">
                <input type="date" value={filters.dateFrom} onChange={e => update('dateFrom', e.target.value)} className={`${inputCls} w-full`} />
                <span className="text-muted-foreground/50 text-sm">–</span>
                <input type="date" value={filters.dateTo} onChange={e => update('dateTo', e.target.value)} className={`${inputCls} w-full`} />
              </div>
            </div>
            {hasAdvanced && (
              <button
                onClick={() => {
                  setFilters(prev => ({ ...prev, category: '', subreddit: '', location: '', state: '', intentMin: '', intentMax: '', dateFrom: '', dateTo: '' }));
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Reset advanced filters
              </button>
            )}
          </div>
        )}
      </div>
      {hasFilters && (
        <button onClick={() => setFilters(clearFilters)} className="flex items-center gap-1 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors">
          <X className="w-4 h-4" /> Clear
        </button>
      )}
    </div>
  );
}