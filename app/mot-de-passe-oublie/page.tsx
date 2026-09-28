'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CheckCircle2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/Button'
import { FormField } from '@/components/FormField'

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const res = await fetch('/api/auth/request-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    const json = await res.json()
    setLoading(false)
    setMessage(json.message || "Si ce numéro est associé à un compte avec un email, un lien a été envoyé.")
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-6 py-12 bg-(--fond)">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center flex justify-center">
          <Link href="/">
            <Image
              src="/logo-bm.png"
              alt="Baol Market"
              width={160}
              height={52}
              className="object-contain"
              priority
            />
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-8 lg:p-10 shadow-sm border border-gray-100">
          <Link
            href="/login"
            className="inline-flex items-center text-sm font-medium text-(--vert-baol) hover:text-(--vert-baol-fonce) transition-colors mb-6 group outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-md"
          >
            <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Retour à la connexion
          </Link>

          <h1 className="text-2xl font-bold text-(--encre) mb-2">Mot de passe oublié</h1>
          <p className="text-(--gris-texte) mb-8 text-sm leading-relaxed">
            Entrez votre numéro de téléphone. Si un email est associé à votre compte, un lien de réinitialisation vous sera envoyé.
          </p>

          {message ? (
            <div className="space-y-6">
              <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{message}</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs text-(--gris-texte) space-y-2">
                <p>
                  Si vous n&apos;avez pas renseigné d&apos;email lors de votre inscription, notre équipe support peut vous aider :
                </p>
                <a
                  href="https://wa.me/221781507505"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-(--vert-baol) font-bold hover:underline"
                >
                  <MessageCircle className="w-4 h-4" />
                  Contacter l&apos;assistance WhatsApp (+221 78 150 75 05)
                </a>
              </div>

              <Link
                href="/login"
                className="block text-center text-sm text-(--vert-baol) font-bold hover:underline pt-2"
              >
                Retourner à la page de connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <FormField
                label="Numéro de téléphone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="78 150 75 05"
                autoComplete="tel"
              />

              <Button
                type="submit"
                disabled={loading}
                loading={loading}
                fullWidth
                className="py-3.5 shadow-md text-base font-semibold"
              >
                Envoyer le lien de réinitialisation
              </Button>
            </form>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="text-sm text-(--gris-texte) hover:text-(--vert-baol) transition-colors"
          >
            Se souvenir de son mot de passe ? Connexion
          </Link>
        </div>
      </div>
    </div>
  )
}