const BASE = import.meta.env.DEV ? '/api' : '/api'

export function getAdminToken() {
  return localStorage.getItem('admin_token') || ''
}
export function setAdminToken(token) {
  localStorage.setItem('admin_token', token)
}
export function clearAdminToken() {
  localStorage.removeItem('admin_token')
}

export async function apiFetch(path, options = {}) {
  const method = options.method || 'GET'
  const needsBody = method === 'POST' || method === 'PUT'
  const token = getAdminToken()
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      ...(needsBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'x-admin-token': token } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '요청 실패')
  }
  return res.json()
}

export const api = {
  getStats: (year, month) => apiFetch(`/stats?year=${year}&month=${month}`),
  getViewerStats: (year, month) => apiFetch(`/viewer-stats?year=${year}&month=${month}`),
  getCrews: () => apiFetch('/crews'),
  createCrew: (data) => apiFetch('/crews', { method: 'POST', body: data }),
  updateCrew: (id, data) => apiFetch(`/crews/${id}`, { method: 'PUT', body: data }),
  deleteCrew: (id) => apiFetch(`/crews/${id}`, { method: 'DELETE' }),
  getMembers: () => apiFetch('/members'),
  createMember: (data) => apiFetch('/members', { method: 'POST', body: data }),
  updateMember: (id, data) => apiFetch(`/members/${id}`, { method: 'PUT', body: data }),
  deleteMember: (id) => apiFetch(`/members/${id}`, { method: 'DELETE' }),
  collect: () => apiFetch('/collect', { method: 'POST' }),
  collectPrev: () => apiFetch('/collect-prev', { method: 'POST' }),
  importNaksoo: () => apiFetch('/import-naksoo', { method: 'POST' }),
  syncDiff: () => apiFetch('/sync-naksoo/diff'),
  syncApply: (data) => apiFetch('/sync-naksoo/apply', { method: 'POST', body: data }),
  adminLogin: (password) => apiFetch('/admin/login', { method: 'POST', body: { password } }),
  getBackups: () => apiFetch('/backups'),
  restoreBackup: (name) => apiFetch('/backups/restore', { method: 'POST', body: { name } }),
  getUnknownCrews: () => apiFetch('/unknown-crews'),
  deleteUnknownCrew: (id) => apiFetch(`/unknown-crews/${id}`, { method: 'DELETE' }),
  getFanRanking: (soopId, year, month) => apiFetch(`/fan-ranking/${soopId}?year=${year}&month=${month}`),
  updateProfiles: () => apiFetch('/update-profiles', { method: 'POST' }),
  lastCollected: () => apiFetch('/last-collected'),
  changePassword: (newPassword) => apiFetch('/admin/change-password', { method: 'POST', body: { newPassword } }),
}

