import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { addStamp } from '../lib/api'
import { CheckCircle, XCircle, Camera, RefreshCw } from 'lucide-react'

function ResultBanner({ result, onDismiss }) {
  useEffect(() => {
    if (!result) return
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [result])

  if (!result) return null
  const ok = result.type === 'success'
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-white ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}>
      {ok ? <CheckCircle size={22} /> : <XCircle size={22} />}
      <div>
        <p className="font-bold text-sm">{result.title}</p>
        <p className="text-xs opacity-90">{result.subtitle}</p>
      </div>
    </div>
  )
}

// 'idle' | 'starting' | 'active' | 'denied' | 'error'
export default function Scanner({ cafe, onBack }) {
  const scannerRef = useRef(null)
  const [cameraState, setCameraState] = useState('starting')
  const [result, setResult] = useState(null)
  const [stampsAdded, setStampsAdded] = useState(0)
  const processingRef = useRef(false)

  useEffect(() => {
    let scanner

    async function startScanner() {
      // First check permission explicitly
      try {
        await navigator.mediaDevices.getUserMedia({ video: true })
      } catch (err) {
        setCameraState(err.name === 'NotAllowedError' ? 'denied' : 'error')
        return
      }

      scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1 },
          async (decodedText) => {
            if (processingRef.current) return
            if (!decodedText.startsWith('STAMPED:')) {
              setResult({ type: 'error', title: 'Not a Beened QR', subtitle: 'Ask the customer to open their app' })
              return
            }
            const userId = decodedText.replace('STAMPED:', '')
            processingRef.current = true

            try {
              const card = await addStamp(userId, cafe.id)
              setStampsAdded(n => n + 1)
              const isReward = card.stamps >= cafe.stamp_target
              setResult({
                type: 'success',
                title: isReward ? '🏆 Reward unlocked!' : '✅ Stamp added!',
                subtitle: isReward
                  ? `${cafe.reward_description} earned!`
                  : `${card.stamps}/${cafe.stamp_target} stamps`,
              })
            } catch (err) {
              setResult({ type: 'error', title: 'Could not add stamp', subtitle: err.message })
            } finally {
              setTimeout(() => { processingRef.current = false }, 3000)
            }
          },
          () => {}
        )
        setCameraState('active')
      } catch (err) {
        setCameraState('error')
      }
    }

    startScanner()

    return () => {
      scanner?.stop().catch(() => {})
    }
  }, [cafe])

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <ResultBanner result={result} onDismiss={() => setResult(null)} />

      {/* Header */}
      <div className="px-5 pt-12 pb-5 flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">Beened Portal</p>
          <h1 className="text-white text-xl font-bold mt-0.5">{cafe.name}</h1>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs">Stamps today</p>
          <p className="text-white font-bold text-2xl">{stampsAdded}</p>
        </div>
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <div className="w-full max-w-sm">

          {/* Camera denied */}
          {(cameraState === 'denied' || cameraState === 'error') && (
            <div className="bg-gray-900 rounded-3xl p-8 flex flex-col items-center text-center gap-4">
              <Camera size={48} className="text-gray-600" />
              <div>
                <p className="text-white font-semibold">
                  {cameraState === 'denied' ? 'Camera access denied' : 'Camera unavailable'}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {cameraState === 'denied'
                    ? 'Allow camera access in your browser settings, then refresh the page.'
                    : 'Could not start the camera. Try refreshing.'}
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 text-amber-400 border border-amber-400/30 px-5 py-2.5 rounded-xl text-sm font-medium"
              >
                <RefreshCw size={15} />
                Refresh page
              </button>
            </div>
          )}

          {/* Starting / active — always render the div so html5-qrcode has a target */}
          <div className={cameraState === 'denied' || cameraState === 'error' ? 'hidden' : ''}>
            <div className="relative rounded-3xl overflow-hidden bg-gray-900 shadow-2xl">
              <div id="qr-reader" className="w-full" />

              {/* Overlay while starting */}
              {cameraState === 'starting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 gap-3">
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">Starting camera…</p>
                </div>
              )}
            </div>

            <p className="text-center text-gray-500 text-sm mt-4">
              Point at customer's QR code
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-10">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-4 text-center">
          <p className="text-amber-400 text-sm font-medium">Reward at {cafe.stamp_target} stamps</p>
          <p className="text-amber-200 text-xs mt-0.5">{cafe.reward_description}</p>
        </div>
        <button
          onClick={onBack}
          className="w-full py-3 rounded-xl border border-gray-700 text-gray-400 text-sm font-medium"
        >
          ← Switch cafe
        </button>
      </div>
    </div>
  )
}
