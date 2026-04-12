import { useState } from 'react'
import { Ban, ShieldOff } from 'lucide-react'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { friendService } from '../../services/friendService'

/**
 * Banner that replaces the composer when a direct conversation is
 * blocked in either direction. If the current user is the blocker,
 * offers an "Unblock" action; if blocked by the other side, just
 * shows a notice.
 */
export default function BlockNotice({
  blockedByMe,
  displayName,
  otherUserId,
  onUnblocked,
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleUnblock = async () => {
    if (!otherUserId || busy) return
    setError('')
    setBusy(true)
    try {
      await friendService.unblock(otherUserId)
      await onUnblocked?.()
    } catch (err) {
      setError(err?.message || 'Failed to unblock.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-t bg-card">
      <div className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
          <Ban className="w-5 h-5 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          {blockedByMe ? (
            <>
              <p className="text-sm font-medium">
                You have blocked {displayName || 'this user'}
              </p>
              <p className="text-xs text-muted-foreground">
                Unblock to send or receive messages again.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">You can't message this user</p>
              <p className="text-xs text-muted-foreground">
                Messages you send won't be delivered.
              </p>
            </>
          )}
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
        {blockedByMe && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnblock}
            disabled={busy || !otherUserId}
          >
            {busy ? (
              <Spinner size="sm" />
            ) : (
              <>
                <ShieldOff className="w-4 h-4 mr-2" />
                Unblock
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
