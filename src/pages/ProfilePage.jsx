import { useEffect, useRef, useState } from 'react'
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
} from 'lucide-react'
import { format } from 'date-fns'
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

export default function ProfilePage() {
  const fileInputRef = useRef(null)
  const user = useUserStore((s) => s.user)
  const setUser = useUserStore((s) => s.setUser)
  const isOnline = useUserStore((s) => s.isOnline)

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

  // --- load profile -------------------------------------------------------
  // Note: `isOnline` is driven globally by the Socket.IO connection state
  // (see userStore.js → socketService.onConnectionChange). No polling here.
  useEffect(() => {
    let cancelled = false

    const loadProfile = async () => {
      try {
        const userData = await userService.getUserProfile()
        if (cancelled) return
        setUser(userData)
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          bio: userData.bio || '',
        })
      } catch (error) {
        console.error('Failed to load profile:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProfile()
    return () => {
      cancelled = true
    }
  }, [setUser])

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
        setProfileError(err.message || 'Failed to update profile.')
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
      setAvatarError('Avatar must be a JPG or PNG image.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Avatar must be smaller than 2MB.')
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
        setAvatarError(err.message || 'Failed to upload avatar.')
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
      setPasswordFieldErrors({ password_confirmation: 'Passwords do not match' })
      return
    }
    if (passwordData.password.length < 8) {
      setPasswordFieldErrors({ password: 'Password must be at least 8 characters' })
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
        setPasswordError(err.message || 'Failed to change password.')
      }
    } finally {
      setChangingPassword(false)
    }
  }

  // --- helpers ------------------------------------------------------------
  const getInitials = (name) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  const avatarSrc = user?.avatarUrl || user?.avatar

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <header className="h-16 px-6 border-b flex items-center bg-card">
        <div>
          <h1 className="text-xl font-semibold">Profile Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Avatar Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarSrc} alt={user?.name} />
                  <AvatarFallback className="text-2xl">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-70"
                  aria-label="Change avatar"
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
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{user?.name}</h2>
                <p className="text-muted-foreground">{user?.email}</p>
                {avatarError && (
                  <p className="mt-2 text-xs text-destructive">{avatarError}</p>
                )}
              </div>
            </div>

            {/* Online indicator (driven by the Socket.IO connection state) */}
            <div className="mt-6 pt-4 border-t flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  isOnline ? 'bg-online' : 'bg-muted-foreground'
                )}
              />
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details here.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {profileError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {profileError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleProfileChange}
                      className="pl-10"
                      placeholder="Your name"
                    />
                  </div>
                  {profileFieldErrors.name && (
                    <p className="text-xs text-destructive">
                      {profileFieldErrors.name}
                    </p>
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
                      value={formData.email}
                      readOnly
                      disabled
                      className="pl-10 bg-muted/50 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    readOnly
                    disabled
                    className="pl-10 bg-muted/50 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleProfileChange}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
                {profileFieldErrors.bio && (
                  <p className="text-xs text-destructive">{profileFieldErrors.bio}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Member since{' '}
                  {user?.createdAt
                    ? format(new Date(user.createdAt), 'MMMM yyyy')
                    : 'N/A'}
                </p>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Spinner size="sm" className="text-primary-foreground mr-2" />
                      Saving...
                    </>
                  ) : saved ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Choose a strong password you don't use anywhere else.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {passwordError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {passwordError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="pl-10 pr-10"
                    placeholder="Enter your current password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.password}
                      onChange={handlePasswordChange}
                      className="pl-10"
                      placeholder="At least 8 characters"
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
                  <Label htmlFor="confirmPassword">Confirm new password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="pl-10"
                      placeholder="Repeat new password"
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

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={changingPassword}>
                  {changingPassword ? (
                    <>
                      <Spinner size="sm" className="text-primary-foreground mr-2" />
                      Updating...
                    </>
                  ) : passwordSaved ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Password updated
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Update password
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
