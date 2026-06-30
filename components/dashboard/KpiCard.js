export default function KpiCard({ label, value, sub, accent }) {
  const colors = {
    sky: 'border-sky-500/30 bg-sky-500/5',
    amber: 'border-amber-500/30 bg-amber-500/5',
    green: 'border-green-500/30 bg-green-500/5',
    rose: 'border-rose-500/30 bg-rose-500/5',
  }
  const textColors = {
    sky: 'text-sky-400',
    amber: 'text-amber-400',
    green: 'text-green-400',
    rose: 'text-rose-400',
  }

  return (
    <div className={`rounded-xl border p-5 ${colors[accent] ?? colors.sky}`}>
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">{label}</p>
      <p className={`text-3xl font-semibold ${textColors[accent] ?? textColors.sky}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-2">{sub}</p>}
    </div>
  )
}