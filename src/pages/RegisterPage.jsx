import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MessageCircle, Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Spinner } from '../components/ui/Spinner'
import { authService } from '../services/authService'
import { ApiError } from '../services/apiClient'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [showTerms, setShowTerms] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    if (!/^\+?[0-9\s\-()]{8,20}$/.test(formData.phone.trim())) {
      setFieldErrors({ phone: 'Vui lòng nhập số điện thoại hợp lệ' })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setFieldErrors({ password_confirmation: 'Mật khẩu không khớp' })
      return
    }

    if (formData.password.length < 8) {
      setFieldErrors({ password: 'Mật khẩu phải có ít nhất 8 ký tự' })
      return
    }

    if (!formData.acceptedTerms) {
      setFieldErrors({ acceptedTerms: 'Bạn phải đồng ý với các điều khoản sử dụng' })
      return
    }

    setLoading(true)

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
        accepted_terms: formData.acceptedTerms,
      };
      await authService.register(payload)
      // Backend sends a 6-digit OTP to the user's email. Redirect
      // to the verification screen with the email pre-filled.
      navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setFieldErrors(err.fieldErrors)
      } else {
        setError(err.message || 'Không thể tạo tài khoản. Vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setFormData({ ...formData, [name]: newValue })
    const key = name
    if (fieldErrors[key] || fieldErrors.password_confirmation || fieldErrors.accepted_terms) {
      setFieldErrors({ ...fieldErrors, [key]: undefined, password_confirmation: undefined, accepted_terms: undefined })
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
        <h1 className="text-3xl font-bold tracking-tight">Tạo tài khoản</h1>
        <p className="text-muted-foreground">
          Nhập thông tin của bạn để bắt đầu với ChatApp
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Họ và Tên</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Nguyễn Văn A"
              value={formData.name}
              onChange={handleChange}
              className="pl-10"
              required
            />
          </div>
          {fieldErrors.name && (
            <p className="text-xs text-destructive">{fieldErrors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="nguoidung@example.com"
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
          <Label htmlFor="phone">Số điện thoại</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+84 912 345 678"
              value={formData.phone}
              onChange={handleChange}
              className="pl-10"
              required
            />
          </div>
          {fieldErrors.phone && (
            <p className="text-xs text-destructive">{fieldErrors.phone}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Mật khẩu</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Tạo mật khẩu"
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

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Xác nhận mật khẩu của bạn"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="pl-10"
              required
            />
          </div>
          {fieldErrors.password_confirmation && (
            <p className="text-xs text-destructive">{fieldErrors.password_confirmation}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="acceptedTerms"
              name="acceptedTerms"
              checked={formData.acceptedTerms}
              onChange={handleChange}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
            <Label htmlFor="acceptedTerms" className="text-sm font-normal text-muted-foreground cursor-pointer">
              Tôi đồng ý với các{' '}
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); setShowTerms(true); }}
                className="text-primary font-medium hover:underline"
              >
                điều khoản sử dụng
              </button>
            </Label>
          </div>
          {fieldErrors.accepted_terms && (
            <p className="text-xs text-destructive">{fieldErrors.accepted_terms}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Spinner size="sm" className="text-primary-foreground" />
              Đang tạo tài khoản...
            </>
          ) : (
            'Tạo tài khoản'
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Đã có tài khoản?{' '}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Đăng nhập
        </Link>
      </p>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-lg border border-border">
            <div className="p-4 border-b flex justify-between items-center bg-primary text-primary-foreground">
              <h2 className="text-lg font-bold">Điều khoản sử dụng</h2>
              <button onClick={() => setShowTerms(false)} className="hover:opacity-80">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-sm text-foreground">
              <div>
                <h3 className="font-bold text-base mb-1">1. Chấp nhận điều khoản</h3>
                <p>Khi đăng ký tài khoản hoặc sử dụng ứng dụng, người dùng đồng ý tuân thủ toàn bộ Điều khoản sử dụng này và các chính sách liên quan của ứng dụng.</p>
              </div>
              
              <div>
                <h3 className="font-bold text-base mb-1">2. Tài khoản người dùng</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Người dùng phải cung cấp thông tin chính xác khi đăng ký tài khoản.</li>
                  <li>Người dùng tự chịu trách nhiệm bảo mật tài khoản và mật khẩu.</li>
                  <li>Không được sử dụng tài khoản của người khác khi chưa được cho phép.</li>
                  <li>Ứng dụng có quyền khóa hoặc xóa tài khoản nếu phát hiện vi phạm.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-base mb-1">3. Quy tắc sử dụng</h3>
                <p className="mb-1">Người dùng cam kết không:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Đăng tải nội dung vi phạm pháp luật.</li>
                  <li>Xúc phạm, quấy rối, đe dọa người khác.</li>
                  <li>Phát tán virus, mã độc hoặc spam.</li>
                  <li>Mạo danh cá nhân hoặc tổ chức khác.</li>
                  <li>Thu thập dữ liệu trái phép từ hệ thống.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-base mb-1">4. Nội dung người dùng</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Người dùng chịu trách nhiệm đối với nội dung đã gửi hoặc đăng tải.</li>
                  <li>Ứng dụng có quyền xóa nội dung vi phạm mà không cần báo trước.</li>
                  <li>Người dùng cấp quyền cho ứng dụng lưu trữ và xử lý dữ liệu phục vụ hoạt động hệ thống.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-base mb-1">5. Quyền riêng tư</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Thông tin cá nhân được thu thập và xử lý theo Chính sách bảo mật.</li>
                  <li>Ứng dụng cam kết không bán thông tin người dùng cho bên thứ ba trái phép.</li>
                  <li>Dữ liệu có thể được cung cấp cho cơ quan chức năng khi pháp luật yêu cầu.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-base mb-1">6. Quyền sở hữu trí tuệ</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Mọi giao diện, logo, mã nguồn và nội dung thuộc quyền sở hữu của ứng dụng.</li>
                  <li>Người dùng không được sao chép hoặc sử dụng trái phép.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-base mb-1">7. Giới hạn trách nhiệm</h3>
                <p className="mb-1">Ứng dụng không chịu trách nhiệm đối với:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Mất dữ liệu do lỗi thiết bị hoặc mạng.</li>
                  <li>Nội dung do người dùng đăng tải.</li>
                  <li>Thiệt hại phát sinh từ việc sử dụng trái phép tài khoản.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-base mb-1">8. Tạm ngừng hoặc chấm dứt dịch vụ</h3>
                <p className="mb-1">Ứng dụng có quyền:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Tạm khóa tài khoản vi phạm.</li>
                  <li>Ngừng cung cấp dịch vụ để bảo trì hoặc nâng cấp hệ thống.</li>
                  <li>Chấm dứt tài khoản nếu người dùng vi phạm nghiêm trọng điều khoản.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-base mb-1">9. Thay đổi điều khoản</h3>
                <p>Điều khoản có thể được cập nhật theo thời gian. Người dùng tiếp tục sử dụng ứng dụng đồng nghĩa với việc chấp nhận các thay đổi mới.</p>
              </div>

              <div>
                <h3 className="font-bold text-base mb-1">10. Liên hệ hỗ trợ</h3>
                <p className="mb-1">Mọi thắc mắc vui lòng liên hệ:</p>
                <p>Email: support@chatapN7.com</p>
                <p>Hotline: 1900 1234</p>
              </div>
            </div>
            <div className="p-4 border-t border-border bg-muted/10">
              <Button type="button" className="w-full" onClick={() => setShowTerms(false)}>Đóng</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
