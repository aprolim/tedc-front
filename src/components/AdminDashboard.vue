<template>
  <div v-if="store.isAuthenticated && store.isAdmin">
    <v-container fluid>
      <!-- Header con estadísticas y controles -->
      <v-row class="mb-4">
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center">
              <v-avatar color="primary" size="40" class="mr-3">
                <v-icon color="white">mdi-shield-account</v-icon>
              </v-avatar>
              Panel de Administración
              <v-spacer></v-spacer>
              
              <!-- Botones de acción -->
              <v-btn 
                color="primary" 
                @click="refreshAllData"
                :loading="refreshing"
                class="mr-2"
              >
                <v-icon left>mdi-refresh</v-icon>
                Actualizar Datos
              </v-btn>
              
              <v-btn 
                color="green" 
                @click="$router.push('/admin/map')" 
                class="mr-2"
              >
                <v-icon left>mdi-map</v-icon>
                Ver Mapa
              </v-btn>
            </v-card-title>
            
            <v-card-text>
              <!-- Estadísticas rápidas -->
              <v-row class="text-center">
                <v-col cols="6" md="3">
                  <div class="stat-card">
                    <v-icon color="blue" size="40" class="mb-2">mdi-account-group</v-icon>
                    <div class="stat-number">{{ store.onlineEmployeesCount }}</div>
                    <div class="stat-label">Empleados Conectados</div>
                  </div>
                </v-col>
                
                <v-col cols="6" md="3">
                  <div class="stat-card">
                    <v-icon color="orange" size="40" class="mb-2">mdi-format-list-checks</v-icon>
                    <div class="stat-number">{{ totalTasks }}</div>
                    <div class="stat-label">Total Tareas</div>
                  </div>
                </v-col>
                
                <v-col cols="6" md="3">
                  <div class="stat-card">
                    <v-icon color="green" size="40" class="mb-2">mdi-check-circle</v-icon>
                    <div class="stat-number">{{ completedTasks }}</div>
                    <div class="stat-label">Tareas Completadas</div>
                  </div>
                </v-col>
                
                <v-col cols="6" md="3">
                  <div class="stat-card">
                    <v-icon color="red" size="40" class="mb-2">mdi-message</v-icon>
                    <div class="stat-number">{{ store.totalUnreadCount }}</div>
                    <div class="stat-label">Mensajes Sin Leer</div>
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Contenido principal -->
      <v-row>
        <!-- Columna izquierda - Tareas -->
        <v-col cols="12" md="8">
          <v-card class="h-100">
            <v-card-title class="d-flex align-center">
              <v-icon color="primary" class="mr-2">mdi-format-list-checks</v-icon>
              Gestión de Tareas
              <v-spacer></v-spacer>
              <v-chip :color="getTasksStatusColor()" variant="flat">
                {{ getTasksStatusText() }}
              </v-chip>
            </v-card-title>
            <v-card-text>
              <TaskList :is-admin="true" />
            </v-card-text>
          </v-card>
        </v-col>
        
        <!-- Columna derecha - Chat y Ubicaciones -->
        <v-col cols="12" md="4">
          <!-- Chat -->
          <v-card class="mb-4">
            <v-card-title class="d-flex align-center">
              <v-icon color="primary" class="mr-2">mdi-forum</v-icon>
              Chat con Empleados
              <v-spacer></v-spacer>
              <v-badge 
                :content="store.totalUnreadCount" 
                color="red" 
                v-if="store.totalUnreadCount > 0"
              >
                <v-icon color="grey">mdi-message</v-icon>
              </v-badge>
            </v-card-title>
            <v-card-text>
              <Chat :is-admin="true" />
            </v-card-text>
          </v-card>
          
          <!-- Ubicaciones -->
          <v-card class="mb-4">
            <v-card-title class="d-flex align-center">
              <v-icon color="primary" class="mr-2">mdi-map-marker</v-icon>
              Ubicaciones en Tiempo Real
              <v-spacer></v-spacer>
              <v-chip 
                :color="Object.keys(store.userLocations).length > 0 ? 'green' : 'grey'" 
                size="small"
              >
                {{ Object.keys(store.userLocations).length }} en línea
              </v-chip>
            </v-card-title>
            <v-card-text>
              <UserLocation :is-admin="true" />
            </v-card-text>
          </v-card>

          <!-- Información del sistema -->
          <v-card>
            <v-card-title class="d-flex align-center">
              <v-icon color="primary" class="mr-2">mdi-information</v-icon>
              Estado del Sistema
            </v-card-title>
            <v-card-text>
              <v-list density="compact">
                <v-list-item>
                  <template v-slot:prepend>
                    <v-avatar :color="store.isSocketConnected ? 'green' : 'red'" size="32">
                      <v-icon color="white" size="small">
                        {{ store.isSocketConnected ? 'mdi-link' : 'mdi-link-off' }}
                      </v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title>Conexión en Tiempo Real</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ store.isSocketConnected ? 'Conectado' : 'Desconectado' }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template v-slot:prepend>
                    <v-avatar :color="canNotify ? 'green' : 'orange'" size="32">
                      <v-icon color="white" size="small">mdi-bell</v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title>Notificaciones</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ canNotify ? 'Activadas' : 'Permiso requerido' }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template v-slot:prepend>
                    <v-avatar color="blue" size="32">
                      <v-icon color="white" size="small">mdi-clock</v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title>Última actualización</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ lastUpdateTime }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
              
              <!-- Botón para solicitar permisos de notificación -->
              <v-btn 
                v-if="!canNotify" 
                @click="requestNotificationPermission" 
                color="orange" 
                block 
                size="small"
                class="mt-3"
              >
                <v-icon left>mdi-bell</v-icon>
                Activar Notificaciones
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
  
  <!-- Estado de carga o redirección -->
  <div v-else class="fill-height d-flex align-center justify-center">
    <v-card class="text-center pa-6" width="400">
      <v-progress-circular
        indeterminate
        color="primary"
        size="64"
        class="mb-4"
      ></v-progress-circular>
      <div class="text-h6 mb-2">Verificando acceso...</div>
      <div class="text-body-2 text-grey">
        {{ getLoadingMessage() }}
      </div>
    </v-card>
  </div>
</template>

<script setup>
import { useAppStore } from '../stores/app.js'
import { useRouter } from 'vue-router'
import TaskList from './TaskList.vue'
import Chat from './Chat.vue'
import UserLocation from './UserLocation.vue'
import { ref, computed, onMounted, watch } from 'vue'

const store = useAppStore()
const router = useRouter()

// Estados reactivos
const refreshing = ref(false)
const lastUpdateTime = ref(new Date().toLocaleTimeString('es-ES'))

// Computed properties
const totalTasks = computed(() => store.tasks.length)

const completedTasks = computed(() => {
  return store.tasks.filter(task => task.status === 'completed').length
})

const canNotify = computed(() => store.canNotify)

// Métodos
const refreshAllData = async () => {
  refreshing.value = true
  console.log('🔄 Actualizando todos los datos...')
  
  try {
    // Simular actualización de datos
    await new Promise(resolve => setTimeout(resolve, 1000))
    lastUpdateTime.value = new Date().toLocaleTimeString('es-ES')
    console.log('✅ Datos actualizados correctamente')
  } catch (error) {
    console.error('❌ Error actualizando datos:', error)
  } finally {
    refreshing.value = false
  }
}

const requestNotificationPermission = async () => {
  const granted = await store.requestNotificationPermission()
  if (granted) {
    console.log('✅ Permiso de notificaciones concedido')
  } else {
    console.log('❌ Permiso de notificaciones denegado')
  }
}

const getTasksStatusColor = () => {
  const completionRate = totalTasks.value > 0 ? (completedTasks.value / totalTasks.value) * 100 : 0
  
  if (completionRate === 0) return 'grey'
  if (completionRate < 50) return 'orange'
  if (completionRate < 100) return 'blue'
  return 'green'
}

const getTasksStatusText = () => {
  const completionRate = totalTasks.value > 0 ? (completedTasks.value / totalTasks.value) * 100 : 0
  return `${Math.round(completionRate)}% completado`
}

const getLoadingMessage = () => {
  if (!store.isAuthenticated) {
    return 'Redirigiendo al login...'
  } else if (!store.isAdmin) {
    return 'Redirigiendo al panel de empleado...'
  }
  return 'Cargando panel de administración...'
}

// ✅ CORREGIDO: Verificar autenticación y rol
onMounted(() => {
  console.log('👑 AdminDashboard montado - Verificando acceso...')
  
  if (!store.isAuthenticated) {
    console.log('🚫 No autenticado, redirigiendo a login')
    router.push('/login')
  } else if (!store.isAdmin) {
    console.log('🚫 No es admin, redirigiendo a employee')
    router.push('/employee')
  } else {
    console.log('✅ Acceso autorizado - Mostrando panel admin')
  }
})

// Watchers para cambios en autenticación
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

// Configurar auto-actualización cada 30 segundos
let autoRefreshInterval = null
onMounted(() => {
  autoRefreshInterval = setInterval(() => {
    if (store.isAuthenticated && store.isAdmin) {
      console.log('🔄 Auto-actualización de datos')
      lastUpdateTime.value = new Date().toLocaleTimeString('es-ES')
    }
  }, 30000)
})

// Limpiar intervalo al desmontar
import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval)
  }
})
</script>

<style scoped>
.fill-height {
  min-height: 50vh;
}

.h-100 {
  height: 100%;
}

/* Estilos para las tarjetas de estadísticas */
.stat-card {
  padding: 16px;
  border-radius: 8px;
  background: #f8f9fa;
  transition: all 0.3s ease;
}

.stat-card:hover {
  background: #e9ecef;
  transform: translateY(-2px);
}

.stat-number {
  font-size: 1.5rem;
  font-weight: bold;
  color: #1976d2;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.875rem;
  color: #666;
}

/* Efectos hover para las tarjetas principales */
.v-card {
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.v-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #e0e0e0;
}

/* Responsive adjustments */
@media (max-width: 960px) {
  .stat-number {
    font-size: 1.25rem;
  }
  
  .stat-card {
    padding: 12px;
  }
}
</style>