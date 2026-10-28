import axios from 'axios'
import { toast } from 'sonner'

export const api = axios.create({ baseURL: '/api', withCredentials: true })

const AUTH_PATHS = ['/auth/login/', '/auth/refresh/', '/auth/logout/', '/auth/csrf/']

function readCookie(name) {
  return document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))?.split('=')[1]
}

// Tokens live in httpOnly cookies (never readable here); the CSRF token is echoed on every unsafe request.
api.interceptors.request.use((config) => {
  if (!['get', 'head', 'options'].includes((config.method || 'get').toLowerCase())) {
    const token = readCookie('csrftoken')
    if (token) config.headers['X-CSRFToken'] = decodeURIComponent(token)
  }
  return config
})

// Single-flight refresh: concurrent 401s wait for one refresh, then replay. (Karizma One sets its flag too late.)
let refreshing = null
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error
    const isAuthCall = AUTH_PATHS.some((p) => config?.url?.endsWith(p))
    if (response?.status !== 401 || !config || config._retry || isAuthCall) return Promise.reject(error)
    config._retry = true
    refreshing ??= api.post('/auth/refresh/').finally(() => { refreshing = null })
    try {
      await refreshing
      return api(config)
    } catch (refreshError) {
      window.dispatchEvent(new CustomEvent('auth:expired'))
      return Promise.reject(refreshError)
    }
  },
)

/** Normalises every DRF error shape ({detail}, {field: [msg]}, [msg]) into one readable message. */
export function getApiErrorMessage(error, fallback = 'Une erreur est survenue.') {
  const data = error?.response?.data
  if (!data) return error?.message || fallback
  if (typeof data === 'string') return fallback
  if (Array.isArray(data)) return data.join(' ')
  if (data.detail) return data.detail
  const first = Object.values(data)[0]
  if (Array.isArray(first)) return String(first[0])
  if (typeof first === 'string') return first
  return fallback
}

export function getFieldErrors(error) {
  const data = error?.response?.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? String(v[0]) : String(v)]))
}

export function showApiError(error, fallback) {
  if (error?.response?.status === 401) return // handled by the session layer (redirect to login)
  toast.error(getApiErrorMessage(error, fallback), error?.response?.status === 403 ? { id: 'permission-denied' } : undefined)
}

/** REST resource factory: one place for every endpoint's CRUD calls. */
export function createResource(endpoint) {
  const url = (id) => (id ? `/${endpoint}/${id}/` : `/${endpoint}/`)
  return {
    key: endpoint,
    list: (params) => api.get(url(), { params }).then((r) => r.data),
    get: (id) => api.get(url(id)).then((r) => r.data),
    create: (data, params) => api.post(url(), data, { params }).then((r) => r.data),
    update: (id, data, params) => api.patch(url(id), data, { params }).then((r) => r.data),
    remove: (id) => api.delete(url(id)).then((r) => r.data),
    action: (id, name, data, method = 'post') =>
      api.request({ url: id ? `${url(id)}${name}/` : `${url()}${name}/`, method, data, params: method === 'get' ? data : undefined }).then((r) => r.data),
  }
}

export const resources = {
  clients: createResource('clients'),
  vehicles: createResource('vehicles'),
  repairOrders: createResource('repair-orders'),
  tasks: createResource('tasks'),
  insurers: createResource('insurers'),
  experts: createResource('experts'),
  quotes: createResource('quotes'),
  invoices: createResource('invoices'),
  payments: createResource('payments'),
  parts: createResource('parts'),
  movements: createResource('stock-movements'),
  suppliers: createResource('suppliers'),
  employees: createResource('employees'),
  documents: createResource('documents'),
  oemReferences: createResource('oem-references'),
  oemEquivalences: createResource('oem-equivalences'),
}

/** Session endpoints (Karizma One style: one api object per feature). */
export const authApi = {
  csrf: () => api.get('/auth/csrf/'),
  me: () => api.get('/auth/me/').then((r) => r.data),
  login: (credentials) => api.post('/auth/login/', credentials).then((r) => r.data),
  logout: () => api.post('/auth/logout/'),
  changePassword: (data) => api.post('/auth/password/', data).then((r) => r.data),
  users: () => api.get('/auth/users/').then((r) => r.data),
}
