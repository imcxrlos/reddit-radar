import { Link } from 'react-router-dom';
import moment from 'moment';
import { ExternalLink, Copy, Eye, Check, MessageSquare, ArrowUp } from 'lucide-react';
import { useState } from 'react';
import IntentBadge from './IntentBadge';
import StatusBadge from './StatusBadge';

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
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Subreddit</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Location</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Client</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Found</th>
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
                    {o.ai_summary && <p className="text-xs text-muted-foreground truncate max-w-md mt-0.5">{o.ai_summary}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-sm whitespace-nowrap"><span className="text-accent font-medium">r/{o.subreddit}</span></td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground whitespace-nowrap">{o.detected_location || '—'}</td>
                  <td className="px-4 py-3.5 text-sm font-medium text-foreground whitespace-nowrap">{o.client_name || '—'}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground whitespace-nowrap">{moment(o.created_date).format('MMM D')}</td>
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