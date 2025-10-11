<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-card width="400" class="pa-6">
      <v-card-title class="text-center">
        <v-icon size="48" color="primary" class="mb-4">mdi-account-multiple</v-icon>
        <div>Selecciona tu usuario</div>
      </v-card-title>
      
      <v-card-text>
        <v-list>
          <v-list-item
            v-for="user in availableUsers"
            :key="user.id"
            @click="selectUser(user)"
            class="mb-3 user-item"
            variant="outlined"
          >
            <template v-slot:prepend>
              <v-avatar color="primary" size="48">
                <span class="text-white">{{ getInitials(user.name) }}</span>
              </v-avatar>
            </template>
            
            <v-list-item-title class="font-weight-medium">
              {{ user.name }}
            </v-list-item-title>
            
            <v-list-item-subtitle>
              {{ user.email }}
            </v-list-item-subtitle>
            
            <template v-slot:append>
              <v-icon color="primary">mdi-chevron-right</v-icon>
            </template>
          </v-list-item>
        </v-list>
        
        <v-alert type="info" variant="tonal" class="mt-4">
          <div class="text-caption">
            Selecciona tu usuario para acceder al sistema de tareas y chat.
          </div>
        </v-alert>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useAppStore } from '../stores/app.js'
import { useRouter } from 'vue-router'

const store = useAppStore()
const router = useRouter()

const availableUsers = ref([
  {
    id: 2,
    name: 'Juan Pérez',
    role: 'employee',
    email: 'juan@empresa.com'
  },
  {
    id: 3,
    name: 'María García',
    role: 'employee', 
    email: 'maria@empresa.com'
  },
  {
    id: 4,
    name: 'Carlos López',
    role: 'employee',
    email: 'carlos@empresa.com'
  }
])

const getInitials = (name) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
}

const selectUser = (user) => {
  console.log('👤 Usuario seleccionado:', user)
  store.setUser(user)
  
  // Ya estamos en /employee, no necesitamos navegar
  // El componente EmployeeDashboard detectará el cambio
}
</script>

<style scoped>
.user-item {
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.user-item:hover {
  background-color: rgba(25, 118, 210, 0.04);
  border-color: #1976d2;
}

.fill-height {
  min-height: 100vh;
}
</style>