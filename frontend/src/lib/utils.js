import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const moneyFmt = new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const compactFmt = new Intl.NumberFormat('fr-MA', { notation: 'compact', maximumFractionDigits: 1 })

export function formatMoney(value, { currency = true, compact = false } = {}) {
  const n = Number(value || 0)
  const s = compact ? compactFmt.format(n) : moneyFmt.format(n)
  return currency ? `${s} MAD` : s
}

export function formatNumber(value) {
  return new Intl.NumberFormat('fr-MA').format(Number(value || 0))
}

export function formatDate(value, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!value) return '—'
  const d = typeof value === 'string' && value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value)
  return new Intl.DateTimeFormat('fr-FR', opts).format(d)
}

export function formatRelative(value) {
  if (!value) return ''
  const diff = (new Date(value).getTime() - Date.now()) / 1000
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })
  if (abs < 60) return "à l'instant"
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 604800) return rtf.format(Math.round(diff / 86400), 'day')
  return formatDate(value)
}

export function today() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

export function formatBytes(n) {
  if (!n) return '—'
  const u = ['o', 'Ko', 'Mo', 'Go']
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), 3)
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`
}
