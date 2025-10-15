<template>
  <div>
    <div v-if="!isAdmin" class="text-center">
      <v-btn 
        color="primary" 
        @click="getLocation" 
        :loading="loading"
        class="mb-4"
      >
        <v-icon left>mdi-map-marker</v-icon>
        Actualizar Mi Ubicación
      </v-btn>
      
      <div v-if="currentLocation">
        <v-chip color="green" class="mb-2">
          <v-icon start>mdi-check</v-icon>
          Ubicación Actualizada
        </v-chip>
        <div><strong>Lat:</strong> {{ currentLocation.latitude.toFixed(6) }}</div>
        <div><strong>Lng:</strong> {{ currentLocation.longitude.toFixed(6) }}</div>
        <div><strong>Actualizado:</strong> {{ formatTime(currentLocation.lastUpdate) }}</div>
      </div>

      <div v-else-if="!loading" class="text-grey">
        <v-icon>mdi-map-marker-off</v-icon>
        <div>Presiona el botón para actualizar tu ubicación</div>
      </div>
    </div>

    <div v-else>
      <v-card-title class="d-flex align-center">
        <v-icon color="green" class="mr-2">mdi-map-marker</v-icon>
        Ubicaciones del Equipo
        <v-chip color="green" class="ml-2" size="small">
          {{ Object.keys(store.userLocations).length }} en línea
        </v-chip>
      </v-card-title>
      
      <v-list>
        <v-list-item
          v-for="(location, userId) in store.userLocations"
          :key="userId"
          class="mb-2"
        >
          <template v-slot:prepend>
            <v-avatar color="primary" size="40" class="mr-3">
              <span class="text-white">{{ getInitials(getUserName(userId)) }}</span>
            </v-avatar>
          </template>
          
          <v-list-item-title class="font-weight-medium">
            {{ getUserName(userId) }}
          </v-list-item-title>
          
          <v-list-item-subtitle>
            <div><strong>Coordenadas:</strong> {{ location.latitude.toFixed(6) }}, {{ location.longitude.toFixed(6) }}</div>
            <div><strong>Última actualización:</strong> {{ formatTime(location.lastUpdate) }}</div>
          </v-list-item-subtitle>

          <template v-slot:append>
            <v-chip :color="store.isUserOnline(userId) ? 'green' : 'red'" size="small">
              {{ store.isUserOnline(userId) ? 'En línea' : 'Desconectado' }}
            </v-chip>
          </template>
        </v-list-item>

        <v-list-item v-if="Object.keys(store.userLocations).length === 0">
          <v-list-item-title class="text-center text-grey">
            <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-map-marker-off</v-icon>
            <div>No hay ubicaciones disponibles</div>
          </v-list-item-title>
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
  console.log('📍 UserLocation montado')
  
  if (props.isAdmin) {
    await loadEmployees()
  }
  
  // ✅ CORREGIDO: Configurar listener de ubicaciones
  if (store.socket) {
    store.socket.on('locationUpdate', (data) => {
      console.log('📍 Ubicación actualizada recibida:', data)
      store.updateUserLocation(data)
    })
  }
})

const loadEmployees = async () => {
  try {
    // En una implementación real, cargaríamos desde API
    employees.value = [
      { id: 2, name: 'Juan Pérez' },
      { id: 3, name: 'María García' },
      { id: 4, name: 'Carlos López' }
    ]
    console.log('✅ Empleados cargados para ubicaciones')
  } catch (error) {
    console.error('❌ Error cargando empleados:', error)
  }
}

const getLocation = () => {
  loading.value = true
  currentLocation.value = null
  
  if (!navigator.geolocation) {
    alert('La geolocalización no es soportada por este navegador')
    loading.value = false
    return
  }

  console.log('📍 Solicitando ubicación...')

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        lastUpdate: new Date()
      }
      
      currentLocation.value = location
      console.log('📍 Ubicación obtenida:', location)
      
      // ✅ CORREGIDO: Usar la nueva función sendUserLocation
      store.sendUserLocation(location)
      
      loading.value = false
    },
    (error) => {
      console.error('❌ Error obteniendo ubicación:', error)
      let errorMessage = 'Error obteniendo la ubicación: '
      
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMessage += 'Permiso denegado por el usuario'
          break
        case error.POSITION_UNAVAILABLE:
          errorMessage += 'La información de ubicación no está disponible'
          break
        case error.TIMEOUT:
          errorMessage += 'Tiempo de espera agotado'
          break
        default:
          errorMessage += error.message
      }
      
      alert(errorMessage)
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
  if (userId == 1) return 'Administrador'
  const employee = employees.value.find(emp => emp.id == userId)
  return employee ? employee.name : `Usuario ${userId}`
}

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
</script>

<style scoped>
.text-center {
  padding: 16px;
}
</style>