import webpush from 'web-push'

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY
const subject = process.env.VAPID_SUBJECT || 'mailto:ndourmouhammad15@gmail.com'

let isConfigured = false

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    isConfigured = true
  } catch (err) {
    console.error('Erreur configuration VAPID web-push:', err)
  }
}

export { webpush, isConfigured }
