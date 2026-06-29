import { Link } from 'react-router-dom';
import moment from 'moment';
import IntentBadge from './IntentBadge';
import StatusBadge from './StatusBadge';

export default function OpportunityTable({ opportunities }) {
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
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Client</th>
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Post</th>
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Subreddit</th>
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Author</th>
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Found</th>
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Location</th>
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Intent</th>
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {opportunities.map(o => (
              <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3.5 text-sm font-medium text-foreground whitespace-nowrap">{o.client_name || '—'}</td>
                <td className="px-5 py-3.5 text-sm max-w-xs">
                  <Link to={`/opportunity/${o.id}`} className="text-foreground hover:text-accent font-medium transition-colors truncate block max-w-xs">
                    {o.reddit_title || 'Untitled'}
                  </Link>
                  {o.ai_summary && <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">{o.ai_summary}</p>}
                </td>
                <td className="px-5 py-3.5 text-sm whitespace-nowrap"><span className="text-accent font-medium">r/{o.subreddit}</span></td>
                <td className="px-5 py-3.5 text-sm text-muted-foreground whitespace-nowrap">u/{o.author}</td>
                <td className="px-5 py-3.5 text-sm text-muted-foreground whitespace-nowrap">{moment(o.created_date).format('MMM D')}</td>
                <td className="px-5 py-3.5 text-sm text-foreground whitespace-nowrap">{o.detected_location || '—'}</td>
                <td className="px-5 py-3.5"><IntentBadge score={o.intent_score} /></td>
                <td className="px-5 py-3.5"><StatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}