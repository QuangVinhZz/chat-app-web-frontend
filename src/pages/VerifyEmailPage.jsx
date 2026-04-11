import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { MessageCircle, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Spinner } from '../components/ui/Spinner'
import { authService } from '../services/authService'
import { ApiError } from '../services/apiClient'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setFieldErrors({})
    setLoading(true)
    try {
      await authService.verifyEmail(email, otp)
      navigate('/login', {
        replace: true,
        state: { message: 'Email verified. You can sign in now.' },
      })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setFieldErrors(err.fieldErrors)
      } else {
        setError(err.message || 'Unable to verify email.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      setError('Please enter your email first.')
      return
    }
    setError('')
    setResending(true)
    try {
      await authService.resendOtp(email)
      setInfo('If the email is registered and unverified, a new code has been sent.')
    } catch (err) {
      setError(err.message || 'Unable to resend code.')
    } finally {
      setResending(false)
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
        <h1 className="text-3xl font-bold tracking-tight">Verify your email</h1>
        <p className="text-muted-foreground">
          We sent a 6-digit verification code to your email address.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        {info && (
          <div className="p-3 rounded-lg bg-primary/10 text-primary text-sm">{info}</div>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>
          {fieldErrors.email && (
            <p className="text-xs text-destructive">{fieldErrors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="otp">Verification code</Label>
          <div className="relative">
            <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="pl-10 tracking-widest"
              required
            />
          </div>
          {fieldErrors.otp && (
            <p className="text-xs text-destructive">{fieldErrors.otp}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Spinner size="sm" className="text-primary-foreground" />
              Verifying...
            </>
          ) : (
            'Verify email'
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={resending}
          onClick={handleResend}
        >
          {resending ? 'Resending...' : 'Resend code'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Back to{' '}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
