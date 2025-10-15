import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Vuetify
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/js'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light'
  }
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(vuetify)

// Importar store después de crear pinia
import { useAppStore } from './stores/app.js'
const store = useAppStore()

// ✅ CORREGIDO: Lógica de inicialización mejorada
const initializeApp = async () => {
  console.log('🚀 Inicializando aplicación...')
  
  // Verificar autenticación existente
  const isAuthenticated = store.checkAuth()
  
  console.log('🔐 Estado de autenticación:', isAuthenticated)
  console.log('👤 Usuario actual:', store.user)
  
  if (isAuthenticated) {
    console.log('✅ Usuario autenticado:', store.user.name)
    
    // ✅ CORREGIDO: Redirigir según rol después de montar
    setTimeout(() => {
      const currentPath = window.location.pathname
      if (store.isAdmin) {
        if (!currentPath.includes('/admin')) {
          router.push('/admin')
        }
      } else {
        if (!currentPath.includes('/employee')) {
          router.push('/employee')
        }
      }
    }, 100)
  } else {
    console.log('🔐 No autenticado, mostrando login')
    if (!window.location.pathname.includes('/login')) {
      router.push('/login')
    }
  }
  
  console.log('🎯 Aplicación lista')
}

// ✅ CORREGIDO: Inicializar notificaciones y service worker
import notificationService from './services/notifications.js'

// Inicializar notificaciones
notificationService.init().then(() => {
  console.log('🔔 Servicio de notificaciones inicializado')
})

// ✅ NUEVO: Listener para cambios de conexión de socket
setInterval(() => {
  if (!store.isSocketConnected && store.isAuthenticated) {
    console.log('🔄 Verificando conexión de socket...')
    store.reconnectSocket()
  }
}, 5000) // Verificar cada 5 segundos

// Listener para cambios de visibilidad de la página
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    console.log('📱 App visible, pausar notificaciones')
  } else {
    console.log('📱 App en segundo plano, notificaciones activas')
  }
})

// Manejar errores globales
window.addEventListener('error', (event) => {
  console.error('❌ Error global:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Promise rechazada no manejada:', event.reason)
})

// Inicializar y montar
initializeApp().then(() => {
  app.mount('#app')
})