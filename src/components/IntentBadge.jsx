export default function IntentBadge({ score }) {
  const num = Number(score) || 0;
  let cls = 'bg-red-50 text-red-700 border-red-200';
  if (num >= 75) cls = 'bg-green-50 text-green-700 border-green-200';
  else if (num >= 50) cls = 'bg-yellow-50 text-yellow-700 border-yellow-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${cls}`}>
      {num}
    </span>
  );
}