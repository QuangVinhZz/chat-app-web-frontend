import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Users,
  MoreVertical,
  MessageCircle,
  Settings,
  Trash2,
  UserPlus,
  Hash,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '../utils/cn'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Textarea } from '../components/ui/Textarea'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/Avatar'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/Dialog'
import { Spinner } from '../components/ui/Spinner'
import { groupService } from '../services/groupService'
import { userService } from '../services/userService'

export default function GroupsPage() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newGroup, setNewGroup] = useState({ name: '', description: '', members: [] })

  useEffect(() => {
    const loadData = async () => {
      try {
        const [groupsData, usersData] = await Promise.all([
          groupService.getGroups(),
          userService.getUsers(),
        ])
        setGroups(groupsData)
        setUsers(usersData)
      } catch (error) {
        console.error('Failed to load groups:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    if (!newGroup.name.trim()) return

    setCreating(true)
    try {
      const created = await groupService.createGroup(newGroup)
      setGroups((prev) => [created, ...prev])
      setShowCreateModal(false)
      setNewGroup({ name: '', description: '', members: [] })
    } catch (error) {
      console.error('Failed to create group:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteGroup = async (groupId) => {
    try {
      await groupService.deleteGroup(groupId)
      setGroups((prev) => prev.filter((g) => g.id !== groupId))
    } catch (error) {
      console.error('Failed to delete group:', error)
    }
  }

  const handleOpenChat = (group) => {
    if (group.conversationId) {
      navigate(`/chat/${group.conversationId}`)
    }
  }

  const handleViewMembers = (group) => {
    setSelectedGroup(group)
    setShowMembersModal(true)
  }

  const toggleMember = (userId) => {
    setNewGroup((prev) => ({
      ...prev,
      members: prev.members.includes(userId)
        ? prev.members.filter((id) => id !== userId)
        : [...prev.members, userId],
    }))
  }

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getUserById = (userId) => users.find((u) => u.id === userId)

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="h-16 px-6 border-b flex items-center justify-between bg-card">
        <div>
          <h1 className="text-xl font-semibold">Groups</h1>
          <p className="text-sm text-muted-foreground">{groups.length} groups</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Group
        </Button>
      </header>

      {/* Search */}
      <div className="p-6 pb-0">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Groups Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => (
            <Card key={group.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: group.color + '20' }}
                    >
                      <Hash className="w-6 h-6" style={{ color: group.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{group.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {group.members.length} members
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleViewMembers(group)}
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteGroup(group.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {group.description || 'No description'}
                </p>

                {/* Member Avatars */}
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {group.members.slice(0, 4).map((memberId) => {
                      const member = getUserById(memberId)
                      return (
                        <Avatar key={memberId} className="h-8 w-8 border-2 border-background">
                          <AvatarImage src={member?.avatar} alt={member?.name} />
                          <AvatarFallback className="text-xs">
                            {member ? getInitials(member.name) : '?'}
                          </AvatarFallback>
                        </Avatar>
                      )
                    })}
                    {group.members.length > 4 && (
                      <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                        <span className="text-xs font-medium">+{group.members.length - 4}</span>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenChat(group)}
                    disabled={!group.conversationId}
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Chat
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground mt-3">
                  Created {format(new Date(group.createdAt), 'MMM d, yyyy')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredGroups.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">No groups found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try a different search term' : 'Create your first group to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Add a name and description for your group, then select members.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                placeholder="Enter group name"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupDesc">Description</Label>
              <Textarea
                id="groupDesc"
                placeholder="What's this group about?"
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Add Members</Label>
              <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2">
                {users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleMember(user.id)}
                    className={cn(
                      'flex items-center gap-3 w-full p-2 rounded-lg transition-colors',
                      newGroup.members.includes(user.id) ? 'bg-primary/10' : 'hover:bg-muted'
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{user.name}</span>
                    {newGroup.members.includes(user.id) && (
                      <span className="ml-auto text-primary text-xs font-medium">Selected</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !newGroup.name.trim()}>
                {creating ? (
                  <>
                    <Spinner size="sm" className="text-primary-foreground mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Group'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Members Modal */}
      <Dialog open={showMembersModal} onOpenChange={setShowMembersModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedGroup?.name} Members</DialogTitle>
            <DialogDescription>{selectedGroup?.members.length} members in this group</DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {selectedGroup?.members.map((memberId) => {
              const member = getUserById(memberId)
              const isAdmin = selectedGroup?.admins?.includes(memberId)
              return (
                <div
                  key={memberId}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member?.avatar} alt={member?.name} />
                    <AvatarFallback>{member ? getInitials(member.name) : '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{member?.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{member?.role || 'Member'}</p>
                  </div>
                  {isAdmin && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
