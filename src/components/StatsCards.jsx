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
    { label: 'New Today', value: todayCount, icon: CalendarDays, color: 'text-blue-500' },
    { label: 'This Week', value: weekCount, icon: TrendingUp, color: 'text-green-500' },
    { label: 'Avg Intent', value: avgIntent, icon: Target, color: 'text-orange-500' },
    { label: 'Total Leads', value: opportunities.length, icon: ListChecks, color: 'text-purple-500' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-500">{card.label}</span>
              <Icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
          </div>
        );
      })}
    </div>
  );
}