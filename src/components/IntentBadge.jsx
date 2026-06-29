export default function IntentBadge({ score }) {
  const num = Number(score) || 0;
  let cls = 'bg-red-50 text-red-600 border-red-100';
  if (num >= 75) cls = 'bg-emerald-50 text-emerald-600 border-emerald-100';
  else if (num >= 50) cls = 'bg-amber-50 text-amber-600 border-amber-100';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${cls}`}>
      {num}
    </span>
  );
}