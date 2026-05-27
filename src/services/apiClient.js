/**
 * Lightweight fetch-based API client for the chat-app backend.
 *
 * - Reads base URL from VITE_API_BASE_URL
 * - Attaches JWT access token from localStorage automatically
 * - Normalises backend responses to the standard shape:
 *     success: { success: true, message, data }
 *     error:   { success: false, message, errors: [{ field, message }] }
 * - Throws an `ApiError` on non-2xx so callers can `try/catch`
 * - On 401 it transparently tries `/auth/refresh` once using the stored
 *   refresh token, and retries the original request.
 */

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3333/api/v1'

const TOKEN_KEY = 'auth.token'
const REFRESH_KEY = 'auth.refreshToken'
const USER_KEY = 'auth.user'

export const tokenStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  getUser: () => {
    const raw = localStorage.getItem(USER_KEY)
    try {
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  setSession: ({ token, refreshToken, user }) => {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  setUser: (user) => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
  },
}

export class ApiError extends Error {
  constructor(status, message, errors = []) {
    super(message || 'Request failed')
    this.name = 'ApiError'
    this.status = status
    this.errors = Array.isArray(errors) ? errors : []
  }

  /** Returns a map { fieldName: message } for form-level display. */
  get fieldErrors() {
    const map = {}
    for (const e of this.errors) {
      if (e && e.field) map[e.field] = e.message
    }
    return map
  }
}

async function parseBody(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

function buildUrl(path, query) {
  const url = new URL(
    path.startsWith('http') ? path : `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  )
  if (query && typeof query === 'object') {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue
      url.searchParams.set(key, value)
    }
  }
  return url.toString()
}

let refreshInFlight = null

async function refreshAccessToken() {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) return null

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(buildUrl('/auth/refresh'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${refreshToken}`,
          },
        })
        const body = await parseBody(res)
        if (!res.ok || !body?.success) {
          tokenStorage.clear()
          return null
        }
        tokenStorage.setSession({
          token: body.data?.token,
          refreshToken: body.data?.refreshToken,
          user: body.data?.user,
        })
        return body.data?.token ?? null
      } catch {
        tokenStorage.clear()
        return null
      } finally {
        // allow next refresh cycle
        setTimeout(() => {
          refreshInFlight = null
        }, 0)
      }
    })()
  }

  return refreshInFlight
}

async function rawRequest(method, path, { body, query, headers, auth = true, isForm = false } = {}) {
  const finalHeaders = {
    Accept: 'application/json',
    ...(isForm ? {} : { 'Content-Type': 'application/json' }),
    ...(headers || {}),
  }

  if (auth) {
    const token = tokenStorage.getToken()
    if (token) finalHeaders.Authorization = `Bearer ${token}`
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  })

  const payload = await parseBody(response)

  if (!response.ok) {
    const message =
      payload?.message ||
      (response.status === 401
        ? 'Unauthorized.'
        : response.status === 403
          ? 'Forbidden.'
          : 'Request failed.')
    throw new ApiError(response.status, message, payload?.errors || [])
  }

  // success envelope → return data (fall back to full body)
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data
  }
  return payload
}

async function request(method, path, options = {}) {
  try {
    return await rawRequest(method, path, options)
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401 && options.auth !== false && !options._retried) {
        const newToken = await refreshAccessToken()
        if (newToken) {
          return rawRequest(method, path, { ...options, _retried: true })
        }
        tokenStorage.clear()
      }

      if (err.status === 403 && (err.message.includes('bị khóa') || err.message.includes('support.com'))) {
        alert(err.message || 'tài khoản của bạn đã bị khóa, hãy liên hệ với hỗ trợ viên để được mở khóa. tài khoản hỗ trợ viên: chatappN7@support.com')
        tokenStorage.clear()
        window.location.replace('/login')
        return new Promise(() => {})
      }

      // Authenticated user whose email is not yet verified — redirect to
      // the verification page so they can complete the flow.
      if (err.status === 403 && /email not verified/i.test(err.message)) {
        const user = tokenStorage.getUser()
        const email = user?.email ? `?email=${encodeURIComponent(user.email)}` : ''
        window.location.replace(`/verify-email${email}`)
        // Return a never-resolving promise so the caller doesn't process
        // a partial response while the redirect is in flight.
        return new Promise(() => {})
      }
    }
    throw err
  }
}

export const apiClient = {
  get: (path, options) => request('GET', path, options),
  post: (path, body, options) => request('POST', path, { ...(options || {}), body }),
  put: (path, body, options) => request('PUT', path, { ...(options || {}), body }),
  patch: (path, body, options) => request('PATCH', path, { ...(options || {}), body }),
  delete: (path, options) => request('DELETE', path, options),
}
