import { useListScans } from "@workspace/api-client-react"
import { BottomNav } from "@/components/layout/BottomNav"
import { motion } from "framer-motion"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Sparkles, ChevronRight } from "lucide-react"
import { Link } from "wouter"

export default function HistoryPage() {
  const { data: scans, isLoading } = useListScans()

  return (
    <div className="min-h-[100dvh] w-full flex justify-center bg-background noise-bg pb-32">
      <div className="w-full max-w-md flex flex-col px-6 pt-12">
        <h1 className="font-serif text-3xl text-foreground mb-8">Historique</h1>

        <div className="flex flex-col gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-24 rounded-2xl" />
            ))
          ) : scans?.length === 0 ? (
            <div className="text-center text-muted-foreground mt-10">
              <p>Aucun scan pour le moment.</p>
            </div>
          ) : (
            scans?.map((scan, index) => (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/scan/${scan.id}`}>
                  <Card className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer group">
                    <CardContent className="p-4 flex items-center gap-4">
                      {/* Thumbnail or placeholder */}
                      <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden relative">
                        {scan.selfieUrl ? (
                          <img src={scan.selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
                        ) : (
                          <Sparkles className="text-primary/50" />
                        )}
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                      </div>

                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">
                          {format(parseISO(scan.createdAt), "d MMMM yyyy", { locale: fr })}
                        </p>
                        <div className="flex items-end gap-2">
                          <span className="font-serif text-2xl leading-none text-foreground">
                            {scan.skinMetrics?.overallScore || "--"}
                          </span>
                          <span className="text-sm text-muted-foreground pb-0.5">Score</span>
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <ChevronRight size={18} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
