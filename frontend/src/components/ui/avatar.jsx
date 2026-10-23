import { cn, initials } from '@/lib/utils'

const palette = ['bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-amber-100 text-amber-800', 'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700', 'bg-indigo-100 text-indigo-700', 'bg-fuchsia-100 text-fuchsia-700', 'bg-zinc-200 text-zinc-700']

export function Avatar({ name = '', color, size = 'md', className }) {
  const idx = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length
  const s = { sm: 'size-6 text-[10px]', md: 'size-8 text-xs', lg: 'size-12 text-base' }[size]
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', !color && palette[idx], s, className)}
      style={color ? { backgroundColor: `${color}22`, color } : undefined}
      title={name}
    >
      {initials(name) || '?'}
    </span>
  )
}
