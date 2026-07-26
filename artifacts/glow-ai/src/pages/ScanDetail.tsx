import { useState } from "react"
import { useParams, Link } from "wouter"
import { useGetScan } from "@workspace/api-client-react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Sparkles, AlertCircle, Camera, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"

// ─── Error messages ───────────────────────────────────────────────────────────

const YOUCAM_ERROR_MESSAGES: Record<string, string> = {
  exceed_max_filesize:         "L'image est trop volumineuse. Utilisez une photo de moins de 10 Mo.",
  invalid_parameter:           "Paramètres invalides. Veuillez réessayer.",
  error_download_image:        "Impossible de télécharger l'image. Vérifiez votre connexion.",
  error_decode_image:          "Impossible de lire l'image. Essayez un autre format (JPG ou PNG).",
  error_decode_mask:           "Erreur de traitement de l'image. Veuillez réessayer.",
  error_nsfw_content_detected: "Image non appropriée détectée. Utilisez un selfie neutre.",
  error_no_face:               "Aucun visage détecté. Votre visage doit occuper 60–80 % de l'image.",
  error_pose:                  "Angle du visage trop extrême. Regardez directement l'appareil photo.",
  error_face_parsing:          "Impossible d'analyser le visage. Assurez-vous d'être bien éclairé et de face.",
  error_inference:             "L'analyse IA a échoué. Réessayez avec une photo plus nette.",
  exceed_nsfw_retry_limits:    "Limite de tentatives dépassée. Réessayez dans quelques minutes.",
  error_multiple_people:       "Plusieurs personnes détectées. Prenez un selfie seul(e).",
  error_no_shoulder:           "Les épaules ne sont pas visibles. Reculez légèrement.",
  error_large_face_angle:      "Angle du visage trop grand. Regardez directement la caméra.",
  error_hair_too_short:        "Cheveux trop courts pour cette analyse.",
  error_bald_image:            "Analyse impossible sur une tête rasée.",
  error_unsupport_ratio:       "Format d'image non supporté. Utilisez un format portrait.",
  unknown_internal_error:      "Erreur interne YouCam. Veuillez réessayer.",
  timeout:                     "L'analyse a pris trop de temps. Réessayez avec une connexion plus stable.",
  error_below_min_image_size:  "Résolution trop faible. Utilisez une photo d'au moins 480 px de large.",
  error_exceed_max_image_size: "Résolution trop élevée. L'image a été recadrée automatiquement.",
  error_src_face_too_small:    "Visage trop petit dans l'image. Rapprochez-vous de l'appareil.",
  error_src_face_out_of_bound: "Le visage dépasse les bords de l'image. Centrez votre visage.",
  error_lighting_dark:         "Luminosité insuffisante. Prenez la photo dans un endroit bien éclairé.",
}

function getErrorMessage(rawData: Record<string, unknown> | null): string {
  if (!rawData) return YOUCAM_ERROR_MESSAGES.unknown_internal_error!
  const code = (rawData.error_code ?? rawData.errorCode ?? "unknown_internal_error") as string
  return YOUCAM_ERROR_MESSAGES[code] ?? `Erreur : ${code}. Veuillez réessayer.`
}

// ─── Score helpers ─────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e"
  if (score >= 60) return "#f59e0b"
  return "#ef4444"
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Excellent"
  if (score >= 65) return "Bien"
  if (score >= 50) return "Moyen"
  return "À améliorer"
}

// ─── Zone definitions ──────────────────────────────────────────────────────────

interface MetricDef {
  key: string
  label: string
  tip: string
  maskKey: string
}

const ZONES: { emoji: string; title: string; shortTitle: string; metrics: MetricDef[] }[] = [
  {
    emoji: "✨",
    title: "Teint & Éclat",
    shortTitle: "Teint",
    metrics: [
      { key: "radianceScore",     label: "Éclat",   tip: "Vitamine C sérum le matin booste l'éclat naturel",               maskKey: "radiance" },
      { key: "rednessScore",      label: "Rougeurs", tip: "Centella asiatica + niacinamide pour apaiser",                    maskKey: "redness" },
      { key: "pigmentationScore", label: "Taches",   tip: "SPF 50+ quotidien + niacinamide 10% pour uniformiser",           maskKey: "age_spot" },
    ],
  },
  {
    emoji: "💧",
    title: "Hydratation & Sebum",
    shortTitle: "Hydrat.",
    metrics: [
      { key: "hydrationScore",  label: "Hydratation", tip: "Sérum acide hyaluronique + occlusion la nuit",             maskKey: "moisture" },
      { key: "oilinessScore",   label: "Sébum",        tip: "Nettoyant doux 2×/jour, évitez de sur-nettoyer",           maskKey: "oiliness" },
      { key: "firmnessScore",   label: "Fermeté",      tip: "Rétinol nuit + massage facial gua sha",                    maskKey: "firmness" },
    ],
  },
  {
    emoji: "🔬",
    title: "Texture & Pores",
    shortTitle: "Texture",
    metrics: [
      { key: "acneScore",    label: "Acné",  tip: "Acide salicylique soir, ne touchez pas les imperfections",       maskKey: "acne" },
      { key: "poresScore",   label: "Pores", tip: "Argile 1×/semaine + BHA pour affiner les pores",                maskKey: "pore" },
      { key: "wrinklesScore",label: "Rides", tip: "Rétinol + peptides + protection solaire quotidienne",           maskKey: "wrinkle" },
    ],
  },
  {
    emoji: "👁",
    title: "Regard",
    shortTitle: "Regard",
    metrics: [
      { key: "eyeBagScore",            label: "Poches",         tip: "Drainage lymphatique + compresses froides le matin",  maskKey: "eye_bag" },
      { key: "darkcirclesScore",       label: "Cernes",         tip: "Caféine contour des yeux + sommeil 8h minimum",       maskKey: "dark_circle_v2" },
      { key: "tearTroughScore",        label: "Vallées",        tip: "Hydratation ciblée + repos, évitez le sel",           maskKey: "tear_trough" },
      { key: "droopyLowerEyelidScore", label: "Paupière basse", tip: "Exercices faciaux + sommeil sur le dos",              maskKey: "droopy_lower_eyelid" },
      { key: "droopyUpperEyelidScore", label: "Paupière haute", tip: "Massage frontal + sérum liftant",                     maskKey: "droopy_upper_eyelid" },
    ],
  },
]

// ─── Metric card with image + mask overlay ─────────────────────────────────────

function MetricCard({
  label,
  tip,
  score,
  maskUrl,
  selfieUrl,
  expanded,
  onToggle,
}: {
  label: string
  tip: string
  score: number
  maskUrl?: string
  selfieUrl?: string
  expanded: boolean
  onToggle: () => void
}) {
  const color = scoreColor(score)
  const bgImage = maskUrl ?? selfieUrl
  const circumference = 113.1 // 2π × 18

  if (bgImage) {
    return (
      <motion.div
        layout
        onClick={onToggle}
        className="relative rounded-2xl overflow-hidden cursor-pointer"
        style={{ height: expanded ? "auto" : "10rem", minHeight: "10rem" }}
      >
        {/* Photo background (mask or selfie) */}
        <img
          src={bgImage}
          alt={label}
          className="absolute inset-0 w-full h-full object-cover object-top"
          loading="lazy"
        />
        {/* Score colour tint — simulates mask overlay when using selfie fallback */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: color + "44", mixBlendMode: "multiply" }}
        />
        {/* Gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Score ring — top-right */}
        <div className="absolute top-3 right-3">
          <div className="relative w-12 h-12">
            <svg className="absolute inset-0 -rotate-90" width="48" height="48" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="18" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
              <circle
                cx="24" cy="24" r="18" fill="none"
                stroke={color} strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-xs">{score}</span>
            </div>
          </div>
        </div>

        {/* Label + tip — bottom */}
        <div className="absolute bottom-0 inset-x-0 p-3">
          <p className="text-white font-medium text-sm leading-tight">{label}</p>
          <AnimatePresence>
            {expanded && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-white/70 text-[11px] mt-1 leading-snug overflow-hidden"
              >
                {tip}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    )
  }

  // ── Fallback: no image ──
  return (
    <div
      onClick={onToggle}
      className="bg-card rounded-2xl border border-border/50 p-4 cursor-pointer"
    >
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-sm">{label}</span>
        <span className="font-bold text-sm" style={{ color }}>{score}/100</span>
      </div>
      <Progress value={score} className="h-1.5" />
      {expanded && (
        <p className="text-[11px] text-muted-foreground mt-2 leading-snug">{tip}</p>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScanDetail() {
  const { scanId } = useParams()
  const [activeZone, setActiveZone] = useState(0)
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null)

  const { data: scan, isLoading } = useGetScan(Number(scanId), {
    query: {
      enabled: !!scanId,
      queryKey: ["getScan", Number(scanId)],
      refetchInterval: (query: { state: { data?: unknown } }) => {
        const status = (query.state.data as { status?: string } | undefined)?.status
        return status === "processing" ? 2000 : false
      },
    },
  })

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center bg-background p-6 gap-4">
        <Skeleton className="w-full h-56 rounded-3xl mt-12" />
        <Skeleton className="w-full h-10 rounded-full" />
        <Skeleton className="w-full h-40 rounded-2xl" />
        <Skeleton className="w-full h-40 rounded-2xl" />
      </div>
    )
  }

  if (!scan) {
    return <div className="p-6 text-center mt-20 text-muted-foreground">Scan non trouvé</div>
  }

  // ── Processing ──
  if (scan.status === "processing") {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background px-6 gap-6">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <Sparkles className="text-primary" size={40} />
        </motion.div>
        <div className="text-center">
          <h3 className="font-serif text-2xl mb-2">Analyse en cours…</h3>
          <p className="text-muted-foreground text-sm">Glow AI examine vos 16 paramètres de peau.</p>
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
        <div className="flex items-center justify-between w-full max-w-md mb-2">
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
            <Link href="/scan"><Camera className="mr-2" size={20} />Réessayer</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full rounded-full h-14">
            <Link href="/dashboard"><ArrowLeft className="mr-2" size={20} />Tableau de bord</Link>
          </Button>
        </div>
      </div>
    )
  }

  // ── Complete ──
  const metrics = scan.skinMetrics as Record<string, number | string | null> | null
  const colors = scan.colorRecommendation as {
    recommendedColors?: string[]
    avoidColors?: string[]
    styleAdvice?: string | null
    necklineAdvice?: string | null
  } | null
  const masks = (scan.maskUrls ?? {}) as Record<string, string>
  const selfieUrl = scan.selfieUrl ?? undefined

  const mask = (base: string): string | undefined =>
    masks[`hd_${base}`] ?? masks[base] ?? masks[`hd_${base}_v2`] ?? masks[`${base}_v2`]

  const overall = (metrics?.overallScore as number) ?? 0
  const activeZoneData = ZONES[activeZone]!
  const overallCircumference = 2 * Math.PI * 50 // r=50

  return (
    <div className="min-h-[100dvh] w-full flex justify-center bg-background">
      <div className="w-full max-w-md flex flex-col pb-28">

        {/* ── Sticky header ── */}
        <div className="flex items-center justify-between px-5 py-4 sticky top-0 bg-background/80 backdrop-blur-md z-20 border-b border-border/30">
          <Button variant="ghost" size="icon" asChild className="rounded-full bg-card shadow-sm border border-border/50">
            <Link href="/dashboard"><ArrowLeft size={20} /></Link>
          </Button>
          <span className="font-serif text-lg">Rapport de peau</span>
          <div className="w-10" />
        </div>

        <div className="px-5 pt-5 space-y-5">

          {/* ── Hero card: score + selfie ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-3xl border border-border/50 p-5 relative overflow-hidden"
          >
            {/* Ambient glow */}
            <div
              className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-15 pointer-events-none"
              style={{ background: scoreColor(overall) }}
            />

            <div className="flex items-center gap-4 relative z-10">
              {/* Score ring */}
              <div className="relative shrink-0 w-20 h-20 flex items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" width="80" height="80" viewBox="0 0 112 112">
                  <circle cx="56" cy="56" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  <motion.circle
                    cx="56" cy="56" r="50" fill="none"
                    stroke={scoreColor(overall)} strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={overallCircumference}
                    initial={{ strokeDashoffset: overallCircumference }}
                    animate={{ strokeDashoffset: overallCircumference * (1 - overall / 100) }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </svg>
                <div className="text-center z-10">
                  <p className="font-serif text-2xl leading-none">{overall}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">/100</p>
                </div>
              </div>

              {/* Labels + chips */}
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground text-[11px] uppercase tracking-wide mb-0.5">Glow Score</p>
                <p className="font-serif text-xl mb-2" style={{ color: scoreColor(overall) }}>
                  {scoreLabel(overall)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {metrics?.skinType && (
                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px]">
                      {metrics.skinType as string}
                    </span>
                  )}
                  {metrics?.undertone && (
                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] capitalize">
                      {metrics.undertone as string}
                    </span>
                  )}
                  {metrics?.skinAge != null && (
                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px]">
                      {metrics.skinAge as number} ans
                    </span>
                  )}
                </div>
              </div>

              {/* Circular selfie */}
              {selfieUrl && (
                <div className="shrink-0 w-16 h-16 rounded-full overflow-hidden border-2 border-border/60 shadow-md">
                  <img src={selfieUrl} alt="Selfie" className="w-full h-full object-cover object-top" />
                </div>
              )}
            </div>

            {/* AI advice */}
            {scan.aiAdvice && (
              <div className="mt-4 pt-4 border-t border-border/30 relative z-10">
                <p className="text-sm text-muted-foreground italic line-clamp-2 leading-relaxed">
                  "{scan.aiAdvice}"
                </p>
              </div>
            )}
          </motion.div>

          {/* ── Zone tabs ── */}
          <div className="sticky top-[61px] bg-background/90 backdrop-blur-md z-10 -mx-5 px-5 py-3 border-b border-border/20">
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {ZONES.map((zone, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveZone(i); setExpandedMetric(null) }}
                  className={`relative px-3 py-1.5 rounded-full whitespace-nowrap text-sm font-medium transition-colors flex-shrink-0 ${
                    i === activeZone
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="mr-1">{zone.emoji}</span>
                  {zone.shortTitle}
                  {i === activeZone && (
                    <motion.div
                      layoutId="zoneUnderline"
                      className="absolute left-2 right-2 bottom-0 h-[2px] rounded-full"
                      style={{ backgroundColor: "hsl(var(--primary))" }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Metric grid ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeZone}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-2 gap-3"
            >
              {activeZoneData.metrics.map((m) => {
                const score = (metrics?.[m.key] as number) ?? 0
                return (
                  <MetricCard
                    key={m.key}
                    label={m.label}
                    tip={m.tip}
                    score={score}
                    maskUrl={mask(m.maskKey)}
                    selfieUrl={selfieUrl}
                    expanded={expandedMetric === m.key}
                    onToggle={() => setExpandedMetric(expandedMetric === m.key ? null : m.key)}
                  />
                )
              })}
            </motion.div>
          </AnimatePresence>

          {/* ── Colorimétrie ── */}
          {colors?.recommendedColors && colors.recommendedColors.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="pt-2"
            >
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-5" />
              <h3 className="font-serif text-xl mb-4 text-center">Votre colorimétrie</h3>

              <div className="bg-card rounded-3xl border border-border/50 overflow-hidden">
                <div className="p-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                    Couleurs qui subliment
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    {colors.recommendedColors.map((color, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5">
                        <div
                          className="w-12 h-16 rounded-full shadow-md border border-border/20"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-[10px] text-muted-foreground font-mono">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {colors.styleAdvice && (
                  <div className="border-t border-border/40 px-5 py-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Conseil style</p>
                    <p className="text-sm text-foreground/80 leading-relaxed">{colors.styleAdvice}</p>
                  </div>
                )}

                <div className="px-5 pb-5 pt-2">
                  <Button asChild className="w-full rounded-full h-12 group" variant="default">
                    <Link href={`/tiktok/${scan.id}`}>
                      Générer mon clip TikTok
                      <ChevronRight className="ml-1 group-hover:translate-x-0.5 transition-transform" size={16} />
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.section>
          )}

        </div>
      </div>
    </div>
  )
}
