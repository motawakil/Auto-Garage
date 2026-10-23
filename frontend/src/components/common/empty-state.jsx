import { Inbox } from 'lucide-react'

export function EmptyState({ icon: Icon = Inbox, title = 'Aucun élément', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" />
        <div className="relative flex size-12 items-center justify-center rounded-2xl border border-border bg-card shadow-card">
          <Icon className="size-5 text-muted-foreground" />
        </div>
      </div>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
