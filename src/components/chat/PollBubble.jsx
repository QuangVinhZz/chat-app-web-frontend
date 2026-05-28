import { useEffect, useState } from 'react'
import { BarChart3, Check, Lock, Users } from 'lucide-react'
import { cn } from '../../utils/cn'
import { pollService } from '../../services/pollService'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/Avatar'
import { getInitials } from '../../utils/format'

/**
 * Renders a poll inside a message bubble. Optimistically updates the
 * local poll on vote — the realtime `poll:updated` event will reconcile.
 */
export default function PollBubble({ poll, isOwn, currentUserId, onUpdated }) {
  const [local, setLocal] = useState(poll)
  const [busy, setBusy] = useState(false)
  const [voters, setVoters] = useState(null)
  const [showVoters, setShowVoters] = useState(false)
  const [loadingVoters, setLoadingVoters] = useState(false)

  // Re-sync when parent passes a newer reference (socket update).
  useEffect(() => {
    if (poll && poll !== local) setLocal(poll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll])

  const total = local.totalVotes || 0
  const leadingCount = Math.max(0, ...local.options.map((o) => o.voteCount ?? 0))

  const handleVote = async (optionId) => {
    if (busy || local.isClosed) return
    const wasSelected = local.options.find((o) => o.id === optionId)?.votedByMe
    let nextSelected
    if (local.allowMultiple) {
      const currentlySelected = local.options.filter((o) => o.votedByMe).map((o) => o.id)
      nextSelected = wasSelected
        ? currentlySelected.filter((id) => id !== optionId)
        : [...currentlySelected, optionId]
    } else {
      nextSelected = wasSelected ? [] : [optionId]
    }

    // Optimistic update — recompute counts off the delta vs the prior set.
    setLocal((prev) => {
      const prevSet = new Set(prev.options.filter((o) => o.votedByMe).map((o) => o.id))
      const nextSet = new Set(nextSelected)
      const options = prev.options.map((o) => {
        const wasMine = prevSet.has(o.id)
        const isMine = nextSet.has(o.id)
        let delta = 0
        if (wasMine && !isMine) delta = -1
        else if (!wasMine && isMine) delta = 1
        return { ...o, votedByMe: isMine, voteCount: (o.voteCount ?? 0) + delta }
      })
      const totalVotes = options.reduce((s, o) => s + (o.voteCount ?? 0), 0)
      return { ...prev, options, totalVotes }
    })

    setBusy(true)
    setVoters(null)
    try {
      const fresh = nextSelected.length === 0
        ? await pollService.unvote(local.id)
        : await pollService.vote(local.id, nextSelected)
      if (fresh) {
        setLocal(fresh)
        onUpdated?.(fresh)
      }
    } catch {
      try {
        const fresh = await pollService.get(local.id)
        if (fresh) setLocal(fresh)
      } catch {}
    } finally {
      setBusy(false)
    }
  }

  const handleClose = async () => {
    if (busy) return
    setBusy(true)
    try {
      const fresh = await pollService.close(local.id)
      if (fresh) {
        setLocal(fresh)
        onUpdated?.(fresh)
      }
    } finally {
      setBusy(false)
    }
  }

  const handleToggleVoters = async () => {
    const next = !showVoters
    setShowVoters(next)
    if (next && !voters) {
      setLoadingVoters(true)
      try {
        const data = await pollService.voters(local.id)
        setVoters(data)
      } catch {
        // ignore — UI just won't show voters
      } finally {
        setLoadingVoters(false)
      }
    }
  }

  const canClose = !local.isClosed && local.createdBy?.id === currentUserId
  const voterMap = new Map((voters ?? []).map((o) => [o.id, o.voters || []]))

  return (
    <div
      className={cn(
        'w-75 max-w-full rounded-2xl overflow-hidden border shadow-sm',
        isOwn
          ? 'bg-primary-foreground/95 border-primary-foreground/30 text-foreground'
          : 'bg-card border-border'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'px-4 pt-3 pb-2.5 border-b',
          isOwn ? 'border-border/40' : 'border-border'
        )}
      >
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-purple-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Bình chọn
              </p>
              {Boolean(local.isClosed) && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  <Lock className="w-2.5 h-2.5" /> Đã đóng
                </span>
              )}
              {!local.isClosed && Boolean(local.allowMultiple) && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                  Nhiều lựa chọn
                </span>
              )}
            </div>
            <p className="text-[15px] font-semibold leading-snug mt-0.5 wrap-break-word">
              {local.question}
            </p>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="px-3 py-2.5 space-y-1.5">
        {local.options.map((opt) => {
          const count = opt.voteCount ?? 0
          const pct = total > 0 ? (count / total) * 100 : 0
          const isLeading = total > 0 && count > 0 && count === leadingCount
          const optVoters = voterMap.get(opt.id) || []
          const isMine = opt.votedByMe
          const disabled = local.isClosed || busy

          return (
            <div key={opt.id}>
              <button
                type="button"
                onClick={() => handleVote(opt.id)}
                disabled={disabled}
                className={cn(
                  'group relative w-full text-left px-3 py-2.5 rounded-xl overflow-hidden transition-all border',
                  isMine
                    ? 'border-primary bg-primary/5 shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.3)]'
                    : 'border-border hover:border-muted-foreground/40 hover:bg-muted/60',
                  disabled && 'cursor-default hover:bg-transparent'
                )}
              >
                {/* Progress fill */}
                <div
                  className={cn(
                    'absolute inset-y-0 left-0 transition-[width] duration-500 ease-out',
                    isMine
                      ? 'bg-linear-to-r from-primary/25 to-primary/10'
                      : isLeading
                        ? 'bg-linear-to-r from-muted-foreground/15 to-muted-foreground/5'
                        : 'bg-muted-foreground/10'
                  )}
                  style={{ width: `${pct}%` }}
                />

                <div className="relative flex items-center gap-2.5">
                  {/* Checkbox/radio */}
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                      isMine
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/40 bg-background group-hover:border-muted-foreground/70'
                    )}
                  >
                    {isMine && <Check className="w-3 h-3" strokeWidth={3} />}
                  </div>

                  <span
                    className={cn(
                      'flex-1 text-sm leading-snug truncate',
                      isMine && 'font-semibold'
                    )}
                  >
                    {opt.text}
                  </span>

                  <span
                    className={cn(
                      'text-xs font-semibold tabular-nums shrink-0',
                      isMine ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {Math.round(pct)}%
                  </span>
                </div>
              </button>

              {/* Voter avatars under each option (when expanded) */}
              {showVoters && optVoters.length > 0 && (
                <div className="flex items-center gap-1.5 pl-9 pr-3 mt-1">
                  <div className="flex -space-x-1.5">
                    {optVoters.slice(0, 6).map((v) => (
                      <Avatar
                        key={v.id || v.name}
                        className="w-5 h-5 border-2 border-card"
                        title={v.name}
                      >
                        <AvatarImage src={v.avatarUrl} alt={v.name} />
                        <AvatarFallback className="text-[8px]">
                          {getInitials(v.name)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {optVoters.length > 6 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{optVoters.length - 6}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-1">
                    {count} lượt
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div
        className={cn(
          'flex items-center justify-between gap-2 px-4 py-2.5 border-t text-xs',
          isOwn ? 'border-border/40' : 'border-border'
        )}
      >
        <button
          type="button"
          onClick={handleToggleVoters}
          disabled={total === 0}
          className={cn(
            'inline-flex items-center gap-1.5 font-medium',
            total === 0
              ? 'text-muted-foreground cursor-default'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Users className="w-3.5 h-3.5" />
          {total} lượt vote
          {total > 0 && (
            <span className="text-[10px] text-muted-foreground/70">
              · {loadingVoters ? 'đang tải...' : showVoters ? 'ẩn' : 'xem ai vote'}
            </span>
          )}
        </button>

        {canClose ? (
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="font-semibold text-destructive hover:underline disabled:opacity-50"
          >
            Đóng bình chọn
          </button>
        ) : local.createdBy?.name ? (
          <span className="text-muted-foreground truncate max-w-[55%]" title={local.createdBy.name}>
            bởi {local.createdBy.name}
          </span>
        ) : null}
      </div>
    </div>
  )
}
