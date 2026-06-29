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
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-semibold text-foreground tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">{clients.length} clients managed</p>
        </div>
        <Link to="/clients/new" className="btn-primary">
          <Plus className="w-4 h-4" strokeWidth={2.5} /> New Client
        </Link>
      </div>
      {clients.length === 0 ? (
        <div className="card-premium p-16 text-center">
          <p className="text-muted-foreground text-sm mb-5">No clients yet. Create your first client to start monitoring Reddit.</p>
          <Link to="/clients/new" className="btn-primary">
            <Plus className="w-4 h-4" strokeWidth={2.5} /> New Client
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clients.map(c => (
            <div key={c.id} className={`card-premium card-premium-hover p-6 ${!c.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground text-[15px] tracking-tight">{c.name}</h3>
                  <span className="inline-block mt-1.5 px-2 py-0.5 bg-secondary rounded-md text-[11px] font-medium text-secondary-foreground">{c.category}</span>
                </div>
                <Link to={`/clients/${c.id}/edit`} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
                  <Pencil className="w-4 h-4" />
                </Link>
              </div>
              {c.locations?.length > 0 && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2.5">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground/60" />
                  <span>{c.locations.join(', ')}</span>
                </div>
              )}
              {c.website && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2.5">
                  <Globe className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
                  <a href={c.website} target="_blank" rel="noreferrer" className="text-accent hover:underline truncate">{c.website}</a>
                </div>
              )}
              {c.keywords?.length > 0 && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Tag className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground/60" />
                  <div className="flex flex-wrap gap-1">
                    {c.keywords.slice(0, 5).map((k, i) => (
                      <span key={i} className="px-2 py-0.5 bg-accent/8 text-accent rounded-md text-xs font-medium">{k}</span>
                    ))}
                    {c.keywords.length > 5 && <span className="text-xs text-muted-foreground/60">+{c.keywords.length - 5} more</span>}
                  </div>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-border">
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${c.is_active ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${c.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}></span>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}