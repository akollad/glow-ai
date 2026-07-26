import React, { useState } from "react";
import { ArrowLeft, ChevronRight, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MOCK_DATA = {
  overallScore: 74,
  skinType: "Mixte",
  undertone: "warm",
  skinAge: 28,
  zones: [
    {
      emoji: "✨",
      title: "Teint & Éclat",
      metrics: [
        { label: "Éclat", score: 81, tip: "Vitamine C sérum le matin booste l'éclat naturel" },
        { label: "Rougeurs", score: 68, tip: "Centella asiatica + niacinamide pour apaiser" },
        { label: "Taches", score: 55, tip: "SPF 50+ quotidien + niacinamide 10% pour uniformiser" },
      ],
    },
    {
      emoji: "💧",
      title: "Hydratation & Sebum",
      metrics: [
        { label: "Hydratation", score: 72, tip: "Sérum acide hyaluronique + occlusion la nuit" },
        { label: "Sébum", score: 60, tip: "Nettoyant doux 2×/jour, évitez de sur-nettoyer" },
        { label: "Fermeté", score: 79, tip: "Rétinol nuit + massage facial gua sha" },
      ],
    },
    {
      emoji: "🔬",
      title: "Texture & Pores",
      metrics: [
        { label: "Acné", score: 83, tip: "Acide salicylique soir, ne touchez pas les imperfections" },
        { label: "Pores", score: 65, tip: "Argile 1×/semaine + BHA pour affiner les pores" },
        { label: "Rides", score: 88, tip: "Rétinol + peptides + protection solaire quotidienne" },
      ],
    },
    {
      emoji: "👁",
      title: "Regard",
      metrics: [
        { label: "Poches", score: 70, tip: "Drainage lymphatique + compresses froides le matin" },
        { label: "Cernes", score: 58, tip: "Caféine contour des yeux + sommeil 8h minimum" },
        { label: "Vallées", score: 74, tip: "Hydratation ciblée + repos, évitez le sel" },
        { label: "Paupière basse", score: 82, tip: "Exercices faciaux + sommeil sur le dos" },
        { label: "Paupière haute", score: 77, tip: "Massage frontal + sérum liftant" },
      ],
    },
  ],
  aiAdvice:
    "Votre peau révèle une belle vitalité naturelle. Concentrez-vous sur l'hydratation et la protection solaire pour amplifier cet éclat.",
  colorRecommendations: ["#C4956A", "#8B4513", "#2F4F4F", "#722F37", "#D4A96A"],
};

const getScoreColor = (score: number) => {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
};

const CircularProgress = ({ score, size = 56, strokeWidth = 4, showText = true }: { score: number, size?: number, strokeWidth?: number, showText?: boolean }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          className="text-zinc-800"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {showText && (
        <span className="absolute text-sm font-semibold font-['Playfair_Display'] text-white">
          {score}
        </span>
      )}
    </div>
  );
};

export function Dashboard() {
  const [activeZoneIdx, setActiveZoneIdx] = useState(0);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const activeZone = MOCK_DATA.zones[activeZoneIdx];

  return (
    <div className="w-[390px] h-[844px] bg-zinc-950 text-white overflow-y-auto overflow-x-hidden font-sans relative">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap');
          /* Hide scrollbar for Chrome, Safari and Opera */
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          /* Hide scrollbar for IE, Edge and Firefox */
          .no-scrollbar {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
        `}
      </style>
      
      {/* Header (sticky) */}
      <div className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-md pt-12 pb-4 px-5">
        <div className="flex items-center justify-between mb-4">
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900/50 hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={20} className="text-zinc-300" />
          </button>
          <h1 className="font-['Playfair_Display'] text-lg font-semibold text-zinc-100">Rapport de peau</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="px-5 pb-6">
        {/* Score Hero Card */}
        <div className="bg-zinc-900 rounded-3xl p-5 mb-6 border border-zinc-800/50 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          
          <div className="flex items-center gap-5 mb-4 relative z-10">
            <CircularProgress score={MOCK_DATA.overallScore} size={80} strokeWidth={6} />
            <div className="flex-1">
              <h2 className="text-2xl font-['Playfair_Display'] font-semibold mb-2">Glow Score</h2>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {MOCK_DATA.skinType}
                </span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {MOCK_DATA.skinAge} ans
                </span>
              </div>
            </div>
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-amber-500/50 shrink-0 shadow-lg">
              <img src="/__mockup/images/selfie.jpg"
                   className="w-full h-full object-cover object-top" alt="selfie" />
            </div>
          </div>
          
          <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/50 relative z-10">
            <p className="text-sm text-zinc-400 italic line-clamp-1">
              "{MOCK_DATA.aiAdvice}"
            </p>
          </div>
        </div>

        {/* Zone Tabs (Sticky-ish behavior using nested sticky if we want, or just below header) */}
        <div className="sticky top-[108px] z-10 bg-zinc-950 pt-2 pb-4 -mx-5 px-5">
          <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
            {MOCK_DATA.zones.map((zone, idx) => {
              const isActive = idx === activeZoneIdx;
              // Shorten title for tabs
              const shortTitle = zone.title.split(" & ")[0] + (zone.title.includes("&") ? "." : "");
              
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveZoneIdx(idx);
                    setExpandedMetric(null);
                  }}
                  className={`relative px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                    isActive ? "text-amber-400" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <span className="mr-1.5">{zone.emoji}</span>
                  {shortTitle}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute left-0 right-0 bottom-0 h-[2px] bg-amber-400 mx-3 rounded-full"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Metric Grid */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeZoneIdx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-2 gap-4"
            >
              {activeZone.metrics.map((metric) => {
                const isExpanded = expandedMetric === metric.label;
                
                return (
                  <motion.div
                    key={metric.label}
                    layout
                    onClick={() => setExpandedMetric(isExpanded ? null : metric.label)}
                    className="relative rounded-2xl overflow-hidden h-44 cursor-pointer"
                  >
                    {/* selfie en fond */}
                    <img src="/__mockup/images/selfie.jpg"
                         className="absolute inset-0 w-full h-full object-cover object-top" />
                    {/* overlay couleur (masque) */}
                    <div className="absolute inset-0"
                         style={{ backgroundColor: getScoreColor(metric.score) + '44', mixBlendMode: 'multiply' }} />
                    {/* gradient bas pour lisibilité */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    {/* score ring en haut à droite */}
                    <div className="absolute top-3 right-3">
                      <div className="relative w-12 h-12">
                        <svg className="absolute inset-0 -rotate-90" width="48" height="48" viewBox="0 0 48 48">
                          <circle cx="24" cy="24" r="18" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.1)" strokeWidth="4"/>
                          <circle cx="24" cy="24" r="18" fill="none" stroke={getScoreColor(metric.score)} strokeWidth="4"
                                  strokeLinecap="round"
                                  strokeDasharray={`${(metric.score/100)*113.1} 113.1`}/>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white font-bold text-xs">{metric.score}</span>
                        </div>
                      </div>
                    </div>
                    {/* label en bas */}
                    <div className="absolute bottom-0 inset-x-0 p-3">
                      <p className="text-white font-medium text-sm leading-tight">{metric.label}</p>
                      {isExpanded && (
                        <p className="text-white/70 text-[11px] mt-1 leading-snug">{metric.tip}</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Color Palette Section */}
        <div className="mt-10 mb-8">
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent w-full mb-8" />
          <h3 className="font-['Playfair_Display'] text-xl font-semibold mb-5 text-center text-zinc-100">
            Votre palette
          </h3>
          
          <div className="flex justify-between items-end px-2">
            {MOCK_DATA.colorRecommendations.map((hex, i) => (
              <motion.div 
                key={hex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.4 }}
                className="flex flex-col items-center gap-3"
              >
                <div 
                  className="w-12 h-16 rounded-full shadow-inner border border-white/10"
                  style={{ backgroundColor: hex }}
                />
                <span className="text-[10px] text-zinc-500 font-mono tracking-wider">{hex}</span>
              </motion.div>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
}

export default Dashboard;
