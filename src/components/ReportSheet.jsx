import { useState } from 'react'
import { X } from 'lucide-react'
import { reportContent } from '../lib/api'

const REASONS = [
  'Spam or advertisement',
  'Inappropriate content',
  'Harassment or bullying',
  'Fake account',
  'Other',
]

export default function ReportSheet({ reportedUserId, postId, onClose }) {
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  async function handleReport() {
    if (!reason || sending) return
    setSending(true)
    try {
      await reportContent({ reportedUserId, postId, reason })
      setDone(true)
    } catch (e) {
      console.error(e)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[55] animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-3xl z-[60] shadow-2xl pb-10 animate-slide-up">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center px-5 pb-3 border-b border-gray-100">
          <h2 className="flex-1 text-base font-bold text-gray-900">Report</h2>
          <button onClick={onClose} className="text-gray-400 p-1"><X size={20} /></button>
        </div>

        {done ? (
          <div className="flex flex-col items-center py-12 px-6 text-center">
            <div className="text-5xl mb-4">✅</div>
            <p className="font-bold text-gray-900 mb-2">Report submitted</p>
            <p className="text-sm text-gray-400 leading-relaxed">
              Thanks for helping keep Beened safe. We'll review this shortly.
            </p>
            <button
              onClick={onClose}
              className="mt-6 bg-amber-500 text-white font-bold px-8 py-3 rounded-2xl active:scale-95 transition-transform"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="px-5 pt-4 pb-2">
            <p className="text-sm text-gray-500 mb-4">Why are you reporting this?</p>
            <div className="flex flex-col gap-2 mb-6">
              {REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-semibold border transition-all active:scale-[0.98] ${
                    reason === r
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-gray-50 border-gray-100 text-gray-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              onClick={handleReport}
              disabled={!reason || sending}
              className="w-full bg-rose-500 text-white font-bold py-3.5 rounded-xl disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              {sending ? 'Submitting…' : 'Submit Report'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
