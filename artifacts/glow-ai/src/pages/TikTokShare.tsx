import { useParams, Link } from "wouter"
import { useGetScan, useGenerateTiktokClip, getGetScanQueryKey } from "@workspace/api-client-react"
import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Share2, Loader2, Music, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function TikTokShare() {
  const { scanId } = useParams()
  const { data: scan, isLoading: isLoadingScan } = useGetScan(Number(scanId), {
    query: {
      enabled: !!scanId,
      queryKey: getGetScanQueryKey(Number(scanId)),
    }
  })
  
  const generateTiktok = useGenerateTiktokClip()
  const [clipData, setClipData] = useState<{ shareUrl: string, caption: string, hashtags: string[] } | null>(null)

  const handleGenerate = async () => {
    try {
      const result = await generateTiktok.mutateAsync({
        data: { scanId: Number(scanId) }
      })
      setClipData(result)
    } catch (e) {
      console.error(e)
    }
  }

  const handleShare = () => {
    if (!clipData) return
    const url = `https://www.tiktok.com/share?url=${encodeURIComponent(clipData.shareUrl)}&text=${encodeURIComponent(clipData.caption)}`
    window.open(url, "_blank")
  }

  if (isLoadingScan) {
    return <div className="p-6 pt-20"><Skeleton className="h-96 w-full rounded-3xl" /></div>
  }

  return (
    <div className="min-h-[100dvh] w-full flex justify-center bg-[#000000] text-white">
      <div className="w-full max-w-md flex flex-col h-[100dvh] relative">
        
        {/* TikTok style top bar */}
        <div className="absolute top-0 w-full flex justify-between p-6 z-20">
          <Button variant="ghost" size="icon" asChild className="text-white hover:bg-white/20 rounded-full">
            <Link href={`/scan/${scanId}`}><ArrowLeft /></Link>
          </Button>
          <span className="font-bold">Glow-Up Reveal</span>
          <div className="w-10"></div>
        </div>

        {/* Video Preview Area */}
        <div className="flex-1 relative flex items-center justify-center bg-zinc-900 rounded-b-[3rem] overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 z-10" />
          
          {scan?.selfieUrl ? (
            <img src={scan.selfieUrl} alt="Base" className="absolute inset-0 w-full h-full object-cover opacity-50 blur-sm" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-purple-600/30" />
          )}

          <div className="relative z-20 w-full px-8">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 text-center"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4 text-white">
                <Sparkles size={32} />
              </div>
              <h2 className="font-serif text-3xl mb-1">Mon Score</h2>
              <div className="font-serif text-6xl font-bold text-primary mb-4">
                {scan?.skinMetrics?.overallScore || 0}
              </div>
              <p className="text-white/80 text-sm">
                Sous-ton {scan?.skinMetrics?.undertone} • Peau {scan?.skinMetrics?.skinType}
              </p>
            </motion.div>
          </div>

          <div className="absolute bottom-8 left-6 right-6 z-20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-spin-slow">
              <Music size={16} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium whitespace-nowrap animate-marquee">Son original - Glow AI Routine</p>
            </div>
          </div>
        </div>

        {/* Actions Area */}
        <div className="p-6 bg-black">
          {!clipData ? (
            <Button 
              className="w-full h-14 rounded-full bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white font-bold text-lg border-0 shadow-lg shadow-[#FE2C55]/20"
              onClick={handleGenerate}
              disabled={generateTiktok.isPending}
            >
              {generateTiktok.isPending ? <Loader2 className="animate-spin" /> : "Créer la vidéo TikTok"}
            </Button>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="text-sm text-white/70 mb-4">
                <p className="mb-2">{clipData.caption}</p>
                <p className="text-primary font-medium">{clipData.hashtags.join(" ")}</p>
              </div>
              <Button 
                className="w-full h-14 rounded-full bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white font-bold text-lg border-0"
                onClick={handleShare}
              >
                <Share2 className="mr-2" size={20} />
                Partager sur TikTok
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
