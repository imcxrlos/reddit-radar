import { Users } from 'lucide-react';

export default function ClientAnalytics({ opportunities }) {
  const counts = {};
  for (const o of opportunities) {
    if (!o.client_name) continue;
    counts[o.client_name] = (counts[o.client_name] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = sorted.length > 0 ? sorted[0][1] : 1;

  return (
    <div className="card-premium p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <Users className="w-4 h-4 text-blue-500" strokeWidth={2.5} />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Top Clients</h3>
      </div>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground/50 py-6 text-center">No data yet</p>
      ) : (
        <div className="space-y-3">
          {sorted.map(([name, count]) => (
            <div key={name} className="flex items-center gap-3">
              <div className="text-sm font-medium text-foreground w-40 shrink-0 truncate">{name}</div>
              <div className="flex-1 h-7 bg-muted rounded-lg overflow-hidden">
                <div
                  className="h-full bg-blue-500/15 rounded-lg flex items-center justify-end px-2 transition-all"
                  style={{ width: `${(count / max) * 100}%` }}
                >
                  <span className="text-xs font-semibold text-blue-600">{count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}