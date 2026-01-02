<script setup>
import { computed, onMounted, ref } from 'vue'

const logs = ref([])
const subscription = ref(null)
const permission = ref(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
const registrationReady = ref(false)

const supported = computed(
  () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
)
const publicKey = computed(() => import.meta.env.VITE_VAPID_PUBLIC_KEY || '')
const subscriptionJson = computed(() =>
  subscription.value ? JSON.stringify(subscription.value, null, 2) : ''
)

const log = (message) => {
  const time = new Date().toLocaleTimeString()
  logs.value.unshift(`[${time}] ${message}`)
}

const saveSubscription = (value) => {
  if (!value) {
    localStorage.removeItem('web-push-subscription')
    return
  }
  localStorage.setItem('web-push-subscription', JSON.stringify(value))
}

const loadSubscription = () => {
  const saved = localStorage.getItem('web-push-subscription')
  if (!saved) return null
  try {
    return JSON.parse(saved)
  } catch (error) {
    log('Saved subscription is invalid, clearing it.')
    localStorage.removeItem('web-push-subscription')
    return null
  }
}

const registerServiceWorker = async () => {
  if (!supported.value) return null
  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    registrationReady.value = true
    return registration
  } catch (error) {
    log(`Service worker register failed: ${error.message}`)
    return null
  }
}

const requestPermission = async () => {
  if (!supported.value) {
    log('This browser does not support Web Push.')
    return
  }
  const result = await Notification.requestPermission()
  permission.value = result
  log(`Notification permission: ${result}`)
}

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }
  return outputArray
}

const subscribe = async () => {
  if (!supported.value) return
  if (!publicKey.value) {
    log('Missing VITE_VAPID_PUBLIC_KEY. Add it to .env and Vercel env vars.')
    return
  }
  const registration = (await navigator.serviceWorker.ready) || (await registerServiceWorker())
  if (!registration) {
    log('No service worker registration.')
    return
  }
  const existing = await registration.pushManager.getSubscription()
  if (existing) {
    subscription.value = existing
    saveSubscription(existing)
    log('Already subscribed.')
    return
  }
  if (permission.value !== 'granted') {
    await requestPermission()
    if (permission.value !== 'granted') {
      log('Permission not granted.')
      return
    }
  }
  const newSubscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey.value),
  })
  subscription.value = newSubscription
  saveSubscription(newSubscription)
  log('Subscribed to push.')
}

const unsubscribe = async () => {
  const registration = await navigator.serviceWorker.ready
  const current = await registration.pushManager.getSubscription()
  if (current) {
    await current.unsubscribe()
    log('Unsubscribed.')
  }
  subscription.value = null
  saveSubscription(null)
}

const sendTest = async () => {
  if (!subscription.value) {
    log('No subscription yet.')
    return
  }
  try {
    const payload = {
      title: 'Web Push Demo',
      body: 'This push came from your Vercel API.',
      url: window.location.origin,
    }
    const response = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.value,
        payload,
      }),
    })
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      throw new Error(errorBody?.error || 'Push send failed')
    }
    log('Push sent.')
  } catch (error) {
    log(`Send failed: ${error.message}`)
  }
}

onMounted(async () => {
  if (!supported.value) {
    log('Web Push is not supported in this browser.')
    return
  }
  await registerServiceWorker()
  const saved = loadSubscription()
  if (saved) {
    subscription.value = saved
    log('Loaded saved subscription.')
  }
})
</script>

<template>
  <div class="app">
    <header class="hero">
      <div>
        <p class="eyebrow">Vite + Vue</p>
        <h1>Web Push Demo</h1>
        <p class="lead">
          Quick client + Vercel API demo. Subscribe, then send a push from the serverless
          endpoint.
        </p>
      </div>
      <div class="hero-card">
        <div class="stat">
          <span>Support</span>
          <strong>{{ supported ? 'Yes' : 'No' }}</strong>
        </div>
        <div class="stat">
          <span>Permission</span>
          <strong>{{ permission }}</strong>
        </div>
        <div class="stat">
          <span>SW Ready</span>
          <strong>{{ registrationReady ? 'Yes' : 'No' }}</strong>
        </div>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <h2>Subscription</h2>
        <p>VAPID public key: <code>{{ publicKey ? publicKey.slice(0, 24) + '...' : 'Missing' }}</code></p>
      </div>
      <div class="actions">
        <button class="primary" type="button" @click="subscribe">Subscribe</button>
        <button type="button" @click="requestPermission">Request Permission</button>
        <button type="button" @click="unsubscribe">Unsubscribe</button>
      </div>
      <textarea class="code" readonly :value="subscriptionJson" placeholder="Subscription JSON will appear here." />
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2>Send Push</h2>
        <p>Uses `/api/send` on Vercel to trigger a push.</p>
      </div>
      <div class="actions">
        <button class="primary" type="button" @click="sendTest">Send Test Push</button>
      </div>
      <div class="log">
        <div v-if="logs.length === 0" class="log-empty">No activity yet.</div>
        <div v-for="item in logs" :key="item" class="log-line">{{ item }}</div>
      </div>
    </section>
  </div>
</template>
