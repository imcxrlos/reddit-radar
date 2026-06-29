import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Copy, Save, Check, AlertCircle, FileText } from 'lucide-react';
import moment from 'moment';
import { base44 } from '@/api/base44Client';
import IntentBadge from '@/components/IntentBadge';
import StatusBadge from '@/components/StatusBadge';

export default function OpportunityDetail() {
  const { id } = useParams();
  const [opp, setOpp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('new');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try {
      const data = await base44.entities.Opportunity.get(id);
      setOpp(data);
      setDraft(data.edited_response || data.draft_response || '');
      setNotes(data.internal_notes || '');
      setStatus(data.status || 'new');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await base44.entities.Opportunity.update(id, {
        edited_response: draft,
        internal_notes: notes,
        status,
      });
      setOpp(prev => ({ ...prev, edited_response: draft, internal_notes: notes, status }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !opp) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error || 'Opportunity not found'}</div>
        <Link to="/" className="inline-block mt-4 text-sm text-slate-600 hover:text-slate-900">← Back to Dashboard</Link>
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10";

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Opportunity Detail</h1>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Reddit Post */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-orange-600 font-semibold text-sm">r/{opp.subreddit}</span>
              <span className="text-gray-300">•</span>
              <span className="text-sm text-gray-500">u/{opp.author}</span>
              <span className="text-gray-300">•</span>
              <span className="text-sm text-gray-500">{moment(opp.created_date).format('MMM D, YYYY')}</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{opp.reddit_title}</h2>
            {opp.reddit_body && <p className="text-sm text-gray-600 whitespace-pre-wrap">{opp.reddit_body}</p>}
            {opp.reddit_url && (
              <a href={opp.reddit_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-sm text-blue-600 hover:underline">
                <ExternalLink className="w-3.5 h-3.5" /> View on Reddit
              </a>
            )}
          </div>

          {/* AI Analysis */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" /> AI Analysis
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Intent Score</p>
                <IntentBadge score={opp.intent_score} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Location</p>
                <p className="text-sm font-medium text-gray-900">{opp.detected_location || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Category</p>
                <p className="text-sm font-medium text-gray-900">{opp.detected_category || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Service</p>
                <p className="text-sm font-medium text-gray-900">{opp.detected_service || '—'}</p>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-1">Matched Client</p>
              <Link to="/clients" className="text-sm font-medium text-slate-900 hover:text-orange-600">{opp.client_name || '—'}</Link>
            </div>
            {opp.competitor_mentions?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Competitor Mentions</p>
                <div className="flex flex-wrap gap-1.5">
                  {opp.competitor_mentions.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs">
                      <AlertCircle className="w-3 h-3" /> {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-1">Summary</p>
              <p className="text-sm text-gray-700">{opp.ai_summary || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Why this client was recommended</p>
              {opp.match_reasoning ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {opp.match_reasoning}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No reasoning provided.</p>
              )}
            </div>
          </div>
        </div>

        {/* Response Workspace */}
        <div className="lg:sticky lg:top-6 self-start">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Response Workspace</h3>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Draft Response</label>
              <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={8} className={inputCls} />
              <button onClick={handleCopy} className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg border border-gray-200">
                {copied ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy to Clipboard</>}
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Internal Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={inputCls} placeholder="Add notes for the team..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
                <option value="new">New</option>
                <option value="reviewed">Reviewed</option>
                <option value="posted">Posted</option>
                <option value="ignored">Ignored</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
              {saved && <span className="text-sm text-green-600 flex items-center gap-1"><Check className="w-4 h-4" /> Saved</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}