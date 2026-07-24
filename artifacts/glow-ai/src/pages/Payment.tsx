import { useState, useEffect } from "react"
import { useInitiatePayment, useGetPaymentStatus } from "@workspace/api-client-react"
import { BottomNav } from "@/components/layout/BottomNav"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Loader2, Smartphone, CreditCard, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function PaymentPage() {
  const [phone, setPhone] = useState("")
  const [telecom, setTelecom] = useState<"AM" | "OM" | "MP">("MP")
  const [plan, setPlan] = useState<"per_scan" | "monthly">("per_scan")
  
  const [refHub, setRefHub] = useState<string | null>(null)
  
  const initiatePayment = useInitiatePayment()
  
  // Polling only active when we have a refHub and status is not final
  const { data: statusData } = useGetPaymentStatus(refHub as string, {
    query: {
      enabled: !!refHub,
      refetchInterval: (query) => {
        const state = query.state.data?.status
        return state === "SUCCESS" || state === "FAILED" || state === "CANCELLED" || state === "EXPIRED" ? false : 3000
      }
    }
  })

  const isSuccess = statusData?.status === "SUCCESS"
  const isPending = !!refHub && !isSuccess && statusData?.status !== "FAILED"

  const handlePay = async () => {
    if (!phone) return
    try {
      const result = await initiatePayment.mutateAsync({
        data: {
          amount: plan === "monthly" ? 5 : 1,
          currency: "USD",
          phone: phone,
          telecom: telecom,
          planType: plan
        }
      })
      if (result.success && result.referenceHub) {
        setRefHub(result.referenceHub)
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="min-h-[100dvh] w-full flex justify-center bg-background noise-bg pb-32">
      <div className="w-full max-w-md flex flex-col px-6 pt-12">
        <h1 className="font-serif text-3xl text-foreground mb-2">Recharger</h1>
        <p className="text-muted-foreground mb-8">Paiement simple par Mobile Money.</p>

        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-3xl p-8 flex flex-col items-center text-center shadow-lg border border-emerald-100"
            >
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="font-serif text-2xl mb-2">Paiement Réussi !</h2>
              <p className="text-muted-foreground mb-8">Vos crédits ont été ajoutés à votre compte Glow AI.</p>
              <Button className="w-full rounded-full h-14" onClick={() => window.location.href = "/dashboard"}>
                Retour à l'accueil
              </Button>
            </motion.div>
          ) : isPending ? (
            <motion.div 
              key="pending"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-3xl p-8 flex flex-col items-center text-center shadow-lg border border-border/50"
            >
              <Loader2 size={48} className="text-primary animate-spin mb-6" />
              <h2 className="font-serif text-2xl mb-2">Validation en cours...</h2>
              <p className="text-muted-foreground">
                Veuillez valider le paiement sur votre téléphone. Ne fermez pas cette page.
              </p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              
              {/* Plan Selection */}
              <div className="grid grid-cols-2 gap-4">
                <Card 
                  className={`cursor-pointer transition-all ${plan === "per_scan" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/50"}`}
                  onClick={() => setPlan("per_scan")}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <span className="font-bold text-2xl mb-1">1$</span>
                    <span className="text-xs text-muted-foreground font-medium uppercase">1 Scan</span>
                  </CardContent>
                </Card>
                <Card 
                  className={`cursor-pointer transition-all ${plan === "monthly" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/50"}`}
                  onClick={() => setPlan("monthly")}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <span className="font-bold text-2xl mb-1">5$</span>
                    <span className="text-xs text-primary font-medium uppercase">Illimité / Mois</span>
                  </CardContent>
                </Card>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Réseau Mobile</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["MP", "AM", "OM"].map((net) => (
                      <button
                        key={net}
                        onClick={() => setTelecom(net as any)}
                        className={`py-3 rounded-xl text-sm font-bold border transition-colors ${telecom === net ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-muted'}`}
                      >
                        {net === "MP" ? "M-Pesa" : net === "AM" ? "Airtel" : "Orange"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Numéro de téléphone</label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <Input 
                      placeholder="081 234 5678" 
                      className="pl-12 h-14 rounded-2xl bg-card border-border/50"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      type="tel"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  className="w-full h-14 rounded-full text-lg shadow-md" 
                  disabled={initiatePayment.isPending || !phone}
                  onClick={handlePay}
                >
                  {initiatePayment.isPending ? <Loader2 className="animate-spin" /> : "Payer maintenant"}
                </Button>
                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                  <ShieldCheck size={14} /> Paiement sécurisé
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
      <BottomNav />
    </div>
  )
}
