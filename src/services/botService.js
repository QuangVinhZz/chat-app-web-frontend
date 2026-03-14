const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const botResponses = [
  "I'm here to help! What would you like to know?",
  "That's an interesting question. Let me think about it...",
  "Great point! Here's what I can tell you about that.",
  "I understand. Would you like me to elaborate further?",
  "Thanks for sharing! Is there anything specific you'd like to explore?",
  "I can definitely help with that. Here are some options...",
  "That sounds like a good plan. Shall we proceed?",
  "Let me check that for you. One moment please...",
  "Based on what you've told me, I would suggest...",
  "Absolutely! Here's what I found for you.",
]

const contextualResponses = {
  hello: "Hello! Great to see you. How can I assist you today?",
  hi: "Hi there! What can I help you with?",
  help: "I'm your AI assistant. I can help you with questions about the app, provide information, or just chat. What would you like to know?",
  thanks: "You're welcome! Let me know if you need anything else.",
  bye: "Goodbye! Feel free to come back anytime you need assistance.",
  weather: "I'm a chat assistant, so I can't check real weather data, but I'd recommend checking your favorite weather app!",
  time: `The current time is ${new Date().toLocaleTimeString()}. Is there anything else you'd like to know?`,
  date: `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. How can I help you?`,
  joke: "Why do programmers prefer dark mode? Because light attracts bugs! Would you like another one?",
  quote: "Here's a quote for you: 'The only way to do great work is to love what you do.' - Steve Jobs",
}

export const botService = {
  async getBotResponse(userMessage) {
    await delay(1000 + Math.random() * 1500)
    
    const lowerMessage = userMessage.toLowerCase().trim()
    
    // Check for contextual responses
    for (const [keyword, response] of Object.entries(contextualResponses)) {
      if (lowerMessage.includes(keyword)) {
        return {
          id: 'bot-msg-' + Date.now(),
          conversationId: 'conv-bot',
          senderId: 'bot',
          type: 'text',
          content: response,
          timestamp: new Date().toISOString(),
          status: 'read',
        }
      }
    }
    
    // Return random response
    const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)]
    
    return {
      id: 'bot-msg-' + Date.now(),
      conversationId: 'conv-bot',
      senderId: 'bot',
      type: 'text',
      content: randomResponse,
      timestamp: new Date().toISOString(),
      status: 'read',
    }
  },

  async getWelcomeMessage() {
    await delay(500)
    return {
      id: 'bot-welcome',
      conversationId: 'conv-bot',
      senderId: 'bot',
      type: 'text',
      content: "Hello! I'm your AI assistant. I can help answer questions, provide information, or just have a friendly chat. What would you like to talk about?",
      timestamp: new Date().toISOString(),
      status: 'read',
    }
  },
}
