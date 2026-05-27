import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { conversationService } from '../services/conversationService'
import { useUserStore } from '../stores/userStore'
import { useConversationsStore } from '../stores/conversationsStore'
import { Spinner } from '../components/ui/Spinner'

export default function CloudPage() {
  const navigate = useNavigate()
  const user = useUserStore((s) => s.user)
  const upsertConversation = useConversationsStore((s) => s.upsert)

  useEffect(() => {
    if (!user) return
    const getOrCreateSelfChat = async () => {
      try {
        const conv = await conversationService.createDirect(user.id)
        if (conv) {
          upsertConversation(conv)
          navigate(`/chat/${conv.id}`, { replace: true })
        }
      } catch (err) {
        console.error('Failed to open My Documents:', err)
        navigate('/chat', { replace: true })
      }
    }
    getOrCreateSelfChat()
  }, [user, navigate, upsertConversation])

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background">
      <Spinner size="lg" />
      <p className="text-sm text-muted-foreground mt-4">Đang kết nối tới Tài liệu của tôi...</p>
    </div>
  )
}
