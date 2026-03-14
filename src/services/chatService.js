import { conversations, messages } from '../mocks/messages.mock'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let localConversations = [...conversations]
let localMessages = JSON.parse(JSON.stringify(messages))

export const chatService = {
  async getConversations() {
    await delay(500)
    return localConversations
  },

  async getConversation(conversationId) {
    await delay(300)
    const conversation = localConversations.find((c) => c.id === conversationId)
    if (!conversation) {
      throw new Error('Conversation not found')
    }
    return conversation
  },

  async getMessages(conversationId) {
    await delay(400)
    return localMessages[conversationId] || []
  },

  async sendMessage(conversationId, message) {
    await delay(300)
    const newMessage = {
      id: 'msg-' + Date.now(),
      conversationId,
      senderId: 'user-1',
      type: message.type || 'text',
      content: message.content,
      timestamp: new Date().toISOString(),
      status: 'sent',
      ...(message.caption && { caption: message.caption }),
      ...(message.fileName && { fileName: message.fileName }),
      ...(message.fileSize && { fileSize: message.fileSize }),
    }

    if (!localMessages[conversationId]) {
      localMessages[conversationId] = []
    }
    localMessages[conversationId].push(newMessage)

    // Update conversation last message
    const convIndex = localConversations.findIndex((c) => c.id === conversationId)
    if (convIndex !== -1) {
      localConversations[convIndex] = {
        ...localConversations[convIndex],
        lastMessage: message.content,
        lastMessageTime: newMessage.timestamp,
      }
    }

    return newMessage
  },

  async markAsRead(conversationId) {
    await delay(200)
    const convIndex = localConversations.findIndex((c) => c.id === conversationId)
    if (convIndex !== -1) {
      localConversations[convIndex] = {
        ...localConversations[convIndex],
        unreadCount: 0,
      }
    }
    return true
  },

  async createConversation(participantId) {
    await delay(400)
    const existingConv = localConversations.find(
      (c) => c.type === 'direct' && c.participants.includes(participantId)
    )
    if (existingConv) {
      return existingConv
    }

    const newConv = {
      id: 'conv-' + Date.now(),
      type: 'direct',
      participants: ['user-1', participantId],
      name: '',
      avatar: '',
      lastMessage: '',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
    }
    localConversations.unshift(newConv)
    localMessages[newConv.id] = []
    return newConv
  },

  async deleteMessage(conversationId, messageId) {
    await delay(300)
    if (localMessages[conversationId]) {
      localMessages[conversationId] = localMessages[conversationId].filter(
        (m) => m.id !== messageId
      )
    }
    return true
  },

  async searchMessages(query) {
    await delay(400)
    const results = []
    Object.entries(localMessages).forEach(([convId, msgs]) => {
      msgs.forEach((msg) => {
        if (msg.type === 'text' && msg.content.toLowerCase().includes(query.toLowerCase())) {
          results.push({ ...msg, conversationId: convId })
        }
      })
    })
    return results
  },
}
