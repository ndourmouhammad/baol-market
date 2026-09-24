import Link from 'next/link'
import { Button } from '@/components/Button'
import { FileQuestion } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page introuvable — Baol Market',
}

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center p-6 py-32 text-center bg-(--fond) min-h-[70vh]">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-6 shadow-sm">
        <FileQuestion className="w-10 h-10" />
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-(--encre) mb-3">Page introuvable</h1>
      <p className="text-(--gris-texte) max-w-md mx-auto mb-10 text-lg">
        La page que vous recherchez n&apos;existe pas, a été supprimée ou est temporairement indisponible.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Link href="/" className="w-full sm:w-auto outline-none" tabIndex={-1}>
          <Button variant="primary" className="w-full sm:w-auto shadow-sm focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:ring-offset-2">
            Retour à l&apos;accueil
          </Button>
        </Link>
        <Link href="/produits" className="w-full sm:w-auto outline-none" tabIndex={-1}>
          <Button variant="secondary" className="w-full sm:w-auto border border-gray-200 focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:ring-offset-2">
            Voir le catalogue
          </Button>
        </Link>
      </div>
    </main>
  )
}
