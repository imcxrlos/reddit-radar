import { Link } from 'react-router-dom';
import moment from 'moment';
import { ExternalLink, Copy, Eye, Check, MessageSquare, ArrowUp, MapPin } from 'lucide-react';
import { useState } from 'react';
import IntentBadge from './IntentBadge';
import StatusBadge from './StatusBadge';

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

export default function OpportunityTable({ opportunities }) {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (e, opp) => {
    e.preventDefault();
    e.stopPropagation();
    const text = opp.edited_response || opp.draft_response || '';
    if (text) {
      navigator.clipboard.writeText(text);
      setCopiedId(opp.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  if (opportunities.length === 0) {
    return (
      <div className="card-premium p-16 text-center">
        <p className="text-muted-foreground text-sm">No opportunities found. Adjust your filters or wait for the next monitoring cycle.</p>
      </div>
    );
  }

  return (
    <div className="card-premium overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Intent</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Reddit Post</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Client</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-right px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {opportunities.map(o => {
              const hasDraft = o.edited_response || o.draft_response;
              return (
                <tr key={o.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-4 py-3.5"><IntentBadge score={o.intent_score} /></td>
                  <td className="px-4 py-3.5 text-sm max-w-md">
                    <Link to={`/opportunity/${o.id}`} className="text-foreground hover:text-accent font-medium transition-colors block truncate max-w-md">
                      {o.reddit_title || 'Untitled'}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {o.subreddit && (
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded text-[11px] font-medium">r/{o.subreddit}</span>
                      )}
                      {o.detected_location && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded text-[11px] font-medium">
                          <MapPin className="w-2.5 h-2.5" /> {o.detected_location}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground">{timeAgo(o.created_date)}</span>
                    </div>
                    {o.ai_summary && <p className="text-xs text-muted-foreground truncate max-w-md mt-1">{o.ai_summary}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-sm font-medium text-foreground whitespace-nowrap">{o.client_name || '—'}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/opportunity/${o.id}`}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {hasDraft && (
                        <button
                          onClick={(e) => handleCopy(e, o)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                          title="Copy draft"
                        >
                          {copiedId === o.id
                            ? <Check className="w-4 h-4 text-emerald-500" />
                            : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                      {o.reddit_url && (
                        <a
                          href={o.reddit_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-muted-foreground hover:text-accent hover:bg-secondary rounded-lg transition-colors"
                          title="Open on Reddit"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}