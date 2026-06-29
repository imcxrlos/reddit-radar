import { Search, X } from 'lucide-react';

const selectCls = "px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10";
const inputCls = "px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10";
const clearFilters = { search: '', client: '', status: '', category: '', subreddit: '', location: '', state: '', intentMin: '', intentMax: '', dateFrom: '', dateTo: '' };

export default function FilterBar({ filters, setFilters, clients, subreddits, categories, locations, states }) {
  const update = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));
  const hasFilters = Object.values(filters).some(v => v !== '' && v !== null && v !== undefined);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search posts..." value={filters.search} onChange={e => update('search', e.target.value)} className={`${inputCls} w-full pl-8`} />
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
        <div className="flex items-center gap-1">
          <input type="number" min="0" max="100" placeholder="Min" value={filters.intentMin} onChange={e => update('intentMin', e.target.value)} className={`${inputCls} w-16`} />
          <span className="text-gray-400 text-sm">–</span>
          <input type="number" min="0" max="100" placeholder="Max" value={filters.intentMax} onChange={e => update('intentMax', e.target.value)} className={`${inputCls} w-16`} />
        </div>
        <input type="date" value={filters.dateFrom} onChange={e => update('dateFrom', e.target.value)} className={inputCls} />
        <input type="date" value={filters.dateTo} onChange={e => update('dateTo', e.target.value)} className={inputCls} />
        {hasFilters && (
          <button onClick={() => setFilters(clearFilters)} className="flex items-center gap-1 px-2.5 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg">
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}