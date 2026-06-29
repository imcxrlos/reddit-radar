import { Flame, Target, Eye, Send } from 'lucide-react';

export default function StatsCards({ opportunities }) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const newOpps = opportunities.filter(o => o.status === 'new').length;
  const highIntent = opportunities.filter(o => (o.intent_score || 0) >= 80).length;
  const needsReview = opportunities.filter(o => o.status === 'reviewed').length;
  const postedToday = opportunities.filter(o => o.status === 'posted' && new Date(o.updated_date) >= todayStart).length;

  const cards = [
    { label: 'New Opportunities', value: newOpps, icon: Target, accent: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'High Intent (80+)', value: highIntent, icon: Flame, accent: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Needs Review', value: needsReview, icon: Eye, accent: 'text-violet-500', bg: 'bg-violet-50' },
    { label: 'Posted Today', value: postedToday, icon: Send, accent: 'text-emerald-500', bg: 'bg-emerald-50' },
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