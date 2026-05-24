import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/Dialog'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Label } from './ui/Label'
import { Spinner } from './ui/Spinner'
import { pollService } from '../services/pollService'
import { ApiError } from '../services/apiClient'

/**
 * Dialog for creating a poll inside a group. The poll lands in the
 * conversation as a regular message bubble carrying the poll payload.
 */
export default function CreatePollDialog({ open, onOpenChange, conversationId, onCreated }) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setQuestion('')
    setOptions(['', ''])
    setAllowMultiple(false)
    setError('')
  }, [open])

  const updateOption = (idx, value) => {
    setOptions((prev) => prev.map((o, i) => (i === idx ? value : o)))
  }

  const addOption = () => {
    if (options.length >= 20) return
    setOptions((prev) => [...prev, ''])
  }

  const removeOption = (idx) => {
    if (options.length <= 2) return
    setOptions((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const trimmedQ = question.trim()
    const trimmedOpts = options.map((o) => o.trim()).filter((o) => o.length > 0)
    if (!trimmedQ) return setError('Hãy nhập câu hỏi.')
    if (trimmedOpts.length < 2) return setError('Cần ít nhất 2 lựa chọn.')

    setSubmitting(true)
    try {
      const data = await pollService.create(conversationId, {
        question: trimmedQ,
        options: trimmedOpts,
        allowMultiple,
      })
      onCreated?.(data)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Tạo bình chọn thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo bình chọn</DialogTitle>
          <DialogDescription>
            Gửi một câu hỏi cho nhóm và để mọi người vote.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="poll-q">Câu hỏi</Label>
            <Input
              id="poll-q"
              placeholder="VD: Ăn gì trưa nay?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label>Lựa chọn</Label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder={`Lựa chọn ${idx + 1}`}
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  maxLength={300}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted shrink-0"
                    title="Xoá"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {options.length < 20 && (
              <Button type="button" variant="outline" size="sm" onClick={addOption}>
                <Plus className="w-4 h-4 mr-1" /> Thêm lựa chọn
              </Button>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allowMultiple}
              onChange={(e) => setAllowMultiple(e.target.checked)}
              className="rounded"
            />
            Cho phép chọn nhiều đáp án
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Huỷ
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner size="sm" className="text-primary-foreground mr-2" />
                  Đang tạo...
                </>
              ) : (
                'Tạo bình chọn'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
