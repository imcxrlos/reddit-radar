import { Flame, MapPin, Scale, Stethoscope, Sparkles, Eye } from 'lucide-react';

const QUICK_FILTERS = [
  { key: 'highIntent', label: 'High Intent', icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { key: 'hasLocation', label: 'Has Location', icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'personalInjury', label: 'Personal Injury', icon: Scale, color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
  { key: 'dental', label: 'Dental', icon: Stethoscope, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
  { key: 'statusNew', label: 'New', icon: Sparkles, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
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