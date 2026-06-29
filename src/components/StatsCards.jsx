import { TrendingUp, CalendarDays, Target, ListChecks } from 'lucide-react';

export default function StatsCards({ opportunities }) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(todayStart);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const todayCount = opportunities.filter(o => new Date(o.created_date) >= todayStart).length;
  const weekCount = opportunities.filter(o => new Date(o.created_date) >= weekAgo).length;
  const newOpps = opportunities.filter(o => o.status === 'new');
  const avgIntent = newOpps.length > 0
    ? Math.round(newOpps.reduce((s, o) => s + (o.intent_score || 0), 0) / newOpps.length)
    : 0;

  const cards = [
    { label: 'New Today', value: todayCount, icon: CalendarDays, accent: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'This Week', value: weekCount, icon: TrendingUp, accent: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Avg Intent', value: avgIntent, icon: Target, accent: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Total Leads', value: opportunities.length, icon: ListChecks, accent: 'text-violet-500', bg: 'bg-violet-50' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="card-premium p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center`}>
                <Icon className={`w-[18px] h-[18px] ${card.accent}`} strokeWidth={2.5} />
              </div>
            </div>
            <div className="text-[28px] font-semibold text-foreground tracking-tight leading-none">{card.value}</div>
            <div className="text-[13px] text-muted-foreground mt-1.5 font-medium">{card.label}</div>
          </div>
        );
      })}
    </div>
  );
}