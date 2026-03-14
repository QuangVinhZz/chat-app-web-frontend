import { useState, useEffect } from 'react'
import { Camera, Mail, User, Briefcase, Calendar, Save, Check } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '../utils/cn'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Textarea } from '../components/ui/Textarea'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/Avatar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/Select'
import { Spinner } from '../components/ui/Spinner'
import { userService } from '../services/userService'

const statusOptions = [
  { value: 'online', label: 'Online', color: 'bg-online' },
  { value: 'away', label: 'Away', color: 'bg-away' },
  { value: 'busy', label: 'Do Not Disturb', color: 'bg-busy' },
  { value: 'offline', label: 'Offline', color: 'bg-muted-foreground' },
]

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    role: '',
    status: 'online',
  })

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userData = await userService.getUserProfile()
        setUser(userData)
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          bio: userData.bio || '',
          role: userData.role || '',
          status: userData.status || 'online',
        })
      } catch (error) {
        console.error('Failed to load profile:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    try {
      const updated = await userService.updateProfile(formData)
      setUser(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to update profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (status) => {
    setFormData({ ...formData, status })
    try {
      await userService.updateStatus(status)
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

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
          <p className="text-sm text-muted-foreground">Manage your account settings and preferences</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Avatar Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="text-2xl">{getInitials(user?.name)}</AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
                <span
                  className={cn(
                    'absolute top-0 right-0 w-5 h-5 rounded-full border-4 border-card',
                    statusOptions.find((s) => s.value === formData.status)?.color
                  )}
                />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{user?.name}</h2>
                <p className="text-muted-foreground">{user?.email}</p>
                <div className="mt-2">
                  <Select value={formData.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <span className={cn('w-2 h-2 rounded-full', option.color)} />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="pl-10"
                      placeholder="Your name"
                    />
                  </div>
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
                      onChange={handleChange}
                      className="pl-10"
                      placeholder="Your email"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="pl-10"
                    placeholder="Your role or job title"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Member since {user?.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy') : 'N/A'}
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

        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Statistics</CardTitle>
            <CardDescription>Your chat activity overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">156</p>
                <p className="text-sm text-muted-foreground">Messages Sent</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">12</p>
                <p className="text-sm text-muted-foreground">Groups Joined</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">8</p>
                <p className="text-sm text-muted-foreground">Active Chats</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
