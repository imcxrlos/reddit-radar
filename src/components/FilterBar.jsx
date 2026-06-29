import { Search, X } from 'lucide-react';

const selectCls = "px-3.5 py-2.5 border border-border rounded-xl text-sm bg-card text-foreground cursor-pointer hover:border-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-accent/15 transition-colors";
const inputCls = "px-3.5 py-2.5 border border-border rounded-xl text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-accent/15 transition-all placeholder:text-muted-foreground/50";
const clearFilters = { search: '', client: '', status: '', category: '', subreddit: '', location: '', state: '', intentMin: '', intentMax: '', dateFrom: '', dateTo: '' };

export default function FilterBar({ filters, setFilters, clients, subreddits, categories, locations, states }) {
  const update = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));
  const hasFilters = Object.values(filters).some(v => v !== '' && v !== null && v !== undefined);

  return (
    <div className="card-premium p-4 mb-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" strokeWidth={2} />
          <input type="text" placeholder="Search posts..." value={filters.search} onChange={e => update('search', e.target.value)} className={`${inputCls} w-full pl-10`} />
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
        <select value={filters.category} onChange={e => update('category', e.target.value)} className={selectCls}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.subreddit} onChange={e => update('subreddit', e.target.value)} className={selectCls}>
          <option value="">All Subreddits</option>
          {subreddits.map(s => <option key={s} value={s}>r/{s}</option>)}
        </select>
        <select value={filters.location} onChange={e => update('location', e.target.value)} className={selectCls}>
          <option value="">All Locations</option>
          {locations.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={filters.state} onChange={e => update('state', e.target.value)} className={selectCls}>
          <option value="">All States</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <input type="number" min="0" max="100" placeholder="Min" value={filters.intentMin} onChange={e => update('intentMin', e.target.value)} className={`${inputCls} w-16 text-center`} />
          <span className="text-muted-foreground/50 text-sm">–</span>
          <input type="number" min="0" max="100" placeholder="Max" value={filters.intentMax} onChange={e => update('intentMax', e.target.value)} className={`${inputCls} w-16 text-center`} />
        </div>
        <input type="date" value={filters.dateFrom} onChange={e => update('dateFrom', e.target.value)} className={inputCls} />
        <input type="date" value={filters.dateTo} onChange={e => update('dateTo', e.target.value)} className={inputCls} />
        {hasFilters && (
          <button onClick={() => setFilters(clearFilters)} className="flex items-center gap-1 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors">
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}