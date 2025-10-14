<template>
  <div v-if="store.isAuthenticated && store.isAdmin">
    <v-container fluid>
      <v-row>
        <v-col cols="12" md="8">
          <v-card>
            <v-card-title>Gestión de Tareas</v-card-title>
            <v-card-text>
              <TaskList :is-admin="true" />
            </v-card-text>
          </v-card>
        </v-col>
        
        <v-col cols="12" md="4">
          <v-card>
            <v-card-title>Chat con Empleados</v-card-title>
            <v-card-text>
              <Chat :is-admin="true" />
            </v-card-text>
          </v-card>
          
          <v-card class="mt-4">
            <v-card-title>Ubicaciones</v-card-title>
            <v-card-text>
              <UserLocation :is-admin="true" />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
  
  <!-- ✅ CORREGIDO: Redirigir si no está autenticado o no es admin -->
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

// ✅ CORREGIDO: Verificar autenticación y rol
import { onMounted, watch } from 'vue'

onMounted(() => {
  if (!store.isAuthenticated) {
    console.log('🚫 No autenticado, redirigiendo a login')
    router.push('/login')
  } else if (!store.isAdmin) {
    console.log('🚫 No es admin, redirigiendo a employee')
    router.push('/employee')
  }
})

// Watcher para cambios en autenticación
watch(() => store.isAuthenticated, (isAuthenticated) => {
  if (!isAuthenticated) {
    console.log('🔐 Cambio en autenticación, redirigiendo a login')
    router.push('/login')
  }
})

watch(() => store.isAdmin, (isAdmin) => {
  if (!isAdmin && store.isAuthenticated) {
    console.log('👑 Cambio en rol, redirigiendo a employee')
    router.push('/employee')
  }
})
</script>

<style scoped>
.fill-height {
  min-height: 50vh;
}
</style>