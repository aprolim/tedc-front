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

// ✅ LÓGICA CORREGIDA: Establecer usuario según la ruta
const initializeUser = () => {
  const path = window.location.pathname
  
  console.log('📍 Ruta detectada:', path)
  
  if (path.includes('/admin')) {
    // Usuario ADMIN
    const adminUser = {
      id: 1,
      name: 'Administrador',
      role: 'admin',
      email: 'admin@empresa.com'
    }
    store.setUser(adminUser)
    console.log('👑 Usuario ADMIN establecido')
    return adminUser
  } else {
    // Para empleados, NO establecer usuario por defecto
    // Se mostrará el selector de usuarios
    console.log('👤 Modo EMPLEADO - Mostrar selector')
    return null
  }
}

// Inicializar usuario según la ruta
const user = initializeUser()

console.log('🚀 Aplicación montada')
console.log('📊 Usuario actual:', user)

app.mount('#app')