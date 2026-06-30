import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Check, Loader2 } from 'lucide-react';
import { feedback } from '@/services/db';

const REASONS = [
  { value: 'wrong_client', label: 'Wrong client' },
  { value: 'not_a_lead', label: 'Not a lead' },
  { value: 'wrong_location', label: 'Wrong location' },
  { value: 'wrong_category_service', label: 'Wrong category/service' },
  { value: 'low_intent', label: 'Low intent' },
  { value: 'poor_ai_draft', label: 'Poor AI draft' },
  { value: 'other', label: 'Other' },
];

export default function MatchFeedback({ opp, reviewer }) {
  const [decision, setDecision] = useState(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recorded, setRecorded] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const existing = await feedback.filter({
          opportunity_id: opp.id,
          feedback_type: 'match_feedback',
          reviewer,
        });
        if (!active) return;
        if (existing.length > 0) {
          const rec = existing[0];
          setRecorded(rec.reviewer_decision);
          setDecision(rec.reviewer_decision);
          if (rec.reason) setReason(rec.reason);
          if (rec.note) setNote(rec.note);
        }
      } catch (e) { /* ignore — non-blocking */ }
      setLoaded(true);
    })();
    return () => { active = false; };
  }, [opp.id, reviewer]);

  const submit = async (dec, reasonVal = '', noteVal = '') => {
    setSubmitting(true);
    try {
      await feedback.create({
        opportunity_id: opp.id,
        reddit_item_id: opp.reddit_item_id,
        feedback_type: 'match_feedback',
        reviewer_decision: dec,
        reason: dec === 'bad' ? reasonVal : '',
        note: noteVal || '',
        final_status: opp.status || '',
        ai_client_name: opp.client_name || '',
        ai_intent_score: opp.intent_score || 0,
        ai_reasoning: opp.match_reasoning || '',
        ai_draft_response: opp.draft_response || '',
        reviewer,
      });
      setRecorded(dec);
    } catch (e) {
      console.error('Feedback save failed:', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!loaded) return null;

  const isRecorded = recorded !== null;

  if (isRecorded) {
    return (
      <div className="card-premium p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Match Quality</h3>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          </span>
          <span className="text-foreground font-medium">Feedback recorded</span>
          <span className="text-muted-foreground">— {recorded === 'good' ? 'Good Match' : 'Bad Match'}</span>
          {recorded === 'bad' && reason && (
            <span className="text-muted-foreground">({REASONS.find(r => r.value === reason)?.label})</span>
          )}
        </div>
      </div>
    );
  }

  if (decision === 'bad') {
    return (
      <div className="card-premium p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Match Quality</h3>
        <p className="text-xs text-muted-foreground mb-4">Why is this a bad match? Selecting a reason helps improve matching.</p>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Reason (required)</label>
            <div className="grid grid-cols-1 gap-1.5">
              {REASONS.map(r => (
                <label key={r.value} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${reason === r.value ? 'border-accent bg-accent/5 text-foreground' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
                  <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-accent" />
                  {r.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Note (optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card focus:outline-none focus:ring-2 focus:ring-accent/15 transition-all" placeholder="Add context..." />
          </div>
          <div className="flex gap-2">
            <button onClick={() => submit('bad', reason, note)} disabled={!reason || submitting} className="btn-primary disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4" />} Submit Feedback
            </button>
            <button onClick={() => { setDecision(null); setReason(''); setNote(''); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-premium p-5">
      <h3 className="text-sm font-semibold text-foreground mb-1">Match Quality</h3>
      <p className="text-xs text-muted-foreground mb-4">Was this a good match? Your decision builds a dataset to improve matching.</p>
      <div className="flex gap-2">
        <button onClick={() => submit('good')} disabled={submitting} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border border-border bg-card hover:bg-secondary transition-colors disabled:opacity-50">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4 text-emerald-500" />} Good Match
        </button>
        <button onClick={() => setDecision('bad')} disabled={submitting} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border border-border bg-card hover:bg-secondary transition-colors disabled:opacity-50">
          <ThumbsDown className="w-4 h-4 text-red-500" /> Bad Match
        </button>
      </div>
    </div>
  );
}