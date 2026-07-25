import { useState, useRef } from "react"
import { useLocation } from "wouter"
import { useCreateScan } from "@workspace/api-client-react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, Image as ImageIcon, ArrowLeft, Sparkles, AlertCircle, CreditCard, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

// ─── Error state ──────────────────────────────────────────────────────────────

interface ScanError {
  code: number | null
  message: string
  paymentRequired: boolean
}

function extractError(err: unknown): ScanError {
  // Orval / axios errors expose response on the thrown object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyErr = err as any

  const status: number | null =
    anyErr?.response?.status ?? anyErr?.status ?? null

  // Try to read the JSON body the server returned
  const data = anyErr?.response?.data ?? anyErr?.data ?? null
  const serverMessage: string | null =
    typeof data?.error === "string"
      ? data.error
      : typeof data?.message === "string"
      ? data.message
      : null

  if (status === 402) {
    return {
      code: 402,
      message: serverMessage ?? "Crédits insuffisants. Rechargez pour continuer.",
      paymentRequired: true,
    }
  }

  if (status === 400) {
    return {
      code: 400,
      message: serverMessage ?? "Image invalide. Veuillez reprendre la photo.",
      paymentRequired: false,
    }
  }

  if (status === 401 || status === 403) {
    return {
      code: status,
      message: "Session expirée. Veuillez vous reconnecter.",
      paymentRequired: false,
    }
  }

  if (status && status >= 500) {
    return {
      code: status,
      message: serverMessage ?? "Erreur serveur. Réessayez dans quelques instants.",
      paymentRequired: false,
    }
  }

  return {
    code: status,
    message: serverMessage ?? "Une erreur inattendue s'est produite. Veuillez réessayer.",
    paymentRequired: false,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScanFlow() {
  const [, setLocation] = useLocation()
  const [image, setImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [scanError, setScanError] = useState<ScanError | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const createScan = useCreateScan()

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanError(null)
    const reader = new FileReader()
    reader.onload = (event) => {
      setImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const simulateProgress = () => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) { clearInterval(interval); return 90 }
        return prev + 10
      })
    }, 500)
    return interval
  }

  const handleAnalyze = async () => {
    if (!image) return
    setScanError(null)
    setIsProcessing(true)
    const progressInterval = simulateProgress()

    try {
      const result = await createScan.mutateAsync({ data: { selfieBase64: image } })
      clearInterval(progressInterval)
      setProgress(100)
      setTimeout(() => setLocation(`/scan/${result.id}`), 500)
    } catch (err) {
      clearInterval(progressInterval)
      setIsProcessing(false)
      setProgress(0)
      setScanError(extractError(err))
    }
  }

  const handleRetry = () => {
    setScanError(null)
    setImage(null)
  }

  return (
    <div className="min-h-[100dvh] w-full flex justify-center bg-black text-white relative">
      <div className="w-full max-w-md flex flex-col h-[100dvh]">

        {/* Top Bar */}
        <div className="flex items-center justify-between p-6 absolute top-0 w-full z-20">
          <Button
            variant="ghost" size="icon"
            className="text-white hover:bg-white/20 rounded-full"
            onClick={() => setLocation("/dashboard")}
          >
            <ArrowLeft />
          </Button>
          <span className="font-serif text-lg">Nouveau Scan</span>
          <div className="w-10" />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center relative px-6">
          <AnimatePresence mode="wait">

            {/* ── Error overlay ── */}
            {scanError ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col items-center gap-6"
              >
                <div className="w-20 h-20 rounded-full bg-red-500/20 border border-red-400/40 flex items-center justify-center">
                  <AlertCircle className="text-red-400" size={36} />
                </div>

                <div className="text-center px-4">
                  <h3 className="font-serif text-xl mb-2">
                    {scanError.paymentRequired ? "Crédits insuffisants" : "Analyse échouée"}
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    {scanError.message}
                  </p>
                </div>

                <div className="w-full flex flex-col gap-3">
                  {scanError.paymentRequired ? (
                    <>
                      <Button
                        size="lg"
                        className="w-full rounded-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                        onClick={() => setLocation("/payment")}
                      >
                        <CreditCard className="mr-2" size={20} />
                        Recharger mes crédits
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full rounded-full h-14 border-white/20 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => setLocation("/dashboard")}
                      >
                        Retour au tableau de bord
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="lg"
                        className="w-full rounded-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                        onClick={handleRetry}
                      >
                        <RefreshCcw className="mr-2" size={20} />
                        Réessayer
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full rounded-full h-14 border-white/20 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => setLocation("/dashboard")}
                      >
                        Retour
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>

            ) : !image ? (
              /* ── Photo picker ── */
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col items-center"
              >
                <div className="w-64 h-80 border-2 border-dashed border-white/30 rounded-[3rem] flex flex-col items-center justify-center mb-8 relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-[3rem] opacity-50" />
                  <Camera size={48} className="text-white/50 mb-4" />
                  <p className="text-white/60 font-medium text-center px-8">
                    Placez votre visage au centre de l'écran avec une bonne luminosité
                  </p>
                </div>

                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageCapture}
                />

                <div className="flex flex-col w-full gap-4">
                  <Button
                    size="lg"
                    className="w-full rounded-full h-16 text-lg bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="mr-2" size={24} />
                    Prendre une photo
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full rounded-full h-16 text-lg border-white/20 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.removeAttribute("capture")
                        fileInputRef.current.click()
                      }
                    }}
                  >
                    <ImageIcon className="mr-2" size={20} />
                    Choisir dans la galerie
                  </Button>
                </div>
              </motion.div>

            ) : (
              /* ── Preview + analyze ── */
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full flex flex-col items-center justify-center h-full pt-16 pb-8"
              >
                <div className="relative w-full max-w-[320px] aspect-[3/4] rounded-[3rem] overflow-hidden mb-8 shadow-2xl">
                  <img src={image} alt="Selfie preview" className="w-full h-full object-cover" />

                  {isProcessing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-6"
                    >
                      <Sparkles className="text-primary mb-4 animate-pulse" size={40} />
                      <h3 className="font-serif text-xl mb-6 text-center">
                        Glow AI analyse votre peau...
                      </h3>
                      <Progress value={progress} className="w-full h-2 bg-white/20" indicatorColor="bg-primary" />
                      <p className="text-white/60 text-sm mt-4 font-medium animate-pulse">
                        {progress < 30
                          ? "Analyse des pores..."
                          : progress < 60
                          ? "Vérification de l'hydratation..."
                          : progress < 90
                          ? "Détection de la colorimétrie..."
                          : "Finalisation..."}
                      </p>
                    </motion.div>
                  )}
                </div>

                {!isProcessing && (
                  <div className="w-full flex gap-4 mt-auto">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-full h-14 border-white/20 bg-white/5 text-white hover:bg-white/10"
                      onClick={() => setImage(null)}
                    >
                      Reprendre
                    </Button>
                    <Button
                      className="flex-1 rounded-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 border-0"
                      onClick={handleAnalyze}
                    >
                      Analyser
                      <Sparkles className="ml-2" size={18} />
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  )
}
