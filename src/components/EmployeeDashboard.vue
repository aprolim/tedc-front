<template>
  <div v-if="store.user">
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
                @click="logout"
                title="Cambiar usuario"
              >
                <v-icon>mdi-account-switch</v-icon>
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
  
  <!-- Selector de usuarios cuando NO hay usuario -->
  <UserSelector v-else />
</template>

<script setup>
import { useAppStore } from '../stores/app.js'
import TaskList from './TaskList.vue'
import Chat from './Chat.vue'
import UserLocation from './UserLocation.vue'
import UserSelector from './UserSelector.vue'

const store = useAppStore()

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
}

const logout = () => {
  store.setUser(null)
}
</script>