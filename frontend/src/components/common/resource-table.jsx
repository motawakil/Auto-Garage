import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Card } from '@/components/ui/card'
import { useList } from '@/hooks/use-resource'
import { DataTable, Pagination } from './data-table'
import { EmptyState } from './empty-state'

/** Read-only embedded list (client and dossier tabs). */
export function ResourceTable({ resource, params, columns, rowLink, onRowClick, emptyTitle, emptyIcon, action, title }) {
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const { data, isLoading } = useList(resource, { page, ...params })
  return (
    <Card className="overflow-hidden">
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h3 className="text-[15px] font-semibold">{title}</h3>
          {action}
        </div>
      )}
      <DataTable
        columns={columns}
        rows={data?.results}
        loading={isLoading}
        onRowClick={onRowClick ?? (rowLink ? (r) => navigate(rowLink(r)) : undefined)}
        empty={<EmptyState icon={emptyIcon} title={emptyTitle} />}
      />
      <Pagination page={page} count={data?.count} onChange={setPage} />
    </Card>
  )
}
