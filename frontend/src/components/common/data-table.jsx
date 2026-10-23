import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { EmptyState } from './empty-state'

const cell = (col, row) => (col.render ? col.render(row) : row[col.key] ?? '—')

/**
 * Professional table on desktop, stacked cards on phones.
 * columns: [{ key, header, render, align, className, sortKey, mobile: 'title' | 'subtitle' | 'hidden' }]
 */
export function DataTable({ columns, rows = [], loading, onRowClick, selectedId, empty, ordering, onOrderingChange, dense }) {
  const sortIcon = (col) => {
    if (!col.sortKey || !ordering) return null
    if (ordering === col.sortKey) return <ArrowUp className="size-3" />
    if (ordering === `-${col.sortKey}`) return <ArrowDown className="size-3" />
    return null
  }
  const toggleSort = (col) => {
    if (!col.sortKey || !onOrderingChange) return
    onOrderingChange(ordering === `-${col.sortKey}` ? col.sortKey : `-${col.sortKey}`)
  }

  if (!loading && rows.length === 0) return empty ?? <EmptyState />

  const titleCol = columns.find((c) => c.mobile === 'title') ?? columns[0]
  const subCol = columns.find((c) => c.mobile === 'subtitle')
  const restCols = columns.filter((c) => c !== titleCol && c !== subCol && c.mobile !== 'hidden' && c.header)

  return (
    <>
      <div className="hidden overflow-x-auto md:block scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col)}
                  className={cn(
                    'h-10 px-4 text-left text-xs font-medium whitespace-nowrap text-muted-foreground first:pl-5 last:pr-5',
                    col.align === 'right' && 'text-right', col.sortKey && 'cursor-pointer select-none hover:text-foreground', col.headClassName, col.responsive,
                  )}
                >
                  <span className={cn('inline-flex items-center gap-1', col.align === 'right' && 'flex-row-reverse')}>
                    {col.header}
                    {sortIcon(col)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {columns.map((c) => (
                      <td key={c.key} className={cn('px-4 py-3.5 first:pl-5', c.responsive)}><Skeleton className="h-4 w-3/4" /></td>
                    ))}
                  </tr>
                ))
              : rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'group border-b border-border transition-colors last:border-0',
                      onRowClick && 'cursor-pointer hover:bg-muted/60',
                      selectedId === row.id && 'bg-primary-soft/60 hover:bg-primary-soft/80',
                      row._rowClassName,
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn('px-4 first:pl-5 last:pr-5', dense ? 'py-2' : 'py-3', col.align === 'right' && 'text-right', col.className, col.responsive)}
                      >
                        {cell(col, row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-border md:hidden">
        {loading && rows.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2 p-4"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-3/4" /></div>
            ))
          : rows.map((row) => (
              <div
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('p-4 active:bg-muted/60', selectedId === row.id && 'bg-primary-soft/60', row._rowClassName)}
              >
                <div className="font-medium">{cell(titleCol, row)}</div>
                {subCol && <div className="mt-0.5 text-sm text-muted-foreground">{cell(subCol, row)}</div>}
                {restCols.length > 0 && (
                  <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
                    {restCols.map((col) => (
                      <div key={col.key} className="min-w-0">
                        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{col.header}</dt>
                        <dd className="truncate text-sm">{cell(col, row)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            ))}
      </div>
    </>
  )
}

export function Pagination({ page, pageSize = 25, count = 0, onChange }) {
  const pages = Math.max(1, Math.ceil(count / pageSize))
  if (count <= pageSize) return count ? <div className="px-5 py-3 text-xs text-muted-foreground">{count} résultat{count > 1 ? 's' : ''}</div> : null
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
      <span className="text-xs text-muted-foreground tabular">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, count)} sur {count}
      </span>
      <div className="flex items-center gap-1">
        <Button size="icon-sm" variant="ghost" icon={ChevronLeft} disabled={page <= 1} onClick={() => onChange(page - 1)} />
        <span className="px-2 text-xs font-medium tabular">{page} / {pages}</span>
        <Button size="icon-sm" variant="ghost" icon={ChevronRight} disabled={page >= pages} onClick={() => onChange(page + 1)} />
      </div>
    </div>
  )
}
