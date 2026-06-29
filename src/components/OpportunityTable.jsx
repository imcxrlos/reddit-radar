import { Link } from 'react-router-dom';
import moment from 'moment';
import IntentBadge from './IntentBadge';
import StatusBadge from './StatusBadge';

export default function OpportunityTable({ opportunities }) {
  if (opportunities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-400 text-sm">No opportunities found. Adjust your filters or wait for the next monitoring cycle.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Post</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subreddit</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Author</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Found</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Intent</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {opportunities.map(o => (
              <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{o.client_name || '—'}</td>
                <td className="px-4 py-3 text-sm max-w-xs">
                  <Link to={`/opportunity/${o.id}`} className="text-gray-900 hover:text-orange-600 font-medium truncate block max-w-xs">
                    {o.reddit_title || 'Untitled'}
                  </Link>
                  {o.ai_summary && <p className="text-xs text-gray-500 truncate max-w-xs mt-0.5">{o.ai_summary}</p>}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap"><span className="text-orange-600 font-medium">r/{o.subreddit}</span></td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">u/{o.author}</td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{moment(o.created_date).format('MMM D')}</td>
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{o.detected_location || '—'}</td>
                <td className="px-4 py-3"><IntentBadge score={o.intent_score} /></td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}