import webpush from 'web-push'

const vapidPublic = process.env.VAPID_PUBLIC_KEY
const vapidPrivate = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:you@example.com'

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!vapidPublic || !vapidPrivate) {
    res.status(500).json({ error: 'Missing VAPID keys in environment variables.' })
    return
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const subscription = body?.subscription
  const payload = body?.payload || { title: 'Web Push Demo', body: 'Hello from Vercel!' }

  if (!subscription) {
    res.status(400).json({ error: 'Missing subscription.' })
    return
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
    res.status(200).json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Send failed' })
  }
}
