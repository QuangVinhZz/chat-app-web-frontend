import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { conversationService } from '../services/conversationService'
import { Spinner } from '../components/ui/Spinner'
import { Button } from '../components/ui/Button'

/**
 * Lands here when someone follows a group invite link (the QR/link the
 * group owner shares). Calls /conversations/join with the code, then
 * redirects into the conversation.
 */
export default function JoinPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)

  useEffect(() => {
    if (!code) return
    let cancelled = false
    conversationService
      .joinByCode(code.toUpperCase())
      .then((conv) => {
        if (cancelled) return
        if (conv?.id) navigate(`/chat/${conv.id}`, { replace: true })
        else setError('Không tìm thấy nhóm.')
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Mã không hợp lệ.')
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [code, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm text-center space-y-3">
        {busy ? (
          <>
            <Spinner />
            <p className="text-sm text-muted-foreground">Đang tham gia nhóm...</p>
          </>
        ) : (
          <>
            <p className="text-destructive font-medium">{error}</p>
            <Button onClick={() => navigate('/chat')}>Quay lại</Button>
          </>
        )}
      </div>
    </div>
  )
}
