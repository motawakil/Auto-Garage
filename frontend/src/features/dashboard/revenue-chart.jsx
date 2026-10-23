import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { formatMoney } from '@/lib/utils'

const SERIES = [
  { key: 'invoiced', label: 'Facturé TTC', color: 'var(--chart-2)' },
  { key: 'collected', label: 'Encaissé', color: 'var(--chart-1)' },
]
const monthLabel = (m) => new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(`${m}T00:00:00`))

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs shadow-pop">
      <p className="mb-1.5 font-semibold capitalize">{new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(`${label}T00:00:00`))}</p>
      {SERIES.map((s) => {
        const p = payload.find((x) => x.dataKey === s.key)
        return (
          <p key={s.key} className="flex items-center gap-2 py-0.5">
            <span className="size-2 rounded-sm" style={{ background: s.color }} />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="ml-auto pl-4 font-medium tabular">{formatMoney(p?.value)}</span>
          </p>
        )
      })}
    </div>
  )
}

/** Invoiced vs actually collected — two distinct indicators, never interchangeable. */
export function RevenueChart({ data = [] }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: s.color }} />{s.label}</span>
        ))}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
            <XAxis dataKey="month" tickFormatter={monthLabel} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
            <YAxis tickFormatter={(v) => formatMoney(v, { currency: false, compact: true })} tickLine={false} axisLine={false} width={48} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', radius: 8 }} />
            {SERIES.map((s) => (
              <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
