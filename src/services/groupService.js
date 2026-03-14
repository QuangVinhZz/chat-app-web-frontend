import { groups } from '../mocks/groups.mock'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let localGroups = [...groups]

export const groupService = {
  async getGroups() {
    await delay(500)
    return localGroups
  },

  async getGroupById(groupId) {
    await delay(300)
    const group = localGroups.find((g) => g.id === groupId)
    if (!group) {
      throw new Error('Group not found')
    }
    return group
  },

  async createGroup(data) {
    await delay(600)
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444']
    const newGroup = {
      id: 'group-' + Date.now(),
      name: data.name,
      description: data.description || '',
      avatar: null,
      members: ['user-1', ...(data.members || [])],
      admins: ['user-1'],
      createdAt: new Date().toISOString(),
      createdBy: 'user-1',
      conversationId: null,
      color: colors[Math.floor(Math.random() * colors.length)],
    }
    localGroups.unshift(newGroup)
    return newGroup
  },

  async updateGroup(groupId, data) {
    await delay(500)
    const index = localGroups.findIndex((g) => g.id === groupId)
    if (index === -1) {
      throw new Error('Group not found')
    }
    localGroups[index] = { ...localGroups[index], ...data }
    return localGroups[index]
  },

  async deleteGroup(groupId) {
    await delay(400)
    localGroups = localGroups.filter((g) => g.id !== groupId)
    return true
  },

  async addMember(groupId, userId) {
    await delay(400)
    const index = localGroups.findIndex((g) => g.id === groupId)
    if (index === -1) {
      throw new Error('Group not found')
    }
    if (!localGroups[index].members.includes(userId)) {
      localGroups[index].members.push(userId)
    }
    return localGroups[index]
  },

  async removeMember(groupId, userId) {
    await delay(400)
    const index = localGroups.findIndex((g) => g.id === groupId)
    if (index === -1) {
      throw new Error('Group not found')
    }
    localGroups[index].members = localGroups[index].members.filter((m) => m !== userId)
    return localGroups[index]
  },

  async getGroupMembers(groupId) {
    await delay(300)
    const group = localGroups.find((g) => g.id === groupId)
    if (!group) {
      throw new Error('Group not found')
    }
    return group.members
  },
}
