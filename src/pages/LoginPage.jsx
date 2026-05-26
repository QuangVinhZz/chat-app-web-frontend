import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MessageCircle, Eye, EyeOff, Mail, Lock, QrCode } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Spinner } from '../components/ui/Spinner'
import { authService } from '../services/authService'
import { ApiError, apiClient, tokenStorage } from '../services/apiClient'
import { useUserStore } from '../stores/userStore'
import { QRCodeSVG } from 'qrcode.react'
import { io } from 'socket.io-client'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3333/api/v1'
const SOCKET_URL = (() => {
  try {
    const url = new URL(BASE_URL)
    return `${url.protocol}//${url.host}`
  } catch {
    return 'http://localhost:3333'
  }
})()

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const flashMessage = location.state?.message
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  
  const [loginMethod, setLoginMethod] = useState('password') // 'password' | 'qr'
  const [qrContent, setQrContent] = useState('')
  const [qrStatus, setQrStatus] = useState('pending') // pending, scanned, expired
  const [qrUser, setQrUser] = useState(null)
  const socketRef = useRef(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    const savedEmail = localStorage.getItem('saved_email')
    const savedPassword = localStorage.getItem('saved_password')
    const isRemembered = localStorage.getItem('remember_me')

    if (isRemembered === 'true' && savedEmail && savedPassword) {
      setFormData({ email: savedEmail, password: savedPassword })
      setRememberMe(true)
    }
  }, [])

  const generateQrSession = async () => {
    try {
      setLoading(true)
      const data = await apiClient.post('/qr-login/generate')
      setQrContent(data.qrContent)
      setQrStatus('pending')
      setQrUser(null)
      
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
      
      console.log('[QR Login] Connecting to socket at:', SOCKET_URL)
      const socket = io(SOCKET_URL, {
        path: '/socket.io',
        transports: ['websocket'],
      })
      socketRef.current = socket
      
      socket.on('connect', () => {
        console.log('[QR Login] Socket connected successfully! Joining room:', data.sessionId)
        socket.emit('qr:join', data.sessionId)
      })
      
      socket.on('connect_error', (err) => {
        console.error('[QR Login] Socket connection error:', err.message || err)
      })
      
      socket.on('qr:scanned', (payload) => {
        console.log('[QR Login] QR code scanned by:', payload.user?.name)
        setQrStatus('scanned')
        setQrUser(payload.user)
      })
      
      socket.on('qr:confirmed', (payload) => {
        console.log('[QR Login] Login confirmed by mobile app! Redirecting to chat...')
        const { accessToken, refreshToken, user } = payload
        tokenStorage.setSession({
          token: accessToken,
          refreshToken: refreshToken,
          user: user
        })
        useUserStore.getState().setUser(user)
        socket.disconnect()
        navigate('/chat')
      })
      
      socket.on('qr:rejected', () => {
        console.warn('[QR Login] Login request rejected by user.')
        setQrStatus('pending')
        setQrUser(null)
      })
      
      socket.on('qr:expired', () => {
        console.warn('[QR Login] QR session has expired.')
        setQrStatus('expired')
        setQrUser(null)
      })
      
      setLoading(false)
    } catch (e) {
      console.error('[QR Login] Failed to generate QR session:', e)
      setError('Cannot generate QR code. Try again.')
      setLoading(false)
    }
  }

  useEffect(() => {
    if (loginMethod === 'qr') {
      generateQrSession()
    } else {
      if (socketRef.current) socketRef.current.disconnect()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
    
    return () => {
      if (socketRef.current) socketRef.current.disconnect()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [loginMethod])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    setLoading(true)

    try {
      const data = await authService.login(formData.email, formData.password)
      
      if (rememberMe) {
        localStorage.setItem('saved_email', formData.email)
        localStorage.setItem('saved_password', formData.password)
        localStorage.setItem('remember_me', 'true')
      } else {
        localStorage.removeItem('saved_email')
        localStorage.removeItem('saved_password')
        localStorage.setItem('remember_me', 'false')
      }

      useUserStore.getState().setUser(data.user)
      navigate('/chat')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setFieldErrors(err.fieldErrors)
        // If the account is not verified, steer the user to the OTP page.
        if (err.status === 403 && /verified|verify/i.test(err.message)) {
          navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`)
        }
      } else {
        setError(err.message || 'Unable to sign in. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (fieldErrors[e.target.name]) {
      setFieldErrors({ ...fieldErrors, [e.target.name]: undefined })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 lg:hidden mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <MessageCircle className="w-6 h-6 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold">ChatApp</span>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground">
          Enter your credentials or scan QR to access your account
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-lg">
        <button 
          className={`flex-1 py-2 text-sm font-medium rounded-md ${loginMethod === 'password' ? 'bg-white shadow' : 'text-gray-500'}`}
          onClick={() => setLoginMethod('password')}
        >
          Với mật khẩu
        </button>
        <button 
          className={`flex-1 py-2 text-sm font-medium rounded-md ${loginMethod === 'qr' ? 'bg-white shadow' : 'text-gray-500'}`}
          onClick={() => setLoginMethod('qr')}
        >
          Với mã QR
        </button>
      </div>

      {loginMethod === 'password' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {flashMessage && !error && (
            <div className="p-3 rounded-lg bg-primary/10 text-primary text-sm">
              {flashMessage}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                className="pl-10"
                required
              />
            </div>
            {fieldErrors.email && (
              <p className="text-xs text-destructive">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-xs text-destructive">{fieldErrors.password}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
              <Label htmlFor="rememberMe" className="text-sm font-normal text-muted-foreground cursor-pointer">
                Nhớ mật khẩu
              </Label>
            </div>
            <Link to="/forgot-password" className="text-sm text-primary font-medium hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" className="text-primary-foreground" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" type="button">
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>
            <Button variant="outline" type="button">
              <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 space-y-6">
          {error ? (
            <div className="text-center text-destructive">
              <p>{error}</p>
              <Button className="mt-4" onClick={generateQrSession}>Thử lại</Button>
            </div>
          ) : qrStatus === 'expired' ? (
            <div className="text-center">
              <div className="w-48 h-48 bg-gray-100 flex flex-col items-center justify-center rounded-lg mx-auto mb-4 border-2 border-dashed border-gray-300">
                <QrCode className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-500">Mã QR đã hết hạn</p>
              </div>
              <Button onClick={generateQrSession}>Tải lại mã QR</Button>
            </div>
          ) : (
            <>
              <div className="p-4 bg-white rounded-xl shadow-sm border">
                {qrContent ? (
                  <div className="relative">
                    <QRCodeSVG value={qrContent} size={200} />
                    {qrStatus === 'scanned' && (
                      <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center">
                        <img 
                          src={qrUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'} 
                          alt="Avatar" 
                          className="w-16 h-16 rounded-full border-4 border-primary shadow-sm mb-3" 
                        />
                        <p className="font-semibold text-gray-800 text-center">{qrUser?.name}</p>
                        <p className="text-xs text-primary mt-1 text-center font-medium">Đang chờ xác nhận...</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-50">
                    <Spinner size="lg" />
                  </div>
                )}
              </div>
              <p className="text-center text-sm text-muted-foreground max-w-xs">
                Sử dụng tính năng <strong>Quét mã QR</strong> trên ứng dụng Mobile để đăng nhập.
              </p>
            </>
          )}
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}
