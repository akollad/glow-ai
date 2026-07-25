import { useParams, Link } from "wouter"
import { useGetScan } from "@workspace/api-client-react"
import { motion } from "framer-motion"
import { ArrowLeft, Sparkles, Droplets, Flame, Search, AlertCircle, Shirt, RefreshCcw, Camera, Wind, Eye, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"

// ─── YouCam error code → French message ──────────────────────────────────────

const YOUCAM_ERROR_MESSAGES: Record<string, string> = {
  exceed_max_filesize:        "L'image est trop volumineuse. Utilisez une photo de moins de 10 Mo.",
  invalid_parameter:          "Paramètres invalides. Veuillez réessayer.",
  error_download_image:       "Impossible de télécharger l'image. Vérifiez votre connexion.",
  error_decode_image:         "Impossible de lire l'image. Essayez un autre format (JPG ou PNG).",
  error_decode_mask:          "Erreur de traitement de l'image. Veuillez réessayer.",
  error_nsfw_content_detected:"Image non appropriée détectée. Utilisez un selfie neutre.",
  error_no_face:              "Aucun visage détecté. Votre visage doit occuper 60–80 % de l'image.",
  error_pose:                 "Angle du visage trop extrême. Regardez directement l'appareil photo.",
  error_face_parsing:         "Impossible d'analyser le visage. Assurez-vous d'être bien éclairé et de face.",
  error_inference:            "L'analyse IA a échoué. Réessayez avec une photo plus nette.",
  exceed_nsfw_retry_limits:   "Limite de tentatives dépassée. Réessayez dans quelques minutes.",
  error_multiple_people:      "Plusieurs personnes détectées. Prenez un selfie seul(e).",
  error_no_shoulder:          "Les épaules ne sont pas visibles. Reculez légèrement.",
  error_large_face_angle:     "Angle du visage trop grand. Regardez directement la caméra.",
  error_hair_too_short:       "Cheveux trop courts pour cette analyse.",
  error_bald_image:           "Analyse impossible sur une tête rasée.",
  error_unsupport_ratio:      "Format d'image non supporté. Utilisez un format portrait.",
  unknown_internal_error:     "Erreur interne YouCam. Veuillez réessayer.",
  timeout:                    "L'analyse a pris trop de temps. Réessayez avec une connexion plus stable.",
  error_below_min_image_size: "Résolution trop faible. Utilisez une photo d'au moins 480 px de large.",
  error_exceed_max_image_size: "Résolution trop élevée. L'image a été recadrée automatiquement.",
  error_src_face_too_small:   "Visage trop petit dans l'image. Rapprochez-vous de l'appareil.",
  error_src_face_out_of_bound:"Le visage dépasse les bords de l'image. Centrez votre visage.",
  error_lighting_dark:        "Luminosité insuffisante. Prenez la photo dans un endroit bien éclairé.",
}

function getErrorMessage(rawData: Record<string, unknown> | null): string {
  if (!rawData) return YOUCAM_ERROR_MESSAGES.unknown_internal_error!
  const code = (rawData.error_code ?? rawData.errorCode ?? "unknown_internal_error") as string
  return YOUCAM_ERROR_MESSAGES[code] ?? `Erreur : ${code}. Veuillez réessayer.`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScanDetail() {
  const { scanId } = useParams()
  const { data: scan, isLoading } = useGetScan(Number(scanId), {
    query: {
      enabled: !!scanId,
      queryKey: ["getScan", Number(scanId)],
      refetchInterval: (query) => {
        const status = (query.state.data as { status?: string } | undefined)?.status
        return status === "processing" ? 2000 : false
      },
    },
  })

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center bg-background p-6">
        <Skeleton className="w-full h-64 rounded-3xl mt-12 mb-8" />
        <Skeleton className="w-full h-24 rounded-3xl mb-4" />
        <Skeleton className="w-full h-40 rounded-3xl" />
      </div>
    )
  }

  if (!scan) {
    return <div className="p-6 text-center mt-20 text-muted-foreground">Scan non trouvé</div>
  }

  // ── Still processing ──
  if (scan.status === "processing") {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background px-6 gap-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="text-primary animate-pulse" size={36} />
        </div>
        <div className="text-center">
          <h3 className="font-serif text-2xl mb-2">Analyse en cours…</h3>
          <p className="text-muted-foreground text-sm">Glow AI examine votre peau. Cela prend environ 10–20 secondes.</p>
        </div>
        <Progress value={undefined} className="w-48 h-1.5" />
      </div>
    )
  }

  // ── Failed ──
  if (scan.status === "failed") {
    const message = getErrorMessage(scan.rawYoucamData as Record<string, unknown> | null)
    return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background px-6 gap-6">
        <div className="flex items-center justify-between w-full max-w-md px-0 mb-2">
          <Button variant="ghost" size="icon" asChild className="rounded-full border border-border/50">
            <Link href="/dashboard"><ArrowLeft size={20} /></Link>
          </Button>
          <span className="font-serif text-lg">Résultats du Scan</span>
          <div className="w-10" />
        </div>

        <div className="w-20 h-20 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
          <AlertCircle className="text-destructive" size={36} />
        </div>

        <div className="text-center max-w-sm">
          <h3 className="font-serif text-2xl mb-3">Analyse échouée</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-3">
          <Button asChild size="lg" className="w-full rounded-full h-14">
            <Link href="/scan">
              <Camera className="mr-2" size={20} />
              Réessayer avec une nouvelle photo
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full rounded-full h-14">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2" size={20} />
              Retour au tableau de bord
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // ── Complete ──
  const metrics = scan.skinMetrics
  const colors = scan.colorRecommendation
  const masks = (scan.maskUrls ?? {}) as Record<string, string>

  // Helper: resolve mask URL for a metric — checks hd_ prefix first, then bare name
  const mask = (base: string): string | undefined =>
    masks[`hd_${base}`] ?? masks[base] ?? masks[`hd_${base}_v2`] ?? masks[`${base}_v2`]

  return (
    <div className="min-h-[100dvh] w-full flex justify-center bg-background noise-bg pb-24">
      <div className="w-full max-w-md flex flex-col">

        {/* Top Header */}
        <div className="flex items-center justify-between p-6 sticky top-0 bg-background/80 backdrop-blur-md z-20">
          <Button variant="ghost" size="icon" asChild className="rounded-full bg-card shadow-sm border border-border/50">
            <Link href="/dashboard"><ArrowLeft size={20} /></Link>
          </Button>
          <span className="font-serif text-lg">Résultats du Scan</span>
          <div className="w-10" />
        </div>

        <div className="px-6 space-y-6">

          {/* Main Score Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-[2.5rem] p-8 flex flex-col items-center border border-border/50 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/10 rounded-full blur-3xl -ml-10 -mb-10" />

            <p className="text-muted-foreground font-medium mb-4 relative z-10">Score Global</p>
            <div className="flex items-start justify-center relative z-10 mb-6">
              <span className="font-serif text-7xl leading-none text-primary">{metrics?.overallScore || 0}</span>
              <span className="text-2xl text-muted-foreground ml-1 mt-2">/100</span>
            </div>

            <div className="w-full bg-muted rounded-2xl p-4 flex gap-4 relative z-10">
              <div className="flex-1 text-center border-r border-border">
                <p className="text-xs text-muted-foreground mb-1">Sous-ton</p>
                <p className="font-semibold text-sm capitalize">{metrics?.undertone || "Neutre"}</p>
              </div>
              <div className="flex-1 text-center border-r border-border">
                <p className="text-xs text-muted-foreground mb-1">Type de peau</p>
                <p className="font-semibold text-sm capitalize">{metrics?.skinType || "Mixte"}</p>
              </div>
              {metrics?.skinAge != null && (
                <div className="flex-1 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Âge peau</p>
                  <p className="font-semibold text-sm">{metrics.skinAge} ans</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* AI Advice */}
          {scan.aiAdvice && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="text-primary" size={20} />
                    <h3 className="font-serif text-lg">Le mot de l'IA</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/80">{scan.aiAdvice}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Detailed Metrics — all 8 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h3 className="font-serif text-2xl px-2">Analyse Détaillée</h3>
            <MetricBar label="Hydratation"   icon={<Droplets size={16}/>}   score={metrics?.hydrationScore}    color="bg-blue-500"    maskUrl={mask("moisture")} />
            <MetricBar label="Éclat"         icon={<Sparkles size={16}/>}   score={metrics?.radianceScore}     color="bg-yellow-500"  maskUrl={mask("radiance")} />
            <MetricBar label="Acné"          icon={<AlertCircle size={16}/>} score={metrics?.acneScore}        color="bg-red-400"     maskUrl={mask("acne")} />
            <MetricBar label="Pores"         icon={<Search size={16}/>}     score={metrics?.poresScore}        color="bg-primary"     maskUrl={mask("pore")} />
            <MetricBar label="Pigmentation"  icon={<Flame size={16}/>}      score={metrics?.pigmentationScore} color="bg-purple-500"  maskUrl={mask("age_spot")} />
            <MetricBar label="Rides"         icon={<Wind size={16}/>}       score={metrics?.wrinklesScore}     color="bg-orange-400"  maskUrl={mask("wrinkle")} />
            <MetricBar label="Cernes"        icon={<Eye size={16}/>}        score={metrics?.darkcirclesScore}  color="bg-indigo-400"  maskUrl={mask("dark_circle")} />
            <MetricBar label="Texture"       icon={<Layers size={16}/>}     score={metrics?.oilinessScore ?? undefined} color="bg-teal-500" maskUrl={mask("texture")} />
          </motion.div>

          {/* Color & Style Palette */}
          {colors && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4 pt-4"
            >
              <h3 className="font-serif text-2xl px-2">Votre Colorimétrie</h3>

              <Card className="border-border/50">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-4">Couleurs qui subliment votre teint :</p>
                  <div className="flex flex-wrap gap-3 mb-6">
                    {(colors as { recommendedColors?: string[] }).recommendedColors?.map((color, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div
                          className="w-10 h-10 rounded-full border border-border shadow-inner"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    ))}
                  </div>

                  {(colors as { styleAdvice?: string }).styleAdvice && (
                    <div className="bg-secondary/10 rounded-xl p-4 text-sm text-foreground/80 mb-6">
                      <span className="font-semibold block mb-1 text-secondary-foreground">Style & Coupe</span>
                      {(colors as { styleAdvice?: string }).styleAdvice}
                    </div>
                  )}

                  <Button className="w-full rounded-full h-14" variant="default" asChild>
                    <Link href={`/tiktok/${scan.id}`}>
                      <Shirt className="mr-2" size={20} />
                      Générer mon TikTok
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  )
}

// ─── MetricBar ────────────────────────────────────────────────────────────────

function MetricBar({
  label,
  icon,
  score = 0,
  color,
  maskUrl,
}: {
  label: string
  icon: React.ReactNode
  score?: number
  color: string
  maskUrl?: string
}) {
  return (
    <Card className="border-border/50 shadow-none overflow-hidden">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 ${color}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium text-sm">{label}</span>
            <span className="font-bold text-sm">{score}/100</span>
          </div>
          <Progress value={score} className="h-1.5" indicatorColor={color} />
        </div>
        {maskUrl && (
          <img
            src={maskUrl}
            alt={`Masque ${label}`}
            className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border/40"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
          />
        )}
      </CardContent>
    </Card>
  )
}
