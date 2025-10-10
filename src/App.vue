<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-toolbar-title>Sistema de Tareas</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn v-if="store.user" text @click="logout">
        Cerrar Sesión
      </v-btn>
    </v-app-bar>

    <v-main>
      <router-view></router-view>
    </v-main>
  </v-app>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAppStore } from './stores/app.js'

const store = useAppStore()

onMounted(() => {
  // Simular login - en producción esto vendría de autenticación real
  store.setUser({
    id: 2,
    name: 'Juan Pérez',
    role: 'employee',
    email: 'juan@empresa.com'
  })
})

const logout = () => {
  store.setUser(null)
}
</script>