import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const data = {
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

const getScoreTextColor = (score: number) => {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
};

const getScoreBgColor = (score: number) => {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
};

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", damping: 35, stiffness: 350 },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? "100%" : "-100%",
    opacity: 0,
    transition: { type: "spring", damping: 35, stiffness: 350 },
  }),
};

export function Stories() {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const DURATION = 6000; // 6 seconds per slide
  const UPDATE_INTERVAL = 30;

  useEffect(() => {
    if (isPaused) return;
    
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          if (current < 4) {
            setDirection(1);
            setCurrent((c) => c + 1);
            return 0;
          }
          return 100;
        }
        return p + (UPDATE_INTERVAL / DURATION) * 100;
      });
    }, UPDATE_INTERVAL);
    
    return () => clearInterval(timer);
  }, [current, isPaused]);

  const handleNext = () => {
    if (current < 4) {
      setDirection(1);
      setCurrent((c) => c + 1);
      setProgress(0);
    }
  };

  const handlePrev = () => {
    if (current > 0) {
      setDirection(-1);
      setCurrent((c) => c - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  const renderHero = () => {
    const radius = 88;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - data.overallScore / 100);

    return (
      <div className="absolute inset-0 flex flex-col items-center p-6 pt-32 pb-12">
        <img
          src="/__mockup/images/selfie.jpg"
          className="absolute inset-0 w-full h-full object-cover object-top"
          alt="selfie"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/90" />
        
        <div className="relative z-10 w-56 h-56 flex items-center justify-center mb-8 shrink-0">
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <circle
              cx="112"
              cy="112"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="6"
            />
            <motion.circle
              cx="112"
              cy="112"
              r={radius}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
            />
          </svg>
          <div className="text-center">
            <div className="text-6xl font-['Playfair_Display'] text-amber-500 font-bold mb-1">
              {data.overallScore}
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-medium">
              Score Global
            </div>
          </div>
        </div>

        <h2 className="relative z-10 text-4xl font-['Playfair_Display'] text-white mb-8">Bien</h2>

        <div className="relative z-10 flex gap-3 mb-auto">
          <div className="px-5 py-2 rounded-full bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-200">
            {data.skinType}
          </div>
          <div className="px-5 py-2 rounded-full bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-200 capitalize">
            {data.undertone}
          </div>
          <div className="px-5 py-2 rounded-full bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-200">
            {data.skinAge} ans
          </div>
        </div>

        <div className="relative z-10 w-full mt-12">
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-md shadow-[0_0_20px_rgba(245,158,11,0.05)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
            <p className="text-amber-100/90 text-base italic leading-relaxed text-center font-['Playfair_Display']">
              "{data.aiAdvice}"
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderZone = (zone: typeof data.zones[0]) => (
    <div className="absolute inset-0 pt-28 px-7 flex flex-col bg-zinc-950">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-amber-500/5 blur-[100px] pointer-events-none rounded-full transform translate-x-1/3 -translate-y-1/3" />
      
      <div className="relative z-10 flex flex-col items-start mb-12">
        <span className="text-7xl mb-6 drop-shadow-xl">{zone.emoji}</span>
        <h2 className="text-4xl font-['Playfair_Display'] text-white font-bold leading-tight">
          {zone.title}
        </h2>
      </div>

      <div className="relative z-10">
        {zone.metrics.map((m, i) => {
          const scoreColor = m.score >= 80 ? '#22c55e' : m.score >= 60 ? '#f59e0b' : '#ef4444';
          return (
            <div key={m.label} className="relative rounded-2xl overflow-hidden h-36 mb-4">
              {/* selfie */}
              <img src="/__mockup/images/selfie.jpg"
                   className="absolute inset-0 w-full h-full object-cover object-top" />
              {/* overlay couleur = "masque" */}
              <div className="absolute inset-0"
                   style={{ backgroundColor: scoreColor + '55', mixBlendMode: 'multiply' }} />
              {/* gradient pour texte */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
              {/* contenu */}
              <div className="absolute inset-0 flex items-center justify-between p-4">
                <div className="flex-1 pr-4">
                  <p className="font-['Playfair_Display'] text-lg text-white">{m.label}</p>
                  <p className="text-[11px] text-white/65 mt-1 leading-snug">{m.tip}</p>
                </div>
                {/* mini ring */}
                <div className="relative w-14 h-14 shrink-0">
                  <svg className="absolute inset-0 -rotate-90" width="56" height="56" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="22" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.1)" strokeWidth="5"/>
                    <circle cx="28" cy="28" r="22" fill="none" stroke={scoreColor} strokeWidth="5"
                            strokeLinecap="round"
                            strokeDasharray={`${(m.score/100)*138.2} 138.2`}/>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-white font-bold text-sm leading-none">{m.score}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex items-center justify-center min-h-screen bg-black/50 backdrop-blur-sm p-4">
      <div className="w-[390px] h-[844px] bg-black text-white overflow-hidden relative font-sans rounded-[40px] shadow-2xl ring-4 ring-zinc-800">
        
        {/* Progress Bars */}
        <div className="absolute top-6 inset-x-0 px-5 z-50 flex gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-md">
              <div
                className="h-full bg-white transition-all ease-linear"
                style={{
                  width: i < current ? "100%" : i === current ? `${progress}%` : "0%",
                  transitionDuration: i === current ? `${UPDATE_INTERVAL}ms` : "0ms",
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Content */}
        <div className="relative w-full h-full">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0"
            >
              {current === 0 ? renderHero() : renderZone(data.zones[current - 1])}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Tap Zones for Navigation */}
        <div
          className="absolute inset-y-0 left-0 w-2/5 z-40 cursor-pointer"
          onPointerDown={() => setIsPaused(true)}
          onPointerUp={() => {
            setIsPaused(false);
            handlePrev();
          }}
          onPointerLeave={() => setIsPaused(false)}
        />
        <div
          className="absolute inset-y-0 right-0 w-3/5 z-40 cursor-pointer"
          onPointerDown={() => setIsPaused(true)}
          onPointerUp={() => {
            setIsPaused(false);
            handleNext();
          }}
          onPointerLeave={() => setIsPaused(false)}
        />
      </div>
    </div>
  );
}

export default Stories;
