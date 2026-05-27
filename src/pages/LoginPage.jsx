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
        navigate('/admin')
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
      navigate('/admin')
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
