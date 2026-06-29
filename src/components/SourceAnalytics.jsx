import { TrendingUp } from 'lucide-react';

export default function SourceAnalytics({ opportunities }) {
  const counts = {};
  for (const o of opportunities) {
    if (!o.subreddit) continue;
    counts[o.subreddit] = (counts[o.subreddit] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = sorted.length > 0 ? sorted[0][1] : 1;

  return (
    <div className="card-premium p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-orange-500" strokeWidth={2.5} />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Top Sources</h3>
      </div>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground/50 py-6 text-center">No data yet</p>
      ) : (
        <div className="space-y-3">
          {sorted.map(([sub, count]) => (
            <div key={sub} className="flex items-center gap-3">
              <div className="text-sm font-medium text-foreground w-32 shrink-0 truncate">r/{sub}</div>
              <div className="flex-1 h-7 bg-muted rounded-lg overflow-hidden">
                <div
                  className="h-full bg-accent/15 rounded-lg flex items-center justify-end px-2 transition-all"
                  style={{ width: `${(count / max) * 100}%` }}
                >
                  <span className="text-xs font-semibold text-accent">{count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}