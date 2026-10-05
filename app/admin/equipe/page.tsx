'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/Button'
import { ConfirmModal, type ConfirmModalVariant } from '@/components/ConfirmModal'

type StaffRole = 'super_admin' | 'admin' | 'moderator'
type StaffMember = { id: string; email: string; role: StaffRole; created_at: string; has_matricule?: boolean }

// Identifiants affichés une seule fois, après une création ou une réinitialisation
type Credentials = {
  kind: 'created' | 'reset'
  email: string
  tempPassword?: string
  matricule?: string | null
}

// Confirmation modale en attente
type PendingAction =
  | { type: 'remove'; member: StaffMember }
  | { type: 'matricule'; member: StaffMember }

const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  moderator: 'Modérateur',
}

async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${session?.access_token}` },
  })
}

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [currentRole, setCurrentRole] = useState<StaffRole | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<StaffRole>('moderator')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // State pour le modal de confirmation
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id ?? null)

    if (user) {
      const { data: me } = await supabase.from('staff').select('role').eq('id', user.id).single()
      setCurrentRole((me?.role as StaffRole) ?? null)
    }

    const res = await authFetch('/api/admin/staff')
    const json = await res.json()
    if (res.ok) setStaffList(json.staff)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setCredentials(null)

    const createdEmail = email
    const res = await authFetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    })
    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(json.error)
    } else {
      setCredentials({
        kind: 'created',
        email: createdEmail,
        tempPassword: json.tempPassword,
        matricule: json.matricule,
      })
      setEmail('')
      setRole('moderator')
      loadData()
    }
  }

  // Exécution des actions confirmées par le modal
  async function executeConfirmedAction() {
    if (!pendingAction) return
    setActionLoading(true)

    if (pendingAction.type === 'remove') {
      await authFetch(`/api/admin/staff/${pendingAction.member.id}`, { method: 'DELETE' })
      setPendingAction(null)
      setActionLoading(false)
      loadData()
    } else if (pendingAction.type === 'matricule') {
      const member = pendingAction.member
      setResettingId(member.id)
      setError('')
      const res = await authFetch(`/api/admin/staff/${member.id}/matricule`, { method: 'POST' })
      const json = await res.json()
      setResettingId(null)
      setPendingAction(null)
      setActionLoading(false)

      if (!res.ok) {
        setError(json.error || 'Impossible de générer le matricule.')
        return
      }

      setCredentials({ kind: 'reset', email: member.email, matricule: json.matricule })
      loadData()
    }
  }

  // Helpers pour le modal
  function getModalProps() {
    if (!pendingAction) return null

    if (pendingAction.type === 'remove') {
      return {
        title: 'Retirer ce membre ?',
        variant: 'danger' as const,
        confirmLabel: 'Retirer',
        children: (
          <p>
            Le compte de <strong className="text-(--encre)">{pendingAction.member.email}</strong> sera
            définitivement supprimé. Cette action est irréversible.
          </p>
        ),
      }
    }

    const m = pendingAction.member
    return {
      title: m.has_matricule ? 'Réinitialiser le matricule ?' : 'Générer un matricule ?',
      variant: m.has_matricule ? 'warning' as ConfirmModalVariant : 'info' as ConfirmModalVariant,
      confirmLabel: m.has_matricule ? 'Réinitialiser' : 'Générer',
      children: m.has_matricule ? (
        <p>
          Un nouveau matricule sera généré pour <strong className="text-(--encre)">{m.email}</strong>.
          L&apos;ancien ne fonctionnera plus.
        </p>
      ) : (
        <p>
          Un matricule sera généré pour <strong className="text-(--encre)">{m.email}</strong>.
          Vous devrez le lui communiquer en personne.
        </p>
      ),
    }
  }

  if (loading) return <p className="p-4 text-(--gris-texte)">Chargement...</p>

  const canCreateAdmin = currentRole === 'super_admin'
  const modalProps = getModalProps()

  return (
    <>
      <div className="grid gap-8 md:grid-cols-[350px_1fr]">
        <div>
          <h2 className="text-xl font-bold text-(--encre) mb-4">Ajouter un membre</h2>
          <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="space-y-1.5">
              <label className="font-bold text-(--encre) block">Email</label>
              <input
                type="email" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)} required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-(--encre) block">Rôle</label>
              <select
                value={role} onChange={(e) => setRole(e.target.value as StaffRole)}
                className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none"
              >
                <option value="moderator">Modérateur</option>
                {canCreateAdmin && <option value="admin">Admin</option>}
              </select>
            </div>
            {error && <p className="text-red-600 text-sm font-medium bg-red-50 p-2 rounded-lg">{error}</p>}
            <Button type="submit" disabled={saving} className="w-full mt-2">
              {saving ? 'Création...' : 'Créer le compte'}
            </Button>
          </form>

          {credentials && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-5 space-y-4">
              <p className="text-sm font-bold text-(--encre)">
                {credentials.kind === 'created' ? 'Compte créé' : 'Nouveau matricule'} pour {credentials.email}.
                À communiquer maintenant : ces informations ne seront plus jamais affichées.
              </p>

              {credentials.tempPassword && (
                <div>
                  <p className="text-xs font-bold text-(--gris-texte) uppercase tracking-wider mb-1">Mot de passe temporaire</p>
                  <p className="font-mono text-xl font-bold text-(--encre)">{credentials.tempPassword}</p>
                </div>
              )}

              {credentials.matricule && (
                <div>
                  <p className="text-xs font-bold text-(--gris-texte) uppercase tracking-wider mb-1">Matricule (secret)</p>
                  <p className="font-mono text-xl font-bold text-(--encre)">{credentials.matricule}</p>
                  <p className="text-xs text-(--gris-texte) mt-1">
                    Demandé au modérateur pour confirmer ses changements de statut de commande. Il doit le garder pour lui.
                  </p>
                </div>
              )}

              <button
                onClick={() => setCredentials(null)}
                className="text-sm font-bold text-(--gris-texte) hover:text-(--encre) underline underline-offset-2"
              >
                J&apos;ai noté, fermer
              </button>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-(--encre) mb-4">Équipe ({staffList.length})</h2>
          <div className="space-y-3">
            {staffList.map((s) => (
              <div key={s.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <p className="font-bold text-(--encre) text-lg break-all">{s.email}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <p className="text-sm text-(--gris-texte) font-medium">{ROLE_LABELS[s.role]}</p>
                    {s.role === 'moderator' && (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        s.has_matricule ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {s.has_matricule ? 'Matricule défini' : 'Sans matricule'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.role === 'moderator' && (
                    <button
                      onClick={() => setPendingAction({ type: 'matricule', member: s })}
                      disabled={resettingId === s.id}
                      className="text-sm font-bold text-(--vert-baol-fonce) bg-(--vert-baol)/10 border border-(--vert-baol)/20 rounded-xl px-4 py-2 hover:bg-(--vert-baol)/20 transition-colors disabled:opacity-50"
                    >
                      {resettingId === s.id
                        ? 'Génération...'
                        : s.has_matricule ? 'Réinitialiser le matricule' : 'Générer un matricule'}
                    </button>
                  )}
                  {s.role !== 'super_admin' && s.id !== currentUserId && (s.role !== 'admin' || currentRole === 'super_admin') && (
                    <button
                      onClick={() => setPendingAction({ type: 'remove', member: s })}
                      className="text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2 hover:bg-red-100 transition-colors"
                    >
                      Retirer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de confirmation */}
      {modalProps && (
        <ConfirmModal
          open={!!pendingAction}
          onClose={() => setPendingAction(null)}
          onConfirm={executeConfirmedAction}
          title={modalProps.title}
          variant={modalProps.variant}
          confirmLabel={modalProps.confirmLabel}
          loading={actionLoading}
        >
          {modalProps.children}
        </ConfirmModal>
      )}
    </>
  )
}
