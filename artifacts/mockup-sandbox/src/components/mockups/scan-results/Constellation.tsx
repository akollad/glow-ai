import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';

const mockData = {
  overallScore: 74,
  skinType: "Mixte",
  undertone: "warm",
  skinAge: 28,
  zones: [
    { emoji: "✨", title: "Teint & Éclat", metrics: [
      { label: "Éclat", score: 81, tip: "Vitamine C sérum le matin booste l'éclat naturel" },
      { label: "Rougeurs", score: 68, tip: "Centella asiatica + niacinamide pour apaiser" },
      { label: "Taches", score: 55, tip: "SPF 50+ quotidien + niacinamide 10% pour uniformiser" },
    ]},
    { emoji: "💧", title: "Hydratation & Sébum", metrics: [
      { label: "Hydratation", score: 72, tip: "Sérum acide hyaluronique + occlusion la nuit" },
      { label: "Sébum", score: 60, tip: "Nettoyant doux 2×/jour, évitez de sur-nettoyer" },
      { label: "Fermeté", score: 79, tip: "Rétinol nuit + massage facial gua sha" },
    ]},
    { emoji: "🔬", title: "Texture & Pores", metrics: [
      { label: "Acné", score: 83, tip: "Acide salicylique soir, ne touchez pas les imperfections" },
      { label: "Pores", score: 65, tip: "Argile 1×/semaine + BHA pour affiner les pores" },
      { label: "Rides", score: 88, tip: "Rétinol + peptides + protection solaire quotidienne" },
    ]},
    { emoji: "👁", title: "Regard", metrics: [
      { label: "Poches", score: 70, tip: "Drainage lymphatique + compresses froides le matin" },
      { label: "Cernes", score: 58, tip: "Caféine contour des yeux + sommeil 8h minimum" },
      { label: "Vallées", score: 74, tip: "Hydratation ciblée + repos, évitez le sel" },
      { label: "Paupière basse", score: 82, tip: "Exercices faciaux + sommeil sur le dos" },
      { label: "Paupière haute", score: 77, tip: "Massage frontal + sérum liftant" },
    ]},
  ],
  aiAdvice: "Votre peau révèle une belle vitalité naturelle. Concentrez-vous sur l'hydratation et la protection solaire pour amplifier cet éclat.",
  colorRecommendations: ["#C4956A", "#8B4513", "#2F4F4F", "#722F37", "#D4A96A"]
};

const getScoreColor = (score: number) => {
  if (score >= 80) return { hex: "#22c55e", bg: "rgba(34, 197, 94, 0.15)", border: "rgba(34, 197, 94, 0.5)", shadow: "0 0 15px rgba(34, 197, 94, 0.2)" };
  if (score >= 60) return { hex: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.5)", shadow: "0 0 15px rgba(245, 158, 11, 0.2)" };
  return { hex: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.5)", shadow: "0 0 15px rgba(239, 68, 68, 0.2)" };
};

const getBubbleSize = (score: number) => {
  return 54 + (score / 100) * 26; // 54px to 80px based on score
};

type Metric = { label: string; score: number; tip: string };

const BackgroundStars = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
    {[...Array(30)].map((_, i) => (
      <div 
        key={i}
        className="absolute rounded-full bg-amber-100"
        style={{
          width: Math.random() * 2 + 1 + 'px',
          height: Math.random() * 2 + 1 + 'px',
          top: Math.random() * 100 + '%',
          left: Math.random() * 100 + '%',
          opacity: Math.random() * 0.5 + 0.1,
          boxShadow: '0 0 4px rgba(255,251,235,0.4)'
        }}
      />
    ))}
  </div>
);

export function Constellation() {
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null);
  const mainColor = getScoreColor(mockData.overallScore);

  return (
    <div className="w-[390px] h-[844px] bg-zinc-950 text-zinc-100 overflow-hidden flex flex-col font-sans relative">
      <BackgroundStars />
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24 hide-scrollbar relative z-10">
        
        {/* Hero: photo + score */}
        <div className="relative h-56 overflow-hidden rounded-b-[3rem]">
          {/* selfie en fond */}
          <img src="/__mockup/images/selfie.jpg"
               className="absolute inset-0 w-full h-full object-cover object-top" />
          {/* gradient noir en bas */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-zinc-950" />
          {/* Score ring centré en bas, chevauchant le bord */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/3">
            <div className="relative w-28 h-28">
              <svg className="absolute inset-0 -rotate-90 drop-shadow-lg" width="112" height="112" viewBox="0 0 112 112">
                <circle cx="56" cy="56" r="44" fill="rgba(24,24,27,0.85)" stroke="rgba(255,255,255,0.05)" strokeWidth="7"/>
                <circle cx="56" cy="56" r="44" fill="none" stroke={mainColor.hex} strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray="276.46" strokeDashoffset={`${276.46*(1-mockData.overallScore/100)}`}/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white font-bold text-3xl font-['Playfair_Display'] leading-none">{mockData.overallScore}</span>
                <span className="text-zinc-400 text-[9px] uppercase tracking-widest mt-0.5">Glow Score</span>
              </div>
            </div>
          </div>
        </div>
        {/* Chips sous le hero (avec espacement pour le ring qui dépasse) */}
        <div className="flex gap-2 justify-center pt-14 pb-4 px-4">
          <span className="px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] font-medium text-amber-100/70">{mockData.skinType}</span>
          <span className="px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] font-medium text-amber-100/70 uppercase">{mockData.undertone}</span>
          <span className="px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] font-medium text-amber-100/70">{mockData.skinAge} ans</span>
        </div>

        {/* Constellation Grid */}
        <div className="px-4 py-6 relative">
          <h2 className="text-xl font-['Playfair_Display'] italic text-center mb-10 text-amber-50/90 flex items-center justify-center gap-2">
            <Sparkles size={16} className="text-amber-500/50" />
            Votre constellation cutanée
            <Sparkles size={16} className="text-amber-500/50" />
          </h2>
          
          <div className="grid grid-cols-2 gap-x-2 gap-y-12 relative">
            {mockData.zones.map((zone, zIndex) => (
              <div key={zIndex} className="flex flex-col items-center relative">
                <div className="flex flex-col items-center gap-1 mb-5">
                  <span className="text-lg opacity-80">{zone.emoji}</span>
                  <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest text-center">{zone.title}</span>
                </div>
                
                <div className="flex flex-wrap justify-center gap-3 relative w-full px-1">
                  {zone.metrics.map((metric, mIndex) => {
                    const color = getScoreColor(metric.score);
                    const size = getBubbleSize(metric.score);
                    
                    return (
                      <motion.button
                        key={mIndex}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedMetric(metric)}
                        className="rounded-full flex flex-col items-center justify-center transition-all cursor-pointer relative"
                        style={{
                          width: size,
                          height: size,
                          backgroundColor: color.bg,
                          borderColor: color.border,
                          borderWidth: '1px',
                          boxShadow: color.shadow,
                        }}
                      >
                        <span className="text-[13px] font-bold text-white mb-0.5" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                          {metric.score}
                        </span>
                        <span className="text-[8px] text-white/90 font-medium leading-tight max-w-[90%] text-center truncate px-1">
                          {metric.label}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Advice & Palette */}
        <div className="mt-8 px-6 pb-6 relative">
          <div className="bg-gradient-to-br from-zinc-900/80 to-black border border-amber-900/20 rounded-2xl p-5 mb-10 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-20"><Sparkles size={24} className="text-amber-500" /></div>
            <p className="text-sm text-zinc-300 leading-relaxed italic font-['Playfair_Display'] relative z-10">
              "{mockData.aiAdvice}"
            </p>
          </div>
          
          <div className="flex flex-col items-center mb-8">
            <span className="text-[10px] text-amber-200/50 uppercase tracking-[0.2em] mb-4">Vos Couleurs Idéales</span>
            <div className="flex gap-4">
              {mockData.colorRecommendations.map((color, i) => (
                <div 
                  key={i} 
                  className="w-10 h-10 rounded-full border border-white/5 shadow-lg relative group cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                >
                  <div className="absolute inset-0 rounded-full shadow-[inset_0_-2px_6px_rgba(0,0,0,0.3)] pointer-events-none" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sheet Overlay */}
      <AnimatePresence>
        {selectedMetric && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMetric(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md z-40"
            />
            <motion.div 
              className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl overflow-hidden bg-zinc-900 border-t border-zinc-700 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
            >
              {/* masque photo */}
              <div className="relative h-48 overflow-hidden">
                <img src="/__mockup/images/selfie.jpg"
                     className="absolute inset-0 w-full h-full object-cover object-top" />
                <div className="absolute inset-0"
                     style={{ backgroundColor: getScoreColor(selectedMetric.score).hex + '55',
                              mixBlendMode: 'multiply' }} />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
                
                {/* score ring flottant en bas centre */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                  <div className="relative w-16 h-16">
                    <svg className="absolute inset-0 -rotate-90 drop-shadow-md" width="64" height="64" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="26" fill="rgba(24,24,27,0.9)" stroke="rgba(255,255,255,0.05)" strokeWidth="4"/>
                      <circle cx="32" cy="32" r="26" fill="none" stroke={getScoreColor(selectedMetric.score).hex} strokeWidth="4"
                              strokeLinecap="round"
                              strokeDasharray="163.36" strokeDashoffset={`${163.36*(1-selectedMetric.score/100)}`}/>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">{selectedMetric.score}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* texte */}
              <div className="px-6 pt-10 pb-8 text-center">
                <h3 className="text-xl font-['Playfair_Display'] text-white mb-2">{selectedMetric.label}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{selectedMetric.tip}</p>
              </div>
              
              {/* bouton fermer */}
              <button onClick={() => setSelectedMetric(null)}
                      className="absolute top-4 right-4 z-10 text-white/70 bg-black/40 backdrop-blur-md rounded-full p-2 hover:bg-black/60 hover:text-white transition-colors shadow-lg">
                <X size={18} />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}

export default Constellation;
