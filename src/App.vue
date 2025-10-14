<template>
  <v-app>
    <!-- ✅ CORREGIDO: Mostrar header solo si está autenticado -->
    <v-app-bar app color="primary" dark v-if="store.isAuthenticated">
      <v-toolbar-title>Sistema de Tareas</v-toolbar-title>
      <v-spacer></v-spacer>
      <div class="d-flex align-center">
        <v-avatar color="white" size="32" class="mr-2">
          <span class="primary--text">{{ getInitials(store.user.name) }}</span>
        </v-avatar>
        <span class="mr-4">{{ store.user.name }}</span>
        <v-btn text @click="handleLogout">
          <v-icon left>mdi-logout</v-icon>
          Salir
        </v-btn>
      </div>
    </v-app-bar>

    <v-main>
      <router-view></router-view>
    </v-main>
  </v-app>
</template>

<script setup>
import { useAppStore } from './stores/app.js'
import { useRouter } from 'vue-router'

const store = useAppStore()
const router = useRouter()

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
}

// ✅ CORREGIDO: Función de logout mejorada
const handleLogout = async () => {
  console.log('🚪 Ejecutando logout...')
  
  try {
    // Ejecutar logout del store
    store.logout()
    
    // Redirigir a login
    router.push('/login')
    
    console.log('✅ Logout completado correctamente')
  } catch (error) {
    console.error('❌ Error en logout:', error)
    // Forzar redirección incluso si hay error
    router.push('/login')
  }
}
</script>