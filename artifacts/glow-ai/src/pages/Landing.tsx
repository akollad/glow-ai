import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Sparkles, Camera, ShieldCheck, ArrowRight } from "lucide-react"

export default function Landing() {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center bg-background noise-bg pb-20">
      <div className="w-full max-w-md flex flex-col items-center px-6 pt-12">
        
        {/* Header / Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3 mb-16"
        >
          <img src="/logo.svg" alt="Glow AI Logo" className="w-10 h-10" />
          <span className="font-serif text-3xl text-foreground tracking-tight">Glow AI</span>
        </motion.div>

        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 text-primary text-sm font-medium mb-6">
            <Sparkles size={16} />
            <span>Votre dermatologue de poche</span>
          </div>
          
          <h1 className="text-5xl font-serif leading-[1.1] mb-6 text-foreground">
            Révélez la <span className="text-primary italic">beauté</span> de votre peau.
          </h1>
          
          <p className="text-lg text-muted-foreground font-sans leading-relaxed mb-8 px-4">
            Un diagnostic de peau par IA pensé pour les peaux riches en mélanine. Découvrez votre routine, vos couleurs, et votre éclat naturel.
          </p>
        </motion.div>

        {/* Hero Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.35 }}
          className="w-full mb-12 rounded-3xl overflow-hidden shadow-xl"
        >
          <img
            src="/hero-scan.jpg"
            alt="Femme africaine utilisant Glow AI pour analyser sa peau"
            className="w-full h-64 object-cover object-top"
          />
        </motion.div>

        {/* Feature Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="w-full flex flex-col gap-4 mb-16"
        >
          <div className="bg-card p-5 rounded-3xl border border-border/50 shadow-sm flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-full text-primary shrink-0">
              <Camera size={24} />
            </div>
            <div>
              <h3 className="font-serif text-xl mb-1">Selfie & Scan</h3>
              <p className="text-sm text-muted-foreground">Prenez une photo, notre IA analyse vos pores, votre hydratation et votre éclat.</p>
            </div>
          </div>
          
          <div className="bg-card p-5 rounded-3xl border border-border/50 shadow-sm flex items-start gap-4">
            <div className="bg-secondary/20 p-3 rounded-full text-secondary-foreground shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-serif text-xl mb-1">Conseils Sur-Mesure</h3>
              <p className="text-sm text-muted-foreground">Une routine adaptée à votre score de peau et à votre type unique.</p>
            </div>
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="w-full flex flex-col gap-4"
        >
          <Button asChild size="lg" className="w-full rounded-full text-lg h-14 group">
            <Link href="/sign-up">
              Commencer mon scan
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          
          <p className="text-center text-sm text-muted-foreground mt-2">
            Déjà membre ? {" "}
            <Link href="/sign-in" className="text-primary font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </motion.div>

      </div>
    </div>
  )
}
