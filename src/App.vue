<script setup>
import { computed, onMounted, ref } from 'vue'

const subscription = ref(null)
const title = ref('Web Push Demo')
const body = ref('')

const supported = computed(
  () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
)
const publicKey = computed(() => import.meta.env.VITE_VAPID_PUBLIC_KEY || '')

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
  } catch {
    localStorage.removeItem('web-push-subscription')
    return null
  }
}

const registerServiceWorker = async () => {
  if (!supported.value) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch {
    return null
  }
}

const requestPermission = async () => {
  if (!supported.value) return 'denied'
  return Notification.requestPermission()
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
  if (!publicKey.value) return
  const registration = (await navigator.serviceWorker.ready) || (await registerServiceWorker())
  if (!registration) return
  const existing = await registration.pushManager.getSubscription()
  if (existing) {
    subscription.value = existing
    saveSubscription(existing)
    return
  }
  const permission = await requestPermission()
  if (permission !== 'granted') return
  const newSubscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey.value),
  })
  subscription.value = newSubscription
  saveSubscription(newSubscription)
}

const sendTest = async () => {
  if (!subscription.value) {
    window.alert('請先訂閱')
    return
  }
  const payload = {
    title: title.value || 'Web Push Demo',
    body: body.value || '',
    url: window.location.origin,
  }
  await fetch('/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: subscription.value,
      payload,
    }),
  })
}

onMounted(async () => {
  if (!supported.value) return
  await registerServiceWorker()
  const saved = loadSubscription()
  if (saved) {
    subscription.value = saved
  }
})
</script>

<template>
  <div class="app">
    <div class="controls">
      <input v-model="body" type="text" placeholder="請輸入訊息" />
    </div>
    <div class="buttons">
      <button type="button" @click="subscribe">先點我訂閱</button>
      <button type="button" @click="sendTest">點發送訊息</button>
    </div>
  </div>
</template>
