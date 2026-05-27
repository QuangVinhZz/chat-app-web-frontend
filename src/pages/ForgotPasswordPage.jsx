import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MessageCircle, Mail, KeyRound, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Spinner } from '../components/ui/Spinner'
import { authService } from '../services/authService'
import { ApiError } from '../services/apiClient'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState('email') // 'email' | 'otp'
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  // Resend OTP countdown timer
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // --- Step 1: Submit Email to request OTP ---------------------------------
  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setFieldErrors({})
    setLoading(true)

    try {
      await authService.forgotPassword(email)
      setInfo('Mã xác thực OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư!')
      setStep('otp')
      setCooldown(60) // Start 60s cooldown for resend
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setFieldErrors(err.fieldErrors)
      } else {
        setError(err.message || 'Không thể gửi yêu cầu đặt lại mật khẩu.')
      }
    } finally {
      setLoading(false)
    }
  }

  // --- Step 2: Submit OTP code to receive secure reset token ----------------
  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    setLoading(true)

    try {
      const response = await authService.verifyResetOtp(email, otp)
      const secureToken = response?.token
      
      if (!secureToken) {
        throw new Error('Không nhận được mã xác thực đặt lại mật khẩu.')
      }

      // Automatically redirect to reset password page with secure token pre-filled
      navigate(`/reset-password?token=${encodeURIComponent(secureToken)}`, {
        replace: true
      })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setFieldErrors(err.fieldErrors)
      } else {
        setError(err.message || 'Mã xác thực không hợp lệ hoặc đã hết hạn.')
      }
    } finally {
      setLoading(false)
    }
  }

  // --- Resend OTP -----------------------------------------------------------
  const handleResendOtp = async () => {
    if (cooldown > 0) return
    setError('')
    setInfo('')
    setLoading(true)

    try {
      await authService.forgotPassword(email)
      setInfo('Mã OTP mới đã được gửi lại vào email của bạn!')
      setCooldown(60)
    } catch (err) {
      setError(err.message || 'Không thể gửi lại mã OTP.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Mobile Header Logo */}
      <div className="flex items-center gap-2 lg:hidden mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <MessageCircle className="w-6 h-6 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold">ChatApp</span>
      </div>

      {/* Dynamic Title based on current step */}
      {step === 'email' ? (
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Quên mật khẩu?</h1>
          <p className="text-muted-foreground">
            Nhập email tài khoản của bạn để nhận mã xác thực OTP thiết lập lại mật khẩu.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Xác minh OTP</h1>
          <p className="text-muted-foreground leading-relaxed">
            Chúng tôi đã gửi mã xác thực 6 chữ số tới hòm thư <strong className="text-foreground">{email}</strong>.
          </p>
        </div>
      )}

      {/* Error & Info Alerts */}
      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">
          {error}
        </div>
      )}
      {info && (
        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm border border-emerald-500/20 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{info}</span>
        </div>
      )}

      {/* STEP 1: EMAIL REQUEST FORM */}
      {step === 'email' ? (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email đăng ký</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11 rounded-xl"
                required
              />
            </div>
            {fieldErrors.email && (
              <p className="text-xs text-destructive">{fieldErrors.email}</p>
            )}
          </div>

          <Button type="submit" className="w-full h-11 rounded-xl font-bold text-sm" disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" className="text-primary-foreground mr-2" />
                Đang gửi yêu cầu...
              </>
            ) : (
              'Gửi mã xác thực OTP'
            )}
          </Button>
        </form>
      ) : (
        /* STEP 2: OTP VERIFICATION FORM */
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Mã xác thực OTP (6 chữ số)</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="otp"
                name="otp"
                type="text"
                maxLength={6}
                pattern="\d{6}"
                placeholder="Nhập 6 chữ số"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="pl-10 h-11 rounded-xl tracking-widest text-center font-bold text-lg"
                required
              />
            </div>
            {fieldErrors.otp && (
              <p className="text-xs text-destructive">{fieldErrors.otp}</p>
            )}
          </div>

          <Button type="submit" className="w-full h-11 rounded-xl font-bold text-sm" disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" className="text-primary-foreground mr-2" />
                Đang kiểm tra...
              </>
            ) : (
              'Xác nhận mã OTP'
            )}
          </Button>

          {/* Helper utilities: Resend OTP and Edit Email */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-2">
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setOtp('')
                setError('')
                setInfo('')
              }}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Thay đổi email đăng ký
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={cooldown > 0}
              className={`flex items-center gap-1 font-semibold transition-colors ${
                cooldown > 0
                  ? 'text-muted-foreground/60 cursor-not-allowed'
                  : 'text-primary hover:underline'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading && cooldown === 0 ? 'animate-spin' : ''}`} />
              {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : 'Gửi lại mã OTP'}
            </button>
          </div>
        </form>
      )}

      {/* Back to Sign In Link */}
      <p className="text-center text-sm text-muted-foreground pt-4 border-t">
        Đã nhớ mật khẩu?{' '}
        <Link to="/login" className="text-primary font-bold hover:underline">
          Đăng nhập ngay
        </Link>
      </p>
    </div>
  )
}
