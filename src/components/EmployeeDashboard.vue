<template>
  <div v-if="store.isAuthenticated">
    <!-- Dashboard del empleado cuando hay usuario -->
    <v-container fluid>
      <v-row>
        <v-col cols="12" md="8">
          <v-card>
            <v-card-title class="d-flex align-center">
              <v-avatar color="primary" size="40" class="mr-3">
                <span class="text-white">{{ getInitials(store.user.name) }}</span>
              </v-avatar>
              Mis Tareas - {{ store.user.name }}
              <v-spacer></v-spacer>
              <v-btn 
                icon 
                @click="handleLogout"
                title="Cerrar sesión"
              >
                <v-icon>mdi-logout</v-icon>
              </v-btn>
            </v-card-title>
            <v-card-text>
              <TaskList :is-admin="false" />
            </v-card-text>
          </v-card>
        </v-col>
        
        <v-col cols="12" md="4">
          <v-card>
            <v-card-title>Chat con Supervisor</v-card-title>
            <v-card-text>
              <Chat :is-admin="false" />
            </v-card-text>
          </v-card>
          
          <v-card class="mt-4">
            <v-card-title>Mi Ubicación</v-card-title>
            <v-card-text>
              <UserLocation :is-admin="false" />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
  
  <!-- ✅ CORREGIDO: Redirigir a login si no está autenticado -->
  <div v-else class="fill-height d-flex align-center justify-center">
    <v-progress-circular
      indeterminate
      color="primary"
      size="64"
    ></v-progress-circular>
  </div>
</template>

<script setup>
import { useAppStore } from '../stores/app.js'
import { useRouter } from 'vue-router'
import TaskList from './TaskList.vue'
import Chat from './Chat.vue'
import UserLocation from './UserLocation.vue'

const store = useAppStore()
const router = useRouter()

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
}

// ✅ CORREGIDO: Función de logout mejorada
const handleLogout = async () => {
  console.log('🚪 Ejecutando logout desde EmployeeDashboard...')
  
  try {
    store.logout()
    router.push('/login')
  } catch (error) {
    console.error('❌ Error en logout:', error)
    router.push('/login')
  }
}
</script>

<style scoped>
.fill-height {
  min-height: 50vh;
}
</style>