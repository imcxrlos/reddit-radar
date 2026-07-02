import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, ShieldAlert } from 'lucide-react';
import db from '@/services/db';
import { useAuth } from '@/lib/AuthContext';
import RejectedCandidateTable from '@/components/RejectedCandidateTable';

const REASONS = ['all', 'location_mismatch', 'service_mismatch', 'not_a_lead', 'low_intent', 'other'];

export default function RejectedCandidates() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reasonFilter, setReasonFilter] = useState('all');

  useEffect(() => {
    if (user?.role !== 'admin') { setLoading(false); return; }
    load();
  }, [user]);

  const load = async () => {
    try {
      const data = await db.rejections.list('-created_date', 200);
      setItems(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <ShieldAlert className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">Admin Access Required</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4">The rejection audit is available to administrators only.</p>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-7 h-7 border-[2.5px] border-border border-t-accent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-red-600 text-sm mb-4">{error}</div>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const filtered = reasonFilter === 'all' ? items : items.filter(i => i.rejection_reason === reasonFilter);

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <h1 className="text-[24px] font-semibold text-foreground tracking-tight">Rejection Audit</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} rejected Stage 2 candidates · admin-only pipeline validation tool
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {REASONS.map(r => (
          <button
            key={r}
            onClick={() => setReasonFilter(r)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
              reasonFilter === r
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {r === 'all' ? 'All Reasons' : r.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <RejectedCandidateTable items={filtered} />
    </div>
  );
}