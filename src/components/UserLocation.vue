<template>
  <div>
    <div v-if="!isAdmin" class="text-center">
      <v-btn 
        color="primary" 
        @click="getLocation" 
        :loading="loading"
        class="mb-4"
      >
        Actualizar Mi Ubicación
      </v-btn>
      
      <div v-if="currentLocation">
        <v-chip color="green" class="mb-2">
          <v-icon start>mdi-map-marker</v-icon>
          Ubicación Actualizada
        </v-chip>
        <div>Lat: {{ currentLocation.latitude.toFixed(4) }}</div>
        <div>Lng: {{ currentLocation.longitude.toFixed(4) }}</div>
        <div>Actualizado: {{ formatTime(currentLocation.lastUpdate) }}</div>
      </div>
    </div>

    <div v-else>
      <v-list>
        <v-list-item
          v-for="(location, userId) in store.userLocations"
          :key="userId"
        >
          <template v-slot:prepend>
            <v-icon color="green">mdi-map-marker</v-icon>
          </template>
          
          <v-list-item-title>
            {{ getUserName(userId) }}
          </v-list-item-title>
          <v-list-item-subtitle>
            Lat: {{ location.latitude.toFixed(4) }}, Lng: {{ location.longitude.toFixed(4) }}
          </v-list-item-subtitle>
          <v-list-item-subtitle>
            Última actualización: {{ formatTime(location.lastUpdate) }}
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAppStore } from '../stores/app.js'

const props = defineProps(['isAdmin'])
const store = useAppStore()
const loading = ref(false)
const currentLocation = ref(null)

const employees = ref([])

onMounted(async () => {
  if (props.isAdmin) {
    await loadEmployees()
  }
  
  if (store.socket) {
    store.socket.on('locationUpdate', (data) => {
      store.updateUserLocation(data)
    })
  }
})

const loadEmployees = async () => {
  // En una implementación real, cargaríamos los empleados desde la API
  employees.value = [
    { id: 2, name: 'Juan Pérez' },
    { id: 3, name: 'María García' }
  ]
}

const getLocation = () => {
  loading.value = true
  
  if (!navigator.geolocation) {
    alert('La geolocalización no es soportada por este navegador')
    loading.value = false
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        lastUpdate: new Date()
      }
      
      currentLocation.value = location
      
      if (store.socket) {
        store.socket.emit('userLocation', {
          userId: store.user.id,
          location
        })
      }
      
      loading.value = false
    },
    (error) => {
      alert('Error obteniendo la ubicación: ' + error.message)
      loading.value = false
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  )
}

const getUserName = (userId) => {
  const employee = employees.value.find(emp => emp.id == userId)
  return employee ? employee.name : `Usuario ${userId}`
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('es-ES')
}
</script>