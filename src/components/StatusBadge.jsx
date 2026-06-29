const styles = {
  new: 'bg-blue-50 text-blue-600 border-blue-100',
  reviewed: 'bg-violet-50 text-violet-600 border-violet-100',
  posted: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  ignored: 'bg-muted text-muted-foreground border-border',
};
const labels = {
  new: 'New',
  reviewed: 'Reviewed',
  posted: 'Posted',
  ignored: 'Ignored',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${styles[status] || styles.new}`}>
      {labels[status] || status}
    </span>
  );
}