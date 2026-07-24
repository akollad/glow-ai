import { Route } from "wouter"
export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-serif font-bold text-foreground">404</h1>
        <p className="mt-2 text-muted-foreground font-sans">Page non trouvée</p>
      </div>
    </div>
  )
}
