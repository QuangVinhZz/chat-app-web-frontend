import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera,
  Mail,
  User,
  Phone,
  Calendar,
  Save,
  Check,
  Lock,
  Eye,
  EyeOff,
  Settings,
  Key,
  Shield,
  HelpCircle,
  LogOut,
  Info,
  Moon,
  Cloud,
  Activity,
  ChevronRight,
  MessageSquare,
  FileText,
  Users,
  Smartphone,
  Sparkles,
  PhoneCall,
  Bell,
  Eye as EyeIcon
} from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '../utils/cn'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Textarea } from '../components/ui/Textarea'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/Avatar'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { userService } from '../services/userService'
import { authService } from '../services/authService'
import { ApiError } from '../services/apiClient'
import { useUserStore } from '../stores/userStore'
import { socketService } from '../services/socketService'

// Custom Toggle Switch Component
function Switch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const user = useUserStore((s) => s.user)
  const setUser = useUserStore((s) => s.setUser)
  const isOnline = useUserStore((s) => s.isOnline)
  const logout = useUserStore((s) => s.logout)

  const [activeTab, setActiveTab] = useState('profile')
  const [showSupportModal, setShowSupportModal] = useState(false)

  // --- form states --------------------------------------------------------
  const [loading, setLoading] = useState(!user)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileFieldErrors, setProfileFieldErrors] = useState({})
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  })

  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({})
  const [passwordSaved, setPasswordSaved] = useState(false)

  // --- settings states (synced from localStorage / user schema) ------------
  const [isPrivate, setIsPrivate] = useState(() => {
    const local = localStorage.getItem('settings:private')
    if (local !== null) return local === 'true'
    return user?.isPrivatePresence || false
  })
  const [notification, setNotification] = useState(() => {
    const local = localStorage.getItem('settings:notification')
    if (local !== null) return local === 'true'
    return true
  })
  const [darkMode, setDarkMode] = useState(() => {
    const local = localStorage.getItem('settings:dark_mode')
    if (local !== null) return local === 'true'
    return document.documentElement.classList.contains('dark')
  })

  const [stats, setStats] = useState({
    chats: 0,
    calls: 0,
    documents: 0,
    groups: 0,
  })

  // --- load profile & stats ------------------------------------------------
  useEffect(() => {
    let cancelled = false

    const loadProfileAndStats = async () => {
      try {
        const [userData, statsData] = await Promise.all([
          userService.getUserProfile(),
          userService.getUserStatistics(),
        ])
        if (cancelled) return
        setUser(userData)
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          bio: userData.bio || '',
        })
        if (statsData) {
          setStats({
            chats: statsData.chats || 0,
            calls: statsData.calls || 0,
            documents: statsData.documents || 0,
            groups: statsData.groups || 0,
          })
        }
        // Đồng bộ chế độ riêng tư từ server nếu trong localStorage chưa có
        if (localStorage.getItem('settings:private') === null) {
          setIsPrivate(userData.isPrivatePresence || false)
        }
      } catch (error) {
        console.error('Failed to load profile or stats:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProfileAndStats()
    return () => {
      cancelled = true
    }
  }, [setUser])

  // --- settings handlers ---------------------------------------------------
  const handleTogglePrivate = async (value) => {
    setIsPrivate(value)
    try {
      localStorage.setItem('settings:private', String(value))
      // Đồng bộ lên backend thông qua API REST
      await userService.updatePrivacySettings(value)
      // Đồng bộ thông qua Socket.IO
      socketService.emit('presence:toggle_privacy', { isPrivate: value })
    } catch (error) {
      console.error('Lỗi lưu/đồng bộ cài đặt chế độ riêng tư:', error)
      alert('Không thể cập nhật chế độ riêng tư lên hệ thống.')
      // Hoàn tác
      setIsPrivate(!value)
      localStorage.setItem('settings:private', String(!value))
    }
  }

  const handleToggleNotification = (value) => {
    setNotification(value)
    localStorage.setItem('settings:notification', String(value))
  }

  const handleToggleDarkMode = (value) => {
    setDarkMode(value)
    localStorage.setItem('settings:dark_mode', String(value))
    if (value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // --- profile form -------------------------------------------------------
  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setProfileError('')
    setProfileFieldErrors({})

    try {
      const updated = await userService.updateProfile({
        name: formData.name,
        bio: formData.bio,
      })
      setUser(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      if (err instanceof ApiError) {
        setProfileError(err.message)
        setProfileFieldErrors(err.fieldErrors)
      } else {
        setProfileError(err.message || 'Không thể cập nhật hồ sơ.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleProfileChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // --- avatar upload ------------------------------------------------------
  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    setAvatarError('')

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setAvatarError('Ảnh đại diện phải là ảnh định dạng JPG hoặc PNG.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Ảnh đại diện phải nhỏ hơn 2MB.')
      return
    }

    setUploadingAvatar(true)
    try {
      const updated = await userService.updateAvatar(file)
      setUser(updated)
    } catch (err) {
      if (err instanceof ApiError) {
        setAvatarError(err.message)
      } else {
        setAvatarError(err.message || 'Không thể tải ảnh đại diện lên.')
      }
    } finally {
      setUploadingAvatar(false)
    }
  }

  // --- password -----------------------------------------------------------
  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value })
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordFieldErrors({})
    setPasswordSaved(false)

    if (passwordData.password !== passwordData.confirmPassword) {
      setPasswordFieldErrors({ password_confirmation: 'Mật khẩu xác nhận không khớp' })
      return
    }
    if (passwordData.password.length < 8) {
      setPasswordFieldErrors({ password: 'Mật khẩu phải có ít nhất 8 ký tự' })
      return
    }

    setChangingPassword(true)
    try {
      await authService.changePassword(passwordData)
      setPasswordData({ currentPassword: '', password: '', confirmPassword: '' })
      setPasswordSaved(true)
      setTimeout(() => setPasswordSaved(false), 2000)
    } catch (err) {
      if (err instanceof ApiError) {
        setPasswordError(err.message)
        setPasswordFieldErrors(err.fieldErrors)
      } else {
        setPasswordError(err.message || 'Không thể đổi mật khẩu.')
      }
    } finally {
      setChangingPassword(false)
    }
  }

  // --- logout -------------------------------------------------------------
  const handleLogout = async () => {
    const confirm = window.confirm("Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này?")
    if (confirm) {
      await logout()
      navigate('/login')
    }
  }

  // --- helpers ------------------------------------------------------------
  const getInitials = (name) =>
    (name || 'Người dùng')
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  const avatarSrc = user?.avatarUrl || user?.avatar

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    )
  }

  // Define tabs configuration
  const tabs = [
    { id: 'profile', label: 'Hồ sơ & Tài khoản', icon: User, desc: 'Thông tin cá nhân, tài liệu & thống kê' },
    { id: 'options', label: 'Cài đặt & Tùy chọn', icon: Settings, desc: 'Bảo mật riêng tư, thông báo & chủ đề' },
    { id: 'security', label: 'Bảo mật & Mật khẩu', icon: Key, desc: 'Quản lý thông tin mật khẩu đăng nhập' },
    ...(user?.isAdmin ? [{ id: 'admin', label: 'Quản trị viên', icon: Shield, desc: 'Quản lý người dùng & báo cáo hệ thống' }] : []),
    { id: 'support', label: 'Trợ giúp & Thông tin', icon: HelpCircle, desc: 'Liên hệ hỗ trợ, AI chatbot & phiên bản' }
  ]

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
      {/* Header */}
      <header className="h-16 px-6 pl-16 md:pl-6 border-b flex items-center bg-card shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Cài đặt hệ thống</h1>
          <p className="text-xs text-muted-foreground">
            Quản lý hồ sơ, cấu hình bảo mật riêng tư và các chức năng ứng dụng
          </p>
        </div>
      </header>

      {/* Main Settings Body */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left Sidebar Category Tabs */}
        <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r bg-card flex flex-col shrink-0 min-h-0">
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            {tabs.map((tab) => {
              const TabIcon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full text-left flex items-start gap-3.5 p-3 rounded-xl transition-all duration-200 group",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <TabIcon className={cn("w-5 h-5 mt-0.5 shrink-0 transition-transform group-hover:scale-105", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{tab.label}</p>
                    <p className={cn("text-[11px] truncate mt-0.5", isActive ? "text-primary-foreground/80" : "text-muted-foreground/70 group-hover:text-muted-foreground")}>{tab.desc}</p>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 mt-1 shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity", isActive ? "text-primary-foreground opacity-100" : "text-muted-foreground")} />
                </button>
              )
            })}
          </nav>

          {/* Quick Logout Banner */}
          <div className="p-4 border-t shrink-0">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 font-semibold text-sm shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất tài khoản
            </button>
          </div>
        </aside>

        {/* Right Details Panel */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-muted/20">
          <div className="max-w-2xl mx-auto space-y-6">

            {/* TAB: PROFILE & ACCOUNT */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Avatar Banner Card */}
                <Card className="overflow-hidden border shadow-sm">
                  <div className="h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative" />
                  <CardContent className="pt-0 relative px-6 pb-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-10 mb-4">
                      <div className="relative">
                        <Avatar className="h-24 w-24 ring-4 ring-background shadow-md">
                          <AvatarImage src={avatarSrc} alt={user?.name} />
                          <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                            {getInitials(user?.name)}
                          </AvatarFallback>
                        </Avatar>
                        <button
                          type="button"
                          onClick={handleAvatarClick}
                          disabled={uploadingAvatar}
                          className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 hover:scale-105 transition-all disabled:opacity-70"
                          aria-label="Thay đổi ảnh đại diện"
                        >
                          {uploadingAvatar ? (
                            <Spinner size="sm" className="text-primary-foreground" />
                          ) : (
                            <Camera className="w-4 h-4" />
                          )}
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/jpg"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </div>
                      <div className="text-center sm:text-left flex-1">
                        <h2 className="text-xl font-bold leading-tight">{user?.name}</h2>
                        <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
                          <Mail className="w-3.5 h-3.5" />
                          {user?.email}
                        </p>
                        {avatarError && (
                          <p className="mt-2 text-xs text-destructive bg-destructive/5 py-1 px-2.5 rounded border border-destructive/10 inline-block">{avatarError}</p>
                        )}
                      </div>
                    </div>

                    {/* Online indicator */}
                    <div className="pt-4 border-t flex items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full ring-2 ring-background',
                          isOnline ? 'bg-online animate-pulse' : 'bg-muted-foreground'
                        )}
                      />
                      <span className="font-medium">
                        Trạng thái kết nối: {isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Tài liệu của tôi (Cloud) Shortcut */}
                <div
                  onClick={() => navigate('/cloud')}
                  className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-primary/40 flex items-center gap-4"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                      Tài liệu của tôi (Cloud)
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      Lưu trữ file, hình ảnh & lời nhắc nhanh cho riêng bạn
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-200 shrink-0">
                    Mở Cloud
                  </Button>
                </div>

                {/* Activity Stats Grid (Sync from mobile Account statistics) */}
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-500" />
                      Thống kê hoạt động của tôi
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Chỉ số tương tác tổng quan trên tài khoản Web của bạn
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Stat 1: Chats */}
                      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 hover:border-blue-500/30 hover:scale-[1.02] transition-all flex flex-col items-center text-center">
                        <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <span className="text-xl font-extrabold text-foreground">{stats.chats}</span>
                        <span className="text-[11px] font-medium text-muted-foreground mt-0.5">Trò chuyện</span>
                      </div>

                      {/* Stat 2: Calls */}
                      <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/30 hover:scale-[1.02] transition-all flex flex-col items-center text-center">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
                          <PhoneCall className="w-4 h-4" />
                        </div>
                        <span className="text-xl font-extrabold text-foreground">{stats.calls}</span>
                        <span className="text-[11px] font-medium text-muted-foreground mt-0.5">Cuộc gọi</span>
                      </div>

                      {/* Stat 3: Documents */}
                      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/30 hover:scale-[1.02] transition-all flex flex-col items-center text-center">
                        <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="text-xl font-extrabold text-foreground">{stats.documents}</span>
                        <span className="text-[11px] font-medium text-muted-foreground mt-0.5">Tài liệu</span>
                      </div>

                      {/* Stat 4: Groups */}
                      <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 hover:border-purple-500/30 hover:scale-[1.02] transition-all flex flex-col items-center text-center">
                        <div className="w-9 h-9 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center mb-2">
                          <Users className="w-4 h-4" />
                        </div>
                        <span className="text-xl font-extrabold text-foreground">{stats.groups}</span>
                        <span className="text-[11px] font-medium text-muted-foreground mt-0.5">Nhóm tham gia</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Profile Form */}
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Thông tin chi tiết</CardTitle>
                    <CardDescription className="text-xs">Cập nhật thông tin cá nhân và giới thiệu của bạn.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                      {profileError && (
                        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                          {profileError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-xs font-semibold">Họ và tên</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="name"
                              name="name"
                              value={formData.name}
                              onChange={handleProfileChange}
                              className="pl-10 h-10 rounded-xl"
                              placeholder="Tên của bạn"
                            />
                          </div>
                          {profileFieldErrors.name && (
                            <p className="text-xs text-destructive">
                              {profileFieldErrors.name}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-xs font-semibold">Email tài khoản</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              value={formData.email}
                              readOnly
                              disabled
                              className="pl-10 h-10 rounded-xl bg-muted/50 cursor-not-allowed border-dashed"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-xs font-semibold">Số điện thoại đăng ký</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            readOnly
                            disabled
                            className="pl-10 h-10 rounded-xl bg-muted/50 cursor-not-allowed border-dashed"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio" className="text-xs font-semibold">Giới thiệu ngắn</Label>
                        <Textarea
                          id="bio"
                          name="bio"
                          value={formData.bio}
                          onChange={handleProfileChange}
                          placeholder="Hãy chia sẻ điều gì đó thú vị về bản thân..."
                          rows={3}
                          className="rounded-xl resize-none"
                        />
                        {profileFieldErrors.bio && (
                          <p className="text-xs text-destructive">{profileFieldErrors.bio}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground/80" />
                          Thành viên từ{' '}
                          {user?.createdAt
                            ? format(new Date(user.createdAt), 'MMMM yyyy', { locale: vi })
                            : 'Không rõ'}
                        </p>
                        <Button type="submit" disabled={saving} className="rounded-xl shadow-sm px-5 h-9 font-semibold">
                          {saving ? (
                            <>
                              <Spinner size="sm" className="text-primary-foreground mr-2" />
                              Đang lưu...
                            </>
                          ) : saved ? (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Đã lưu!
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Lưu thay đổi
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB: OPTIONS & SETTINGS */}
            {activeTab === 'options' && (
              <div className="space-y-6">
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Settings className="w-4 h-4 text-primary" />
                      Cấu hình và Tùy chọn ứng dụng
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Tùy chỉnh chế độ hoạt động, thông báo đẩy và chủ đề hiển thị hệ thống
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="divide-y p-0">

                    {/* Row 1: Privacy Mode */}
                    <div className="flex items-start gap-4 p-5 hover:bg-muted/10 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
                        <EyeIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                          <h4 className="text-sm font-semibold text-foreground">Chế độ riêng tư</h4>
                          <Switch checked={isPrivate} onChange={handleTogglePrivate} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Khi bật, trạng thái trực tuyến (online) và dấu chấm xanh của bạn sẽ không hiển thị đối với những người dùng khác. Trạng thái của bạn sẽ luôn báo ngoại tuyến (offline) để bảo mật sự riêng tư.
                        </p>
                      </div>
                    </div>

                    {/* Row 2: Notifications */}
                    <div className="flex items-start gap-4 p-5 hover:bg-muted/10 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                          <h4 className="text-sm font-semibold text-foreground">Thông báo ứng dụng</h4>
                          <Switch checked={notification} onChange={handleToggleNotification} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Tắt/bật các thông báo dạng Toast (banner góc màn hình) và Native Browser Notifications khi bạn ở tab khác. Các thông báo vẫn được lưu vào chuông lịch sử bình thường.
                        </p>
                      </div>
                    </div>

                    {/* Row 3: Dark Mode */}
                    <div className="flex items-start gap-4 p-5 hover:bg-muted/10 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                        <Moon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                          <h4 className="text-sm font-semibold text-foreground">Giao diện tối (Dark mode)</h4>
                          <Switch checked={darkMode} onChange={handleToggleDarkMode} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Kích hoạt màu nền tối trên toàn bộ ứng dụng giúp hạn chế mỏi mắt khi sử dụng vào ban đêm và tiết kiệm điện năng cho thiết bị của bạn.
                        </p>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB: SECURITY & PASSWORD */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-500" />
                      Đổi mật khẩu
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Chọn một mật khẩu mạnh mà bạn không sử dụng ở nơi nào khác để bảo vệ tài khoản của bạn.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      {passwordError && (
                        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                          {passwordError}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="currentPassword" className="text-xs font-semibold">Mật khẩu hiện tại</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="currentPassword"
                            name="currentPassword"
                            type={showPassword ? 'text' : 'password'}
                            value={passwordData.currentPassword}
                            onChange={handlePasswordChange}
                            className="pl-10 pr-10 h-10 rounded-xl"
                            placeholder="Nhập mật khẩu hiện tại"
                            autoComplete="current-password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {passwordFieldErrors.current_password && (
                          <p className="text-xs text-destructive">
                            {passwordFieldErrors.current_password}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="password" className="text-xs font-semibold">Mật khẩu mới</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="password"
                              name="password"
                              type={showPassword ? 'text' : 'password'}
                              value={passwordData.password}
                              onChange={handlePasswordChange}
                              className="pl-10 h-10 rounded-xl"
                              placeholder="Ít nhất 8 ký tự"
                              autoComplete="new-password"
                              required
                            />
                          </div>
                          {passwordFieldErrors.password && (
                            <p className="text-xs text-destructive">
                              {passwordFieldErrors.password}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword" className="text-xs font-semibold">Xác nhận mật khẩu mới</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="confirmPassword"
                              name="confirmPassword"
                              type={showPassword ? 'text' : 'password'}
                              value={passwordData.confirmPassword}
                              onChange={handlePasswordChange}
                              className="pl-10 h-10 rounded-xl"
                              placeholder="Nhập lại mật khẩu mới"
                              autoComplete="new-password"
                              required
                            />
                          </div>
                          {passwordFieldErrors.password_confirmation && (
                            <p className="text-xs text-destructive">
                              {passwordFieldErrors.password_confirmation}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end pt-4 border-t">
                        <Button type="submit" disabled={changingPassword} className="rounded-xl shadow-sm px-5 h-9 font-semibold">
                          {changingPassword ? (
                            <>
                              <Spinner size="sm" className="text-primary-foreground mr-2" />
                              Đang cập nhật...
                            </>
                          ) : passwordSaved ? (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Đã cập nhật mật khẩu
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4 mr-2" />
                              Cập nhật mật khẩu
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB: ADMIN PANELS (Shown if user is Admin) */}
            {activeTab === 'admin' && user?.isAdmin && (
              <div className="space-y-6">
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Shield className="w-4 h-4 text-rose-500 animate-pulse" />
                      Cổng Quản trị viên hệ thống
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Công cụ điều hành người dùng, xem báo cáo và kiểm soát các chỉ số dịch vụ
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Link 1: Dashboard */}
                    <div
                      onClick={() => navigate('/admin')}
                      className="group p-4 rounded-xl border bg-card hover:bg-muted/30 hover:border-primary/30 transition-all flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Activity className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold group-hover:text-primary transition-colors">Bảng điều khiển chung</h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Xem biểu đồ, cấu hình máy chủ & log hoạt động</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>

                    {/* Link 2: User Manager */}
                    <div
                      onClick={() => navigate('/admin/users')}
                      className="group p-4 rounded-xl border bg-card hover:bg-muted/30 hover:border-primary/30 transition-all flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Users className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold group-hover:text-primary transition-colors">Quản lý người dùng</h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Khóa/mở khóa tài khoản, phân quyền và chỉnh sửa thông tin thành viên</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>

                    {/* Link 3: Reports */}
                    <div
                      onClick={() => navigate('/admin/reports')}
                      className="group p-4 rounded-xl border bg-card hover:bg-muted/30 hover:border-primary/30 transition-all flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Shield className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold group-hover:text-primary transition-colors">Quản lý Báo cáo (Reports)</h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Xem danh sách tố cáo thành viên vi phạm nội quy trò chuyện</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB: SUPPORT & INFO */}
            {activeTab === 'support' && (
              <div className="space-y-6">
                {/* Support Card */}
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-indigo-500" />
                      Trợ giúp & Phản hồi liên hệ
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Mọi thắc mắc hoặc sự cố về kỹ thuật cần phản ánh, vui lòng liên hệ ban quản trị
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">

                    {/* Contacts info grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="p-4 rounded-xl border bg-muted/20 flex flex-col justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">Email Hỗ trợ trực</span>
                        <span className="text-sm font-bold text-primary mt-2">chatappN7@support.com</span>
                      </div>
                      <div className="p-4 rounded-xl border bg-muted/20 flex flex-col justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">Đường dây nóng (Hotline)</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-2">0987 654 321</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-3">
                      <div>
                        <h5 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          Trò chuyện với Trợ lý ảo AI
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                        </h5>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Tự động trả lời câu hỏi và hướng dẫn khắc phục nhanh 24/7
                        </p>
                      </div>
                      <Button size="sm" onClick={() => navigate('/ai')} className="rounded-xl shadow-sm px-4 shrink-0 bg-indigo-600 hover:bg-indigo-700">
                        Hỏi AI ngay
                      </Button>
                    </div>

                    <div className="pt-4 border-t flex justify-end">
                      <Button variant="outline" onClick={() => setShowSupportModal(true)} className="rounded-xl text-xs h-9 px-4">
                        Trung tâm hỗ trợ (Xem chi tiết)
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* App Version Info */}
                <Card className="border shadow-sm overflow-hidden">
                  <div className="px-5 py-4 bg-muted/40 border-b flex items-center gap-2.5">
                    <Info className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-bold text-foreground">Thông tin sản phẩm</span>
                  </div>
                  <CardContent className="p-5 divide-y text-xs">
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-muted-foreground font-medium">Tên ứng dụng</span>
                      <span className="font-bold text-foreground">ChatApp Web Messenger</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-muted-foreground font-medium">Phiên bản hiện tại</span>
                      <span className="font-extrabold text-foreground px-2 py-0.5 rounded bg-muted">1.0.0 (Stable)</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-muted-foreground font-medium">Đội ngũ phát triển</span>
                      <span className="font-semibold text-foreground">ChatApp N7 Team</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-muted-foreground font-medium">Môi trường</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">Production Web Client</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* SUPPORT MODAL (GORGEOUS GLASSMORPHIC DIALOG) */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-card border rounded-2xl shadow-xl overflow-hidden animate-scale-up">
            <div className="p-5 bg-primary text-primary-foreground relative">
              <h3 className="text-lg font-bold">Trung tâm Trợ giúp & Phản hồi</h3>
              <p className="text-xs text-primary-foreground/80 mt-1">Dịch vụ giải đáp nhanh các thắc mắc về ChatApp</p>
              <button
                onClick={() => setShowSupportModal(false)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors text-white font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm leading-relaxed">
              <div className="flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-xs">Hỗ trợ 24/7 tức thì</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ban quản trị luôn tiếp nhận các vấn đề liên quan tới tài khoản bị khóa, lỗi kết nối hoặc vi phạm bản quyền.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-xs">Cải tiến AI Chatbot</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Bạn có thể gửi câu hỏi và trò chuyện trực tiếp với Trợ lý AI ở mục menu ngoài Sidebar để nhận được sự hỗ trợ tìm kiếm câu trả lời nhanh chóng nhất.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted border text-center text-xs mt-2">
                <p className="font-semibold text-foreground">Liên hệ Trực tiếp ban quản trị:</p>
                <p className="text-primary font-bold mt-1.5 text-sm">chatappN7@support.com</p>
                <p className="text-muted-foreground mt-0.5">Điện thoại khẩn cấp: <strong className="text-foreground">0987 654 321</strong></p>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end bg-muted/40">
              <Button onClick={() => setShowSupportModal(false)} className="rounded-xl h-9 px-5">
                Đóng hộp thoại
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
