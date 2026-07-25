import { useParams, Link } from "wouter"
import { useGetScan } from "@workspace/api-client-react"
import { motion } from "framer-motion"
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

function scoreRingGradient(score: number): string {
  const c = scoreColor(score)
  return `conic-gradient(${c} ${score * 3.6}deg, rgba(255,255,255,0.1) 0deg)`
}

// ─── Zone definitions (all 16 metrics) ───────────────────────────────────────

interface MetricDef {
  key: string
  label: string
  tip: string
  maskKey: string
}

const ZONES: { emoji: string; title: string; metrics: MetricDef[] }[] = [
  {
    emoji: "✨",
    title: "Teint & Éclat",
    metrics: [
      { key: "radianceScore",    label: "Éclat",        tip: "Vitamine C sérum le matin booste l'éclat naturel", maskKey: "radiance" },
      { key: "rednessScore",     label: "Rougeurs",      tip: "Centella asiatica + niacinamide pour apaiser", maskKey: "redness" },
      { key: "pigmentationScore",label: "Taches",        tip: "SPF 50+ quotidien + niacinamide 10% pour uniformiser", maskKey: "age_spot" },
    ],
  },
  {
    emoji: "💧",
    title: "Hydratation & Sebum",
    metrics: [
      { key: "hydrationScore",   label: "Hydratation",   tip: "Sérum acide hyaluronique + occlusion la nuit", maskKey: "moisture" },
      { key: "oilinessScore",    label: "Sébum",         tip: "Nettoyant doux 2×/jour, évitez de sur-nettoyer", maskKey: "oiliness" },
      { key: "firmnessScore",    label: "Fermeté",       tip: "Rétinol nuit + massage facial gua sha", maskKey: "firmness" },
    ],
  },
  {
    emoji: "🔬",
    title: "Texture & Pores",
    metrics: [
      { key: "acneScore",        label: "Acné",          tip: "Acide salicylique soir, ne touchez pas les imperfections", maskKey: "acne" },
      { key: "poresScore",       label: "Pores",         tip: "Argile 1×/semaine + BHA pour affiner les pores", maskKey: "pore" },
      { key: "wrinklesScore",    label: "Rides",         tip: "Rétinol + peptides + protection solaire quotidienne", maskKey: "wrinkle" },
    ],
  },
  {
    emoji: "👁",
    title: "Regard",
    metrics: [
      { key: "eyeBagScore",             label: "Poches",         tip: "Drainage lymphatique + compresses froides le matin", maskKey: "eye_bag" },
      { key: "darkcirclesScore",        label: "Cernes",         tip: "Caféine contour des yeux + sommeil 8h minimum", maskKey: "dark_circle_v2" },
      { key: "tearTroughScore",         label: "Vallées",        tip: "Hydratation ciblée + repos, évitez le sel", maskKey: "tear_trough" },
      { key: "droopyLowerEyelidScore",  label: "Paupière basse", tip: "Exercices faciaux + sommeil sur le dos", maskKey: "droopy_lower_eyelid" },
      { key: "droopyUpperEyelidScore",  label: "Paupière haute", tip: "Massage frontal + sérum liftant", maskKey: "droopy_upper_eyelid" },
    ],
  },
]

// ─── Main component ───────────────────────────────────────────────────────────

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

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center bg-background p-6 gap-4">
        <Skeleton className="w-full h-56 rounded-3xl mt-12" />
        <Skeleton className="w-full h-24 rounded-3xl" />
        <Skeleton className="w-full h-40 rounded-3xl" />
        <Skeleton className="w-full h-40 rounded-3xl" />
      </div>
    )
  }

  if (!scan) {
    return <div className="p-6 text-center mt-20 text-muted-foreground">Scan non trouvé</div>
  }

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

  // Resolve mask URL: hd_ prefix first, then bare name, then _v2 variants
  const mask = (base: string): string | undefined =>
    masks[`hd_${base}`] ?? masks[base] ?? masks[`hd_${base}_v2`] ?? masks[`${base}_v2`]

  const overall = (metrics?.overallScore as number) ?? 0

  return (
    <div className="min-h-[100dvh] w-full flex justify-center bg-background noise-bg pb-28">
      <div className="w-full max-w-md flex flex-col">

        {/* Sticky header */}
        <div className="flex items-center justify-between px-5 py-4 sticky top-0 bg-background/80 backdrop-blur-md z-20 border-b border-border/30">
          <Button variant="ghost" size="icon" asChild className="rounded-full bg-card shadow-sm border border-border/50">
            <Link href="/dashboard"><ArrowLeft size={20} /></Link>
          </Button>
          <span className="font-serif text-lg">Rapport de peau</span>
          <div className="w-10" />
        </div>

        <div className="px-5 pt-6 space-y-8">

          {/* ── Score Global Hero ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-[2.5rem] overflow-hidden bg-foreground text-background p-8"
          >
            {/* Background glow blobs */}
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20"
                 style={{ background: scoreColor(overall) }} />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-3xl opacity-10"
                 style={{ background: scoreColor(overall) }} />

            <div className="relative z-10 flex items-center gap-6">
              {/* Circular score ring */}
              <div className="relative shrink-0 w-28 h-28 flex items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" width="112" height="112" viewBox="0 0 112 112">
                  <circle cx="56" cy="56" r="50" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  <circle
                    cx="56" cy="56" r="50" fill="none"
                    stroke={scoreColor(overall)} strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(overall / 100) * 314} 314`}
                  />
                </svg>
                <div className="text-center z-10">
                  <p className="font-serif text-4xl leading-none text-background">{overall}</p>
                  <p className="text-[10px] text-background/50 mt-1">/100</p>
                </div>
              </div>

              {/* Labels */}
              <div className="flex-1">
                <p className="text-background/60 text-xs font-medium mb-1 uppercase tracking-wide">Score Global</p>
                <p className="font-serif text-2xl text-background mb-3" style={{ color: scoreColor(overall) }}>
                  {scoreLabel(overall)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {metrics?.skinType && (
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-background/80 text-xs">
                      {metrics.skinType as string}
                    </span>
                  )}
                  {metrics?.undertone && (
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-background/80 text-xs capitalize">
                      Sous-ton {metrics.undertone as string}
                    </span>
                  )}
                  {metrics?.skinAge != null && (
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-background/80 text-xs">
                      Âge cutané : {metrics.skinAge as number} ans
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── AI Conseil ── */}
          {scan.aiAdvice && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="bg-primary/8 border border-primary/20 rounded-3xl p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                  <Sparkles className="text-primary" size={16} />
                </div>
                <h3 className="font-serif text-base">Diagnostic IA</h3>
              </div>
              <p className="text-sm leading-relaxed text-foreground/80">{scan.aiAdvice}</p>
            </motion.div>
          )}

          {/* ── 4 Diagnostic Zones ── */}
          {ZONES.map((zone, zi) => (
            <motion.section
              key={zone.title}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + zi * 0.07 }}
            >
              <h3 className="font-serif text-xl mb-4 flex items-center gap-2">
                <span className="text-2xl">{zone.emoji}</span>
                {zone.title}
              </h3>
              <div className="space-y-3">
                {zone.metrics.map((m) => {
                  const score = (metrics?.[m.key] as number) ?? 0
                  const maskUrl = mask(m.maskKey)
                  return (
                    <MetricCard
                      key={m.key}
                      label={m.label}
                      tip={m.tip}
                      score={score}
                      maskUrl={maskUrl}
                    />
                  )
                })}
              </div>
            </motion.section>
          ))}

          {/* ── Colorimétrie ── */}
          {colors && colors.recommendedColors && colors.recommendedColors.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="font-serif text-xl mb-4 flex items-center gap-2">
                <span className="text-2xl">🎨</span>
                Votre Colorimétrie
              </h3>

              <div className="bg-card rounded-3xl border border-border/50 overflow-hidden">
                {/* Color swatches */}
                <div className="p-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Couleurs qui subliment</p>
                  <div className="flex gap-3 flex-wrap">
                    {colors.recommendedColors.map((color, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5">
                        <div
                          className="w-12 h-12 rounded-2xl shadow-md border border-border/20"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-[10px] text-muted-foreground font-mono">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Style advice */}
                {colors.styleAdvice && (
                  <div className="border-t border-border/40 px-5 py-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Conseil style</p>
                    <p className="text-sm text-foreground/80 leading-relaxed">{colors.styleAdvice}</p>
                  </div>
                )}

                {/* TikTok CTA */}
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

// ─── MetricCard — mask as full-bleed hero ──────────────────────────────────────

function MetricCard({
  label,
  tip,
  score,
  maskUrl,
}: {
  label: string
  tip: string
  score: number
  maskUrl?: string
}) {
  const color = scoreColor(score)

  if (maskUrl) {
    return (
      <div className="relative rounded-2xl overflow-hidden h-40 group">
        {/* Mask image — full bleed */}
        <img
          src={maskUrl}
          alt={`Masque ${label}`}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            // Fallback: hide image, show plain card
            const el = e.currentTarget.closest(".group") as HTMLElement | null
            if (el) el.classList.add("mask-error")
            ;(e.currentTarget as HTMLImageElement).style.display = "none"
          }}
        />
        {/* Left gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
        {/* Bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Content overlay */}
        <div className="absolute inset-0 flex items-center justify-between p-4">
          <div className="flex-1 pr-4">
            <p className="font-serif text-lg text-white leading-tight">{label}</p>
            <p className="text-[11px] text-white/65 mt-1 leading-snug line-clamp-2">{tip}</p>
          </div>
          {/* Score badge */}
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="27" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
              <circle
                cx="32" cy="32" r="27" fill="none"
                stroke={color} strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 169.6} 169.6`}
              />
            </svg>
            <div className="z-10 text-center">
              <p className="font-bold text-white text-lg leading-none">{score}</p>
              <p className="text-white/50 text-[8px]">/100</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Fallback: no mask available ──
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium text-sm">{label}</span>
          <span className="font-bold text-sm" style={{ color }}>{score}/100</span>
        </div>
        <Progress value={score} className="h-1.5" />
        <p className="text-[11px] text-muted-foreground mt-2 leading-snug">{tip}</p>
      </div>
    </div>
  )
}
