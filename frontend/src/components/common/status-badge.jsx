import { Badge } from '@/components/ui/badge'
import { labelOf, toneOf } from '@/lib/choices'

export function StatusBadge({ list, value, label, dot = true }) {
  return <Badge tone={toneOf(list, value)} dot={dot}>{label || labelOf(list, value)}</Badge>
}
