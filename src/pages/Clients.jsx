import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, MapPin, Globe, Tag } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await base44.entities.Client.list();
      setClients(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clients.length} clients managed</p>
        </div>
        <Link to="/clients/new" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
          <Plus className="w-4 h-4" /> New Client
        </Link>
      </div>
      {clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm mb-4">No clients yet. Create your first client to start monitoring Reddit.</p>
          <Link to="/clients/new" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
            <Plus className="w-4 h-4" /> New Client
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(c => (
            <div key={c.id} className={`bg-white rounded-xl border p-5 ${c.is_active ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{c.name}</h3>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 rounded text-xs font-medium text-slate-600">{c.category}</span>
                </div>
                <Link to={`/clients/${c.id}/edit`} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                  <Pencil className="w-4 h-4" />
                </Link>
              </div>
              {c.locations?.length > 0 && (
                <div className="flex items-start gap-1.5 text-sm text-gray-600 mb-2">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
                  <span>{c.locations.join(', ')}</span>
                </div>
              )}
              {c.website && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-2">
                  <Globe className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                  <a href={c.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">{c.website}</a>
                </div>
              )}
              {c.keywords?.length > 0 && (
                <div className="flex items-start gap-1.5 text-sm text-gray-600">
                  <Tag className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
                  <div className="flex flex-wrap gap-1">
                    {c.keywords.slice(0, 5).map((k, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded text-xs">{k}</span>
                    ))}
                    {c.keywords.length > 5 && <span className="text-xs text-gray-400">+{c.keywords.length - 5} more</span>}
                  </div>
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className={`text-xs font-medium ${c.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                  {c.is_active ? '● Active' : '○ Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}