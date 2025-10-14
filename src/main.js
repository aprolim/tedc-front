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

// ✅ MODIFICADO: Lógica de inicialización con autenticación
const initializeApp = async () => {
  console.log('🚀 Inicializando aplicación...')
  
  // Verificar autenticación existente
  const isAuthenticated = store.checkAuth()
  
  console.log('🔐 Estado de autenticación:', isAuthenticated)
  console.log('👤 Usuario actual:', store.user)
  
  if (isAuthenticated) {
    console.log('✅ Usuario autenticado:', store.user.name)
    
    // Redirigir según rol después de montar
    setTimeout(() => {
      if (store.isAdmin) {
        if (!window.location.pathname.includes('/admin')) {
          router.push('/admin')
        }
      } else {
        if (!window.location.pathname.includes('/employee')) {
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

// Inicializar y montar
initializeApp().then(() => {
  app.mount('#app')
})