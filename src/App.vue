<template>
  <v-app>
    <v-app-bar app color="primary" dark v-if="store.user">
      <v-toolbar-title>Sistema de Tareas</v-toolbar-title>
      <v-spacer></v-spacer>
      <div class="d-flex align-center">
        <v-avatar color="white" size="32" class="mr-2">
          <span class="primary--text">{{ getInitials(store.user.name) }}</span>
        </v-avatar>
        <span class="mr-4">{{ store.user.name }}</span>
        <v-btn text @click="logout">
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

const store = useAppStore()

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
}

const logout = () => {
  store.setUser(null)
  // NO redirigir automáticamente
  // El usuario decidirá a dónde ir
}
</script>