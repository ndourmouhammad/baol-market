import { supabaseAdmin } from './supabaseAdmin'

export async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return null

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  if (user.email !== process.env.ADMIN_EMAIL) return null

  return user
}