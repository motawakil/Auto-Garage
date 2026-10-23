import { Download, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { Segmented } from '@/components/ui/tabs'
import { useDebounce } from '@/hooks/use-debounce'
import { useList } from '@/hooks/use-resource'
import { DataTable, Pagination } from './data-table'
import { EmptyState } from './empty-state'
import { FormPanel } from './form-panel'
import { PageHeader } from './page-header'

/**
 * Generic list + docked form for a resource. Pages pass columns, form fields and filters;
 * everything else (search, pagination, sorting, create/edit/delete) is handled here.
 */
export function CrudPage({
  title, description, resource, columns, fields, filters = [], params: baseParams = {}, searchPlaceholder = 'Rechercher…',
  newLabel = 'Nouveau', panelTitle, panelIcon, emptyIcon, defaults, rowLink, exportName, header, related, embedded,
  defaultOrdering, deletable, saveParams, panelExtra, beforeForm, toItem, actions, onSaved, openOnNew, createFields,
}) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [ordering, setOrdering] = useState(defaultOrdering)
  const [filterValues, setFilterValues] = useState(() => Object.fromEntries(filters.map((f) => [f.name, f.default ?? ''])))
  const [editing, setEditing] = useState(null)
  const debounced = useDebounce(search)
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    if (openOnNew && searchParams.get('new')) { setEditing({}); setSearchParams({}, { replace: true }) }
  }, [openOnNew, searchParams, setSearchParams])

  const params = { page, search: debounced, ordering, ...baseParams, ...Object.fromEntries(Object.entries(filterValues).filter(([, v]) => v !== '')) }
  const { data, isLoading, isFetching } = useList(resource, params)
  const rows = data?.results ?? []

  const setFilter = (name, v) => { setFilterValues((s) => ({ ...s, [name]: v })); setPage(1) }
  const open = (row) => (rowLink ? navigate(rowLink(row)) : setEditing(toItem ? toItem(row) : row))

  const content = (
    <div className="flex items-start gap-6">
      <div className="min-w-0 flex-1 space-y-4">
        {header}
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center">
            <div className="flex-1 sm:max-w-sm">
              <Input icon={Search} placeholder={searchPlaceholder} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              {filters.map((f) =>
                f.segmented ? (
                  <Segmented key={f.name} options={f.options} value={filterValues[f.name]} onChange={(v) => setFilter(f.name, v)} />
                ) : (
                  <div key={f.name} className="w-full sm:w-48">
                    <Select value={filterValues[f.name]} onChange={(e) => setFilter(f.name, e.target.value)} options={f.options} placeholder={f.label} />
                  </div>
                ),
              )}
              {isFetching && !isLoading && <span className="size-1.5 animate-pulse rounded-full bg-primary" />}
              {embedded && fields && <Button variant="primary" icon={Plus} onClick={() => setEditing({})}>{newLabel}</Button>}
            </div>
          </div>
          <DataTable
            columns={columns}
            rows={rows}
            loading={isLoading}
            onRowClick={open}
            selectedId={editing?.id}
            ordering={ordering}
            onOrderingChange={setOrdering}
            empty={
              <EmptyState icon={emptyIcon} title={debounced ? 'Aucun résultat' : `Aucun élément pour l'instant`}
                description={debounced ? 'Essayez une autre recherche.' : undefined}
                action={!debounced && fields && <Button variant="primary" icon={Plus} onClick={() => setEditing({})}>{newLabel}</Button>} />
            }
          />
          <Pagination page={page} count={data?.count} onChange={setPage} />
        </Card>
      </div>
      {fields && (
        <FormPanel
          open={!!editing}
          onClose={() => setEditing(null)}
          resource={resource}
          item={editing?.id ? editing : null}
          defaults={{ ...defaults, ...(editing && !editing.id ? editing : {}) }}
          fields={editing?.id ? fields : createFields ?? fields}
          title={editing?.id ? panelTitle?.(editing) ?? 'Modifier' : newLabel}
          subtitle={editing?.id ? 'Modification' : 'Création'}
          icon={panelIcon}
          related={related}
          deletable={deletable}
          saveParams={saveParams}
          extra={panelExtra}
          beforeForm={beforeForm}
          onSaved={onSaved}
        />
      )}
    </div>
  )

  if (embedded) return content
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            {actions}
            {exportName && (
              <Button icon={Download} onClick={() => window.open(`/api/exports/${exportName}.csv`, '_blank')}>Exporter</Button>
            )}
            {fields && <Button variant="primary" icon={Plus} onClick={() => setEditing({})}>{newLabel}</Button>}
          </>
        }
      />
      {content}
    </>
  )
}
