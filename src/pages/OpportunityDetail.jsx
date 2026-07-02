import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Copy, Save, Check, AlertCircle, FileText, Sparkles, MapPin, ShieldCheck } from 'lucide-react';
import moment from 'moment';
import { opportunities, feedback } from '@/services/db';
import { auth } from '@/services/auth';
import IntentBadge from '@/components/IntentBadge';
import StatusBadge from '@/components/StatusBadge';
import MatchFeedback from '@/components/MatchFeedback';

function timeAgo(date) {
  const m = moment(date);
  const diffMin = moment().diff(m, 'minutes');
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d`;
  return m.format('MMM D');
}

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
  const [reviewer, setReviewer] = useState('');

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try {
      const [data, user] = await Promise.all([
        opportunities.get(id),
        auth.me(),
      ]);
      setOpp(data);
      setDraft(data.edited_response || data.draft_response || '');
      setNotes(data.internal_notes || '');
      setStatus(data.status || 'new');
      setReviewer(user?.full_name || user?.email || 'unknown');
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
      await opportunities.update(id, {
        edited_response: draft,
        internal_notes: notes,
        status,
      });

      // Track human feedback for future AI improvements
      const feedbackRecords = [];
      const originalAiDraft = opp.draft_response || '';

      // Draft edited before posting
      if (draft && originalAiDraft && draft.trim() !== originalAiDraft.trim()) {
        feedbackRecords.push({
          opportunity_id: id,
          reddit_item_id: opp.reddit_item_id,
          feedback_type: 'draft_edited',
          ai_draft_response: originalAiDraft,
          human_edited_response: draft,
          reviewer,
        });
      }

      // AI marked high intent but reviewer ignored it
      if (status === 'ignored' && (opp.intent_score || 0) >= 80) {
        feedbackRecords.push({
          opportunity_id: id,
          reddit_item_id: opp.reddit_item_id,
          feedback_type: 'intent_disagreement',
          ai_intent_score: opp.intent_score,
          details: `AI scored ${opp.intent_score} intent but reviewer ignored`,
          reviewer,
        });
      }

      if (feedbackRecords.length > 0) {
        try {
          await feedback.bulkCreate(feedbackRecords);
        } catch (e) {
          console.error('Feedback tracking failed:', e.message);
        }
      }

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
        <div className="w-7 h-7 border-[2.5px] border-border border-t-accent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !opp) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-red-600 text-sm">{error || 'Opportunity not found'}</div>
        <Link to="/" className="inline-block mt-4 text-sm text-muted-foreground hover:text-foreground">← Back to Dashboard</Link>
      </div>
    );
  }

  const inputCls = "w-full px-3.5 py-2.5 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-accent/15 transition-all";

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-[24px] font-semibold text-foreground tracking-tight">Opportunity Detail</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Review and manage this lead</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Reddit Post */}
          <div className="card-premium p-6">
            <h2 className="text-lg font-semibold text-foreground mb-3 tracking-tight">{opp.reddit_title}</h2>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {opp.subreddit && (
                <span className="inline-flex items-center px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md text-xs font-medium">r/{opp.subreddit}</span>
              )}
              {opp.detected_location && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md text-xs font-medium">
                  <MapPin className="w-3 h-3" /> {opp.detected_location}
                </span>
              )}
              <span className="text-xs text-muted-foreground">u/{opp.author}</span>
              <span className="text-xs text-muted-foreground">{timeAgo(opp.created_date)}</span>
            </div>
            {opp.reddit_body && <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{opp.reddit_body}</p>}
            {opp.reddit_url && (
              <a href={opp.reddit_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-4 text-sm text-accent hover:underline">
                <ExternalLink className="w-3.5 h-3.5" /> View on Reddit
              </a>
            )}
          </div>

          {/* Stage 1 Match Audit */}
          {(opp.matched_anchors?.length > 0 || opp.matched_modifiers?.length > 0 || opp.decision_path) && (
            <div className="card-premium p-6">
              <h3 className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" /> Stage 1 Match Audit
              </h3>
              <div className="mb-4">
                <p className="text-[11px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Decision</p>
                <p className="text-sm font-medium text-foreground">{opp.decision_path || '—'}</p>
              </div>
              <div className="mb-4">
                <p className="text-[11px] font-medium text-emerald-600 mb-2 uppercase tracking-wider">Matched Anchors</p>
                <div className="flex flex-wrap gap-1.5">
                  {(opp.matched_anchors || []).map((a, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium border border-emerald-100">{a}</span>
                  ))}
                  {(opp.matched_anchors || []).length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium text-amber-600 mb-2 uppercase tracking-wider">Matched Modifiers</p>
                <div className="flex flex-wrap gap-1.5">
                  {(opp.matched_modifiers || []).map((m, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium border border-amber-100">{m}</span>
                  ))}
                  {(opp.matched_modifiers || []).length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                </div>
              </div>
            </div>
          )}

          {/* AI Analysis */}
          <div className="card-premium p-6">
            <h3 className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" /> AI Analysis
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-5">
              <div>
                <p className="text-[11px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Intent Score</p>
                <IntentBadge score={opp.intent_score} />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Location</p>
                <p className="text-sm font-medium text-foreground">{opp.detected_location || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Category</p>
                <p className="text-sm font-medium text-foreground">{opp.detected_category || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Service</p>
                <p className="text-sm font-medium text-foreground">{opp.detected_service || '—'}</p>
              </div>
            </div>
            <div className="mb-5">
              <p className="text-[11px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Matched Client</p>
              <Link to="/clients" className="text-sm font-medium text-foreground hover:text-accent transition-colors">{opp.client_name || '—'}</Link>
            </div>
            {opp.competitor_mentions?.length > 0 && (
              <div className="mb-5">
                <p className="text-[11px] text-muted-foreground mb-2 font-medium uppercase tracking-wider">Competitor Mentions</p>
                <div className="flex flex-wrap gap-1.5">
                  {opp.competitor_mentions.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-medium border border-red-100">
                      <AlertCircle className="w-3 h-3" /> {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="mb-5">
              <p className="text-[11px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Summary</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{opp.ai_summary || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-2 font-medium uppercase tracking-wider">Why this client was recommended</p>
              {opp.match_reasoning ? (
                <div className="bg-accent/5 border border-accent/15 rounded-xl p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {opp.match_reasoning}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/50">No reasoning provided.</p>
              )}
            </div>
          </div>

          <MatchFeedback opp={opp} reviewer={reviewer} />
        </div>

        {/* Response Workspace */}
        <div className="lg:sticky lg:top-6 self-start">
          <div className="card-premium p-6 space-y-5">
            <h3 className="text-sm font-semibold text-foreground">Response Workspace</h3>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Draft Response</label>
              <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={8} className={inputCls} />
              <button onClick={handleCopy} className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl border border-border transition-colors">
                {copied ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy to Clipboard</>}
              </button>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Internal Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={inputCls} placeholder="Add notes for the team..." />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
                <option value="new">New</option>
                <option value="reviewed">Reviewed</option>
                <option value="posted">Posted</option>
                <option value="ignored">Ignored</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
              {saved && <span className="text-sm text-emerald-500 flex items-center gap-1"><Check className="w-4 h-4" /> Saved</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}