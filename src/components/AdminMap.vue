<template>
  <div v-if="store.isAuthenticated && store.isAdmin" class="admin-map-container">
    <v-container fluid>
      <!-- Header -->
      <v-card class="mb-4">
        <v-card-title class="d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-map-marker</v-icon>
          Mapa de Ubicaciones del Equipo
          <v-spacer></v-spacer>
          <v-btn @click="refreshLocations" color="primary" class="mr-2">
            <v-icon left>mdi-refresh</v-icon>
            Actualizar
          </v-btn>
          <v-btn @click="centerMapOnAllUsers" color="green" class="mr-2" :disabled="!mapReady || employeesWithLocations.length === 0">
            <v-icon left>mdi-target</v-icon>
            Centrar Mapa
          </v-btn>
          <v-btn @click="$router.push('/admin')" variant="text">
            <v-icon left>mdi-arrow-left</v-icon>
            Volver al Dashboard
          </v-btn>
        </v-card-title>
        <v-card-text>
          <div class="d-flex align-center flex-wrap">
            <v-chip color="green" class="mr-2 mb-2">
              <v-icon start>mdi-account-multiple</v-icon>
              {{ employeesWithLocations.length }} empleados con ubicación
            </v-chip>
            <v-chip :color="mapReady ? 'blue' : 'orange'" class="mr-2 mb-2">
              <v-icon start>mdi-map</v-icon>
              {{ mapReady ? 'Mapa listo' : 'Cargando mapa...' }}
            </v-chip>
            <v-chip v-if="mapError" color="red" class="mr-2 mb-2">
              <v-icon start>mdi-alert</v-icon>
              Modo estático
            </v-chip>
          </div>
        </v-card-text>
      </v-card>

      <!-- Mapa y controles -->
      <v-row>
        <!-- Mapa -->
        <v-col cols="12" md="9">
          <v-card>
            <v-card-title>
              <v-icon left>mdi-map</v-icon>
              Mapa de Ubicaciones
              <v-spacer></v-spacer>
              <span class="text-caption text-grey">
                Zoom: {{ mapZoom }}x
              </span>
            </v-card-title>
            <v-card-text class="pa-0">
              <div 
                ref="mapContainer" 
                class="map-container"
                :style="{ height: mapHeight + 'px' }"
              >
                <div v-if="!mapReady" class="map-loading">
                  <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
                  <div class="mt-4">Cargando mapa...</div>
                </div>
                
                <!-- Mapa estático como fallback -->
                <div v-if="mapError && mapReady" class="static-map-fallback">
                  <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-map</v-icon>
                  <div class="text-h6 mb-2">Mapa en Modo Estático</div>
                  <div class="text-body-1 text-grey mb-4">
                    Mostrando ubicaciones en lista debido a problemas de carga
                  </div>
                  
                  <!-- Lista de ubicaciones en modo estático -->
                  <v-card variant="outlined" class="mx-auto" max-width="600">
                    <v-card-title>
                      <v-icon color="primary" class="mr-2">mdi-map-marker</v-icon>
                      Ubicaciones de Empleados
                    </v-card-title>
                    <v-card-text>
                      <v-list>
                        <v-list-item
                          v-for="employee in employeesWithLocations"
                          :key="employee.id"
                          class="mb-3"
                        >
                          <template v-slot:prepend>
                            <v-avatar :color="getEmployeeColor(employee.id)" size="48">
                              <span class="text-white">{{ getInitials(employee.name) }}</span>
                            </v-avatar>
                          </template>
                          
                          <v-list-item-title class="font-weight-medium">
                            {{ employee.name }}
                            <v-chip size="small" :color="store.isUserOnline(employee.id) ? 'green' : 'red'" class="ml-2">
                              {{ store.isUserOnline(employee.id) ? 'En línea' : 'Desconectado' }}
                            </v-chip>
                          </v-list-item-title>
                          
                          <v-list-item-subtitle>
                            <div class="d-flex align-center mt-1">
                              <v-icon color="primary" size="small" class="mr-1">mdi-map-marker</v-icon>
                              <span>Lat: {{ employee.location.latitude.toFixed(6) }}</span>
                              <span class="mx-2">•</span>
                              <span>Lng: {{ employee.location.longitude.toFixed(6) }}</span>
                            </div>
                            <div class="text-caption text-grey mt-1">
                              <v-icon size="small" class="mr-1">mdi-clock</v-icon>
                              Actualizado: {{ formatTime(employee.location.lastUpdate) }}
                            </div>
                          </v-list-item-subtitle>
                        </v-list-item>

                        <v-list-item v-if="employeesWithLocations.length === 0">
                          <v-list-item-title class="text-center text-grey">
                            No hay ubicaciones disponibles
                          </v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-card-text>
                  </v-card>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Controles y lista -->
        <v-col cols="12" md="3">
          <!-- Controles del mapa -->
          <v-card class="mb-4">
            <v-card-title>
              <v-icon left>mdi-cog</v-icon>
              Controles
            </v-card-title>
            <v-card-text>
              <v-btn 
                @click="centerMapOnAllUsers" 
                color="primary" 
                block 
                class="mb-3"
                :disabled="!mapReady || employeesWithLocations.length === 0 || mapError"
              >
                <v-icon left>mdi-target</v-icon>
                Centrar en Todos
              </v-btn>

              <v-slider
                v-model="mapZoom"
                label="Zoom del Mapa"
                min="10"
                max="18"
                step="1"
                thumb-label
                @update:model-value="updateMapZoom"
                :disabled="mapError"
                class="mb-4"
              ></v-slider>

              <v-switch
                v-model="showUserNames"
                label="Mostrar nombres"
                color="primary"
                class="mb-2"
                :disabled="mapError"
              ></v-switch>

              <div v-if="mapError" class="error-warning">
                <v-alert type="warning" variant="tonal" density="compact" class="mt-2">
                  <div class="text-caption">
                    El mapa interactivo no está disponible. Usando modo estático.
                  </div>
                </v-alert>
              </div>

              <div class="text-caption text-grey mt-3">
                {{ mapError ? 'Ubicaciones mostradas en lista' : 'Haz clic en los marcadores para ver detalles' }}
              </div>
            </v-card-text>
          </v-card>

          <!-- Lista de empleados -->
          <v-card>
            <v-card-title>
              <v-icon left>mdi-account-group</v-icon>
              Empleados ({{ employeesWithLocations.length }})
            </v-card-title>
            <v-card-text class="pa-0" style="max-height: 400px; overflow-y: auto;">
              <v-list density="compact">
                <v-list-item
                  v-for="employee in employeesWithLocations"
                  :key="employee.id"
                  @click="focusOnEmployee(employee)"
                  :class="{ 'selected-employee': selectedEmployee?.id === employee.id }"
                  class="employee-map-item"
                >
                  <template v-slot:prepend>
                    <v-avatar :color="getEmployeeColor(employee.id)" size="36">
                      <span class="text-white">{{ getInitials(employee.name) }}</span>
                    </v-avatar>
                  </template>

                  <v-list-item-title class="font-weight-medium text-body-2">
                    {{ employee.name }}
                  </v-list-item-title>

                  <v-list-item-subtitle class="text-caption">
                    <v-icon 
                      :color="store.isUserOnline(employee.id) ? 'green' : 'red'" 
                      size="12"
                      class="mr-1"
                    >
                      mdi-circle
                    </v-icon>
                    {{ store.isUserOnline(employee.id) ? 'En línea' : 'Desconectado' }}
                  </v-list-item-subtitle>

                  <template v-slot:append>
                    <v-icon color="primary" size="small">mdi-chevron-right</v-icon>
                  </template>
                </v-list-item>

                <v-list-item v-if="employeesWithLocations.length === 0">
                  <v-list-item-title class="text-center text-grey text-caption">
                    <v-icon size="32" color="grey-lighten-1" class="mb-2">mdi-map-marker-off</v-icon>
                    <div>No hay ubicaciones disponibles</div>
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Dialog de información del empleado -->
    <v-dialog v-model="showEmployeeDialog" max-width="400">
      <v-card v-if="selectedEmployee">
        <v-card-title class="d-flex align-center">
          <v-avatar :color="getEmployeeColor(selectedEmployee.id)" size="40" class="mr-3">
            <span class="text-white">{{ getInitials(selectedEmployee.name) }}</span>
          </v-avatar>
          {{ selectedEmployee.name }}
        </v-card-title>
        
        <v-card-text>
          <v-list density="compact">
            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="grey">mdi-map-marker</v-icon>
              </template>
              <v-list-item-title>Coordenadas</v-list-item-title>
              <v-list-item-subtitle>
                {{ selectedEmployee.location.latitude.toFixed(6) }}, 
                {{ selectedEmployee.location.longitude.toFixed(6) }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="grey">mdi-clock</v-icon>
              </template>
              <v-list-item-title>Última actualización</v-list-item-title>
              <v-list-item-subtitle>
                {{ formatTime(selectedEmployee.location.lastUpdate) }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon :color="store.isUserOnline(selectedEmployee.id) ? 'green' : 'red'">mdi-circle</v-icon>
              </template>
              <v-list-item-title>Estado</v-list-item-title>
              <v-list-item-subtitle>
                {{ store.isUserOnline(selectedEmployee.id) ? 'En línea' : 'Desconectado' }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="grey">mdi-office-building</v-icon>
              </template>
              <v-list-item-title>Departamento</v-list-item-title>
              <v-list-item-subtitle>
                {{ selectedEmployee.department }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showEmployeeDialog = false" variant="text">Cerrar</v-btn>
          <v-btn 
            @click="centerMapOnEmployee(selectedEmployee)" 
            color="primary"
            :disabled="mapError"
          >
            <v-icon left>mdi-target</v-icon>
            {{ mapError ? 'Mapa no disponible' : 'Centrar en Mapa' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useAppStore } from '../stores/app.js'
import { useRouter } from 'vue-router'

// ✅ DECLARAR STORE Y ROUTER PRIMERO
const store = useAppStore()
const router = useRouter()

// Estados reactivos
const mapContainer = ref(null)
const map = ref(null)
const mapReady = ref(false)
const mapError = ref(false)
const selectedEmployee = ref(null)
const showEmployeeDialog = ref(false)
const mapZoom = ref(13)
const showUserNames = ref(true)

// Variables para Leaflet (si está disponible)
let L = null
let markers = []
let markerLayer = null

// Computed - ✅ MOVER DESPUÉS DE DECLARAR STORE
const employeesWithLocations = computed(() => {
  const employees = []
  
  for (const [userId, location] of Object.entries(store.userLocations)) {
    const user = getEmployeeById(parseInt(userId))
    if (user) {
      employees.push({
        ...user,
        location
      })
    }
  }
  
  return employees.sort((a, b) => a.name.localeCompare(b.name))
})

const mapHeight = computed(() => {
  return Math.max(500, window.innerHeight - 200)
})

// Métodos
const getEmployeeById = (id) => {
  const employees = {
    1: { id: 1, name: 'Administrador', department: 'Administración' },
    2: { id: 2, name: 'Juan Pérez', department: 'Ventas' },
    3: { id: 3, name: 'María García', department: 'Marketing' },
    4: { id: 4, name: 'Carlos López', department: 'IT' }
  }
  return employees[id]
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

const getEmployeeColor = (userId) => {
  const colors = ['primary', 'green', 'orange', 'red', 'purple', 'teal', 'pink', 'blue']
  return colors[userId % colors.length]
}

const focusOnEmployee = (employee) => {
  selectedEmployee.value = employee
  showEmployeeDialog.value = true
  console.log('👤 Empleado seleccionado:', employee.name)
}

// Funciones del mapa
const initMap = async () => {
  if (!mapContainer.value) return

  console.log('🗺️ Intentando inicializar mapa interactivo...')

  try {
    // Intentar cargar Leaflet dinámicamente
    const leafletModule = await import('leaflet')
    L = leafletModule.default
    
    // Configurar iconos de Leaflet
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    })

    // Crear mapa
    map.value = L.map(mapContainer.value).setView([19.4326, -99.1332], mapZoom.value)

    // Agregar capa de tiles con manejo de errores
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map.value)

    // Manejar errores de tiles
    tileLayer.on('tileerror', (error) => {
      console.log('⚠️ Error cargando tile del mapa:', error)
    })

    // Configurar eventos
    map.value.on('zoomend', () => {
      if (map.value) {
        mapZoom.value = map.value.getZoom()
      }
    })

    mapReady.value = true
    console.log('✅ Mapa interactivo inicializado correctamente')

    // Agregar marcadores
    nextTick(() => {
      updateMarkers()
    })

  } catch (error) {
    console.error('❌ Error cargando mapa interactivo:', error)
    initStaticMap()
  }
}

const initStaticMap = () => {
  console.log('🗺️ Inicializando mapa estático como fallback')
  mapReady.value = true
  mapError.value = true
}

const updateMarkers = () => {
  if (!map.value || !L || mapError.value) return

  try {
    // Limpiar marcadores anteriores
    if (markerLayer) {
      map.value.removeLayer(markerLayer)
    }

    markerLayer = L.layerGroup().addTo(map.value)
    markers = []

    employeesWithLocations.value.forEach(employee => {
      const { latitude, longitude } = employee.location
      
      const marker = L.marker([latitude, longitude])
        .addTo(markerLayer)
        .bindPopup(`
          <div style="min-width: 200px;">
            <strong>${employee.name}</strong><br/>
            <small>${employee.department}</small><br/>
            <hr style="margin: 8px 0;">
            📍 ${latitude.toFixed(6)}, ${longitude.toFixed(6)}<br/>
            ⏰ ${formatTime(employee.location.lastUpdate)}<br/>
            ${store.isUserOnline(employee.id) ? '🟢 En línea' : '🔴 Desconectado'}
          </div>
        `)
      
      marker.on('click', () => {
        selectedEmployee.value = employee
        showEmployeeDialog.value = true
      })

      markers.push(marker)
    })

    console.log(`📍 ${employeesWithLocations.value.length} marcadores agregados al mapa`)
    
    // Centrar el mapa si hay marcadores
    if (markers.length > 0) {
      centerMapOnAllUsers()
    }

  } catch (error) {
    console.error('❌ Error actualizando marcadores:', error)
  }
}

const centerMapOnAllUsers = () => {
  if (!map.value || markers.length === 0 || mapError.value) return

  try {
    const group = L.featureGroup(markers)
    map.value.fitBounds(group.getBounds().pad(0.1), { 
      maxZoom: 15,
      animate: true
    })
    console.log('🎯 Mapa centrado en todos los usuarios')
  } catch (error) {
    console.error('❌ Error centrando mapa:', error)
  }
}

const centerMapOnEmployee = (employee) => {
  if (!map.value || mapError.value) return

  try {
    const { latitude, longitude } = employee.location
    map.value.setView([latitude, longitude], 16, { animate: true })
    console.log(`🎯 Mapa centrado en: ${employee.name}`)
  } catch (error) {
    console.error('❌ Error centrando en empleado:', error)
  }
}

const updateMapZoom = (zoom) => {
  if (map.value && !mapError.value) {
    map.value.setZoom(zoom)
  }
}

const refreshLocations = () => {
  console.log('🔄 Actualizando ubicaciones...')
  if (!mapError.value) {
    updateMarkers()
  }
}

// Lifecycle
onMounted(() => {
  console.log('🗺️ Componente AdminMap montado')
  
  // Inicializar mapa después de un pequeño delay
  setTimeout(() => {
    initMap()
  }, 100)
})

onUnmounted(() => {
  if (map.value && !mapError.value) {
    map.value.remove()
  }
})

// Watchers
watch(employeesWithLocations, () => {
  if (mapReady.value && !mapError.value) {
    updateMarkers()
  }
})
</script>

<style scoped>
.admin-map-container {
  min-height: 100vh;
}

.map-container {
  position: relative;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
}

.map-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
  background: #fafafa;
}

.static-map-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
  background: #fafafa;
}

.employee-map-item {
  border-left: 4px solid transparent;
  transition: all 0.3s ease;
  cursor: pointer;
  padding: 8px 16px;
}

.employee-map-item:hover {
  background-color: rgba(25, 118, 210, 0.04);
  border-left-color: #1976d2;
}

.employee-map-item.selected-employee {
  background-color: rgba(25, 118, 210, 0.08);
  border-left-color: #1976d2;
}

.error-warning {
  margin-top: 8px;
}

/* Estilos para Leaflet cuando está disponible */
:deep(.leaflet-popup-content) {
  margin: 8px 12px;
  font-family: 'Roboto', sans-serif;
}

:deep(.leaflet-popup-content-wrapper) {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>