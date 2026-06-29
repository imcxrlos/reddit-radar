const styles = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  reviewed: 'bg-purple-50 text-purple-700 border-purple-200',
  posted: 'bg-green-50 text-green-700 border-green-200',
  ignored: 'bg-gray-100 text-gray-500 border-gray-200',
};
const labels = {
  new: 'New',
  reviewed: 'Reviewed',
  posted: 'Posted',
  ignored: 'Ignored',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.new}`}>
      {labels[status] || status}
    </span>
  );
}