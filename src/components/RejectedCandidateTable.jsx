import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import moment from 'moment';

const REASON_STYLES = {
  location_mismatch: 'bg-orange-50 text-orange-700 border-orange-100',
  service_mismatch: 'bg-purple-50 text-purple-700 border-purple-100',
  not_a_lead: 'bg-slate-100 text-slate-600 border-slate-200',
  low_intent: 'bg-amber-50 text-amber-700 border-amber-100',
  other: 'bg-slate-100 text-slate-600 border-slate-200',
};

const REASON_LABELS = {
  location_mismatch: 'Location Mismatch',
  service_mismatch: 'Service Mismatch',
  not_a_lead: 'Not a Lead',
  low_intent: 'Low Intent',
  other: 'Other',
};

function timeAgo(date) {
  const m = moment(date);
  const diffMin = moment().diff(m, 'minutes');
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d`;
}

export default function RejectedCandidateTable({ items = [] }) {
  const [expanded, setExpanded] = useState(null);

  if (items.length === 0) {
    return (
      <div className="card-premium p-12 text-center">
        <p className="text-sm text-muted-foreground">No rejected candidates yet. Rejected Stage 2 candidates will appear here for audit.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isOpen = expanded === item.id;
        return (
          <div key={item.id} className="card-premium overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : item.id)}
              className="w-full text-left p-4 flex items-start gap-3 hover:bg-secondary/40 transition-colors"
            >
              <div className="mt-0.5 shrink-0">
                {isOpen
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${REASON_STYLES[item.rejection_reason] || REASON_STYLES.other}`}>
                    {REASON_LABELS[item.rejection_reason] || item.rejection_reason}
                  </span>
                  {item.subreddit && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md text-[11px] font-medium">r/{item.subreddit}</span>
                  )}
                  {item.detected_location && (
                    <span className="text-[11px] text-muted-foreground">📍 {item.detected_location}</span>
                  )}
                  <span className="text-[11px] text-muted-foreground">{timeAgo(item.created_date)}</span>
                </div>
                <p className="text-sm font-medium text-foreground truncate">{item.reddit_title || '(no title)'}</p>
                <div className="flex items-center gap-2 mt-1">
                  {(item.matched_anchors || []).slice(0, 3).map((a, i) => (
                    <span key={i} className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{a}</span>
                  ))}
                  {(item.matched_anchors || []).length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{item.matched_anchors.length - 3} more</span>
                  )}
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 pt-1 space-y-4 border-t border-border">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Rejection Detail</p>
                  <p className="text-sm text-foreground">{item.rejection_detail || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">AI Reasoning</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{item.ai_reasoning || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Candidate Clients</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(item.candidate_clients || []).map((c, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md text-[11px] font-medium">{c}</span>
                    ))}
                    {item.recommended_client_name && (
                      <span className="inline-flex items-center px-2 py-0.5 bg-accent/10 text-accent rounded-md text-[11px] font-medium border border-accent/20">
                        AI picked: {item.recommended_client_name}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Matched Modifiers</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(item.matched_modifiers || []).length > 0 ? item.matched_modifiers.map((m, i) => (
                      <span key={i} className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">{m}</span>
                    )) : <span className="text-xs text-muted-foreground">None</span>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Intent</p>
                    <p className="text-sm font-medium text-foreground">{item.intent_score || 0}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Category</p>
                    <p className="text-sm font-medium text-foreground">{item.detected_category || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Link</p>
                    {item.reddit_url ? (
                      <a href={item.reddit_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
                        <ExternalLink className="w-3 h-3" /> Reddit
                      </a>
                    ) : <span className="text-sm text-muted-foreground">—</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}