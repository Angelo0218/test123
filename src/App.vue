<script setup>
import { ref } from 'vue'

const subscription = ref(null)
const body = ref('')
const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

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
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    window.alert('瀏覽器不支援')
    return
  }
  if (!publicKey) {
    window.alert('缺少 VAPID 公鑰')
    return
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    let existing = await registration.pushManager.getSubscription()
    if (!existing) {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        window.alert('未允許通知')
        return
      }
      existing = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
    }
    subscription.value = existing
    window.alert('訂閱成功')
  } catch (error) {
    window.alert(`訂閱失敗: ${error?.message || '未知錯誤'}`)
  }
}

const sendTest = async () => {
  if (!subscription.value && 'serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready
    subscription.value = await registration.pushManager.getSubscription()
  }
  if (!subscription.value) {
    window.alert('請先訂閱')
    return
  }
  const payload = {
    title: 'Web Push Demo',
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
