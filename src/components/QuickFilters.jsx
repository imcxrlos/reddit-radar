import { Flame, Eye } from 'lucide-react';

const QUICK_FILTERS = [
  { key: 'highIntent', label: 'High Intent', icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { key: 'needsReview', label: 'Needs Review', icon: Eye, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
];

export default function QuickFilters({ activeFilters, onToggle }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {QUICK_FILTERS.map(qf => {
        const Icon = qf.icon;
        const active = activeFilters.includes(qf.key);
        return (
          <button
            key={qf.key}
            onClick={() => onToggle(qf.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium border transition-all ${
              active
                ? `${qf.bg} ${qf.color} ${qf.border}`
                : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/30 hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={active ? 2.5 : 2} />
            {qf.label}
          </button>
        );
      })}
    </div>
  );
}