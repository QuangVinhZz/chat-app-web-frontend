import { apiClient, tokenStorage, ApiError } from './apiClient'

/**
 * Auth service — wraps the backend AuthController endpoints.
 * All methods return plain objects; on failure they throw ApiError
 * (see apiClient.js) so pages can render field-level errors.
 */
export const authService = {
  async login(email, password) {
    const data = await apiClient.post(
      '/auth/login',
      { email, password, device_type: 'web' },
      { auth: false }
    )
    tokenStorage.setSession({
      token: data.token,
      refreshToken: data.refreshToken,
      user: data.user,
    })
    return data
  },

  async register(payload) {
    const data = await apiClient.post(
      '/auth/register',
      payload,
      { auth: false }
    )
    return data // { user }
  },

  async verifyEmail(email, otp) {
    return apiClient.post('/auth/verify-email', { email, otp }, { auth: false })
  },

  async resendOtp(email) {
    return apiClient.post('/auth/resend-otp', { email }, { auth: false })
  },

  async forgotPassword(email) {
    return apiClient.post('/auth/forgot-password', { email }, { auth: false })
  },

  async verifyResetOtp(email, otp) {
    return apiClient.post('/auth/verify-reset-otp', { email, otp }, { auth: false })
  },

  async resetPassword({ token, password, confirmPassword }) {
    return apiClient.post(
      '/auth/reset-password',
      {
        token,
        password,
        password_confirmation: confirmPassword,
      },
      { auth: false }
    )
  },

  async changePassword({ currentPassword, password, confirmPassword }) {
    return apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      password,
      password_confirmation: confirmPassword,
      device_type: 'web',
    })
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout', {})
    } catch (err) {
      // Even if the server call fails (expired token etc.) we still
      // want to wipe the local session.
      if (!(err instanceof ApiError)) throw err
    } finally {
      tokenStorage.clear()
    }
  },

  getStoredUser: () => tokenStorage.getUser(),
  getToken: () => tokenStorage.getToken(),
  isAuthenticated: () => Boolean(tokenStorage.getToken()),
  clearSession: () => tokenStorage.clear(),
}
