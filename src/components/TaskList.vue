<template>
  <div>
    <v-btn v-if="isAdmin" color="primary" @click="showDialog = true" class="mb-4">
      <v-icon left>mdi-plus</v-icon>
      Nueva Tarea
    </v-btn>

    <v-list lines="two">
      <v-list-subheader v-if="isAdmin">
        {{ filteredTasks.length }} tareas en total
      </v-list-subheader>
      <v-list-subheader v-else>
        {{ filteredTasks.length }} tareas asignadas
      </v-list-subheader>
      
      <v-list-item 
        v-for="task in filteredTasks" 
        :key="task.id" 
        class="mb-2 task-item"
        :class="{ 
          'overdue-task': isTaskOverdue(task),
          'multi-user-task': isMultiUserTask(task)
        }"
      >
        <template v-slot:prepend>
          <div class="progress-container">
            <v-progress-circular
              :model-value="getDisplayProgress(task)"
              :color="getProgressColor(getDisplayProgress(task))"
              size="40"
              class="task-progress"
            >
              {{ getDisplayProgress(task) }}%
            </v-progress-circular>
            
            <v-badge 
              v-if="isMultiUserTask(task)"
              color="primary"
              :content="task.assignedTo.length"
              class="multi-user-badge"
            />
          </div>
        </template>

        <v-list-item-title class="task-title">{{ task.title }}</v-list-item-title>
        <v-list-item-subtitle class="task-description">{{ task.description }}</v-list-item-subtitle>
        
        <v-list-item-subtitle class="mt-1 task-assigned">
          <v-icon small>mdi-account-multiple</v-icon>
          Asignado a: {{ getAssignedUsersNames(task) }}
        </v-list-item-subtitle>
        
        <v-list-item-subtitle 
          v-if="isMultiUserTask(task) && isTaskFullyCompleted(task)" 
          class="fully-completed"
        >
          <v-icon small color="success">mdi-check-all</v-icon>
          <strong>Tarea completada por todos los asignados</strong>
        </v-list-item-subtitle>
        
        <v-list-item-subtitle 
          v-if="!isAdmin && isMultiUserTask(task) && getOtherUsersProgress(task).length > 0" 
          class="other-users-progress"
        >
          <div class="progress-bars">
            <div 
              v-for="userProgress in getOtherUsersProgress(task)" 
              :key="userProgress.userId"
              class="user-progress-item"
              :class="{ 'completed-user': userProgress.progress === 100 }"
            >
              <span class="user-name">{{ userProgress.userName }}:</span>
              <v-progress-linear
                :model-value="userProgress.progress"
                :color="getProgressColor(userProgress.progress)"
                height="8"
                class="user-progress-bar"
              />
              <span class="progress-text">{{ userProgress.progress }}%</span>
              <v-icon v-if="userProgress.progress === 100" small color="success" class="ml-1">
                mdi-check
              </v-icon>
            </div>
          </div>
        </v-list-item-subtitle>
        
        <v-list-item-subtitle 
          v-if="isAdmin && isMultiUserTask(task) && task.individualProgress" 
          class="individual-progress-admin"
        >
          <div class="individual-progress-bars">
            <div 
              v-for="userId in task.assignedTo" 
              :key="userId"
              class="individual-progress-item"
              :class="{ 'completed-user': getUserProgress(task, userId) === 100 }"
            >
              <span class="user-name">{{ getEmployeeName(userId) }}:</span>
              <v-progress-linear
                :model-value="getUserProgress(task, userId)"
                :color="getProgressColor(getUserProgress(task, userId))"
                height="8"
                class="user-progress-bar"
              />
              <span class="progress-text">{{ getUserProgress(task, userId) }}%</span>
              <v-icon v-if="getUserProgress(task, userId) === 100" small color="success" class="ml-1">
                mdi-check
              </v-icon>
            </div>
          </div>
        </v-list-item-subtitle>
        
        <v-list-item-subtitle v-if="task.dueDate" class="task-due-date">
          <v-icon small>mdi-calendar-clock</v-icon>
          Fecha límite: {{ formatDate(task.dueDate) }}
          <v-icon v-if="isTaskOverdue(task)" small color="error" class="ml-1">
            mdi-alert
          </v-icon>
        </v-list-item-subtitle>
        
        <v-list-item-subtitle v-if="isAdmin && isMultiUserTask(task)" class="overall-progress">
          <v-icon small>mdi-chart-bar</v-icon>
          Progreso general (promedio): {{ task.progress }}%
          <v-progress-linear
            :model-value="task.progress"
            :color="getProgressColor(task.progress)"
            height="6"
            class="overall-progress-bar"
          />
          <div v-if="isMultiUserTask(task)" class="completion-info">
            <small class="text-grey">
              {{ getCompletedCount(task) }} de {{ task.assignedTo.length }} empleados han completado
            </small>
          </div>
        </v-list-item-subtitle>
        
        <template v-slot:append>
          <div class="text-right task-actions">
            <v-chip :color="getStatusColor(task.status)" class="mr-2 status-chip">
              {{ getStatusText(task.status) }}
            </v-chip>
            <v-menu v-if="!isAdmin">
              <template v-slot:activator="{ props }">
                <v-btn 
                  icon 
                  v-bind="props" 
                  size="small" 
                  class="progress-menu-btn"
                  :disabled="getMyProgress(task) === 100"
                >
                  <v-icon>mdi-dots-vertical</v-icon>
                </v-btn>
              </template>
              <v-list density="compact" class="progress-menu">
                <v-list-item 
                  v-for="option in progressOptions" 
                  :key="option.value"
                  @click="updateProgress(task, option.value)"
                  :disabled="getMyProgress(task) === 100"
                >
                  <v-list-item-title>{{ option.label }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </template>
      </v-list-item>

      <v-list-item v-if="filteredTasks.length === 0" class="no-tasks">
        <v-list-item-title class="text-center text-grey">
          <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-checkbox-marked-outline</v-icon>
          <div>No hay tareas {{ isAdmin ? 'creadas' : 'asignadas' }}</div>
        </v-list-item-title>
      </v-list-item>
    </v-list>

    <!-- Dialog para crear tarea -->
    <v-dialog v-model="showDialog" max-width="500" v-if="isAdmin">
      <v-card>
        <v-card-title class="dialog-title">
          <v-icon left>mdi-plus-circle</v-icon>
          Nueva Tarea
        </v-card-title>
        <v-card-text>
          <v-form @submit.prevent="createTask" class="task-form">
            <v-text-field 
              v-model="newTask.title" 
              label="Título *" 
              required
              variant="outlined"
              class="mb-3"
            ></v-text-field>
            
            <v-textarea 
              v-model="newTask.description" 
              label="Descripción"
              variant="outlined"
              rows="3"
              class="mb-3"
            ></v-textarea>
            
            <v-select
              v-model="newTask.assignedTo"
              :items="employees"
              item-title="name"
              item-value="id"
              label="Asignar a *"
              variant="outlined"
              multiple
              chips
              class="mb-3"
            >
              <template v-slot:selection="{ item, index }">
                <v-chip v-if="index < 3" size="small" class="mr-1">
                  <span>{{ item.title }}</span>
                </v-chip>
                <span v-if="index === 3" class="text-grey text-caption">
                  +{{ newTask.assignedTo.length - 3 }} más
                </span>
              </template>
            </v-select>
            
            <v-text-field
              v-model="newTask.dueDate"
              type="date"
              label="Fecha límite"
              variant="outlined"
              class="mb-3"
            ></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showDialog = false" variant="text">Cancelar</v-btn>
          <v-btn color="primary" @click="createTask" :disabled="!newTask.title || newTask.assignedTo.length === 0" :loading="creatingTask">
            Crear Tarea
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAppStore } from '../stores/app.js'
import { api } from '../services/api.js'

const props = defineProps(['isAdmin'])
const store = useAppStore()
const showDialog = ref(false)
const employees = ref([])
const newTask = ref({
  title: '',
  description: '',
  assignedTo: [],
  dueDate: ''
})
const creatingTask = ref(false) // ✅ NUEVO: Estado para controlar loading

const progressOptions = [
  { value: 0, label: '0% - Reiniciar' },
  { value: 25, label: '25% Completado' },
  { value: 50, label: '50% Completado' },
  { value: 75, label: '75% Completado' },
  { value: 100, label: '100% - Completado' }
]

// ✅ CORREGIDO: Filtrar tareas correctamente
const filteredTasks = computed(() => {
  console.log('🔄 Recalculando filteredTasks...')
  console.log(store.tasks[store.tasks.length-1])
  if (props.isAdmin) {
    console.log('👑 Modo ADMIN - Mostrando todas las tareas:', store.tasks.length)
    return store.tasks
  } else {
    const currentUserId = store.user?.id
    console.log('👤 Modo EMPLEADO - Filtrando para userId:', currentUserId)
    console.log('📋 Total de tareas en store:', store.tasks.length)
    
    if (!currentUserId) {
      console.log('❌ No hay usuario logueado')
      return []
    }
    
    const filtered = store.tasks.filter(task => {
      // ✅ CORREGIDO: Convertir a array y normalizar tipos
      const assignedTo = Array.isArray(task.assignedTo) 
        ? task.assignedTo.map(id => parseInt(id))
        : [parseInt(task.assignedTo)]
      
      const userId = parseInt(currentUserId)
      const isAssigned = assignedTo.includes(userId)
      
      console.log(`📝 Tarea "${task.title}": assignedTo=${JSON.stringify(assignedTo)}, userId=${userId}, isAssigned=${isAssigned}`)
      
      return isAssigned
    })
    
    console.log('✅ Tareas filtradas:', filtered.length)
    console.log('📄 Tareas encontradas:', filtered.map(t => ({ 
      id: t.id, 
      title: t.title, 
      assignedTo: t.assignedTo,
      individualProgress: t.individualProgress 
    })))
    
    return filtered
  }
})

// ✅ CORREGIDO: Definir getMyProgress localmente para evitar errores en el template
const getMyProgress = (task) => {
  console.log("editar###>", task)
  if (props.isAdmin) {
    return task.progress || 0
  } else {
    return store.getMyProgress(task)
  }
}

const getDisplayProgress = (task) => {
  return getMyProgress(task)
}

const isTaskFullyCompleted = (task) => {
  if (!task.individualProgress || !Array.isArray(task.assignedTo)) return false
  return task.assignedTo.every(userId => task.individualProgress[userId] === 100)
}

const getCompletedCount = (task) => {
  if (!task.individualProgress || !Array.isArray(task.assignedTo)) return 0
  const assignedTo = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo]
  return assignedTo.filter(userId => task.individualProgress[userId] === 100).length
}

const getOtherUsersProgress = (task) => {
  if (props.isAdmin) return []
  
  const otherProgress = store.getOtherUsersProgress(task)
  return otherProgress.map(userProgress => ({
    ...userProgress,
    userName: getEmployeeName(userProgress.userId)
  }))
}

const getUserProgress = (task, userId) => {
  if (!task.individualProgress) return 0
  return task.individualProgress[userId] || 0
}

const isMultiUserTask = (task) => {
  return Array.isArray(task.assignedTo) && task.assignedTo.length > 1
}

const getAssignedUsersNames = (task) => {
  if (!Array.isArray(task.assignedTo)) {
    return getEmployeeName(task.assignedTo)
  }
  
  if (task.assignedTo.length === 1) {
    return getEmployeeName(task.assignedTo[0])
  }
  
  if (task.assignedTo.length === 2) {
    return `${getEmployeeName(task.assignedTo[0])} y ${getEmployeeName(task.assignedTo[1])}`
  }
  
  return `${getEmployeeName(task.assignedTo[0])} y ${task.assignedTo.length - 1} más`
}

onMounted(async () => {
  console.log('🚀 TaskList montado - isAdmin:', props.isAdmin)
  console.log('👤 Usuario actual:', store.user)
  
  await loadTasks()
  if (props.isAdmin) {
    await loadEmployees()
  }
  
  // ✅ CORREGIDO: Configurar listeners de socket correctamente
  if (store.socket) {
    store.socket.on('taskUpdated', (task) => {
      console.log('🔄 Tarea actualizada en TaskList:', task.title)
      const index = store.tasks.findIndex(t => t.id === task.id)
      if (index !== -1) {
        store.tasks[index] = task
      }
    })
    
    // ❌ ELIMINADO: No necesitamos escuchar taskCreated aquí porque ya se maneja en el store
    // store.socket.on('taskCreated', (task) => {
    //   console.log('📝 Nueva tarea creada:', task.title)
    //   store.tasks.push(task) // ❌ ESTO CAUSABA LA DUPLICACIÓN
    // })
  }
})

const loadTasks = async () => {
  const url = props.isAdmin ? '/tasks' : `/tasks?userId=${store.user?.id}`
  try {
    console.log('📋 Cargando tareas desde:', url)
    const tasks = await api.get(url)
    console.log('✅ Tareas cargadas:', tasks.length)
    console.log('📄 Tareas recibidas:', tasks.map(t => ({ 
      id: t.id, 
      title: t.title, 
      assignedTo: t.assignedTo,
      individualProgress: t.individualProgress 
    })))
    store.setTasks(tasks)
  } catch (error) {
    console.error('❌ Error cargando tareas:', error)
  }
}

const loadEmployees = async () => {
  try {
    employees.value = await api.get('/users')
    console.log('✅ Empleados cargados:', employees.value.length)
  } catch (error) {
    console.error('❌ Error cargando empleados:', error)
  }
}

// ✅ CORREGIDO: Función createTask mejorada para evitar duplicados
const createTask = async () => {
  if (!newTask.value.title.trim()) {
    alert('El título de la tarea es requerido')
    return
  }

  if (!newTask.value.assignedTo || newTask.value.assignedTo.length === 0) {
    alert('Debes asignar la tarea al menos a un empleado')
    return
  }

  creatingTask.value = true // ✅ Mostrar loading

  try {
    console.log('📝 Creando nueva tarea...')
    const task = await api.post('/tasks', {
      ...newTask.value,
      assignedBy: store.user.id
    })
    
    console.log('✅ Tarea creada exitosamente:', task.title)
    console.log('📋 Tarea recibida del servidor:', task)
    
    // ✅ La tarea ya se agregó automáticamente desde la respuesta del API
    // NO necesitamos agregarla manualmente aquí
    
    showDialog.value = false
    newTask.value = { title: '', description: '', assignedTo: [], dueDate: '' }
    
  } catch (error) {
    console.error('❌ Error creando tarea:', error)
    alert('Error creando tarea: ' + error.message)
  } finally {
    creatingTask.value = false // ✅ Ocultar loading
  }
}

const updateProgress = async (task, progress) => {
  try {
    const updatedTask = await store.updateIndividualProgress(task.id, progress)
    console.log(`📊 Progreso individual actualizado: ${task.title} - ${progress}%`)
  } catch (error) {
    console.error('❌ Error actualizando progreso:', error)
    alert('Error actualizando progreso: ' + error.message)
  }
}

const getProgressColor = (progress) => {
  if (progress < 25) return 'error'
  if (progress < 75) return 'warning'
  return 'success'
}

const getStatusColor = (status) => {
  const colors = {
    'pending': 'grey',
    'in-progress': 'blue',
    'completed': 'green'
  }
  return colors[status] || 'grey'
}

const getStatusText = (status) => {
  const texts = {
    'pending': 'Pendiente',
    'in-progress': 'En Progreso',
    'completed': 'Completado'
  }
  return texts[status] || status
}

const getEmployeeName = (employeeId) => {
  const employee = employees.value.find(emp => emp.id === employeeId)
  return employee ? employee.name : `Empleado ${employeeId}`
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const isTaskOverdue = (task) => {
  if (!task.dueDate) return false
  const dueDate = new Date(task.dueDate)
  const today = new Date()
  return dueDate < today && task.status !== 'completed'
}
</script>

<style scoped>
.task-item {
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  transition: all 0.3s ease;
}

.task-item:hover {
  border-color: #1976d2;
  background-color: rgba(25, 118, 210, 0.02);
}

.overdue-task {
  border-left: 4px solid #f44336;
  background-color: rgba(244, 67, 54, 0.05);
}

.multi-user-task {
  border-left: 4px solid #4caf50;
}

.progress-container {
  position: relative;
  display: inline-block;
}

.multi-user-badge {
  position: absolute;
  top: -5px;
  right: -5px;
}

.task-progress {
  font-weight: bold;
  font-size: 0.8rem;
}

.task-title {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 4px;
}

.task-description {
  color: #666;
  font-size: 0.9rem;
}

.task-assigned {
  font-size: 0.8rem;
  color: #1976d2;
}

.fully-completed {
  font-size: 0.8rem;
  color: #4caf50;
  margin-top: 4px;
}

.other-users-progress {
  margin-top: 8px;
}

.individual-progress-admin {
  margin-top: 8px;
}

.progress-bars, .individual-progress-bars {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-progress-item, .individual-progress-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  padding: 2px 0;
}

.completed-user {
  background-color: rgba(76, 175, 80, 0.05);
  border-radius: 4px;
  padding: 2px 8px;
}

.user-name {
  min-width: 80px;
  color: #666;
}

.user-progress-bar {
  flex: 1;
  max-width: 120px;
}

.progress-text {
  min-width: 30px;
  text-align: right;
  font-weight: 500;
}

.overall-progress {
  margin-top: 8px;
  font-size: 0.8rem;
}

.overall-progress-bar {
  margin-top: 4px;
  max-width: 150px;
}

.completion-info {
  margin-top: 2px;
}

.task-due-date {
  font-size: 0.8rem;
  color: #666;
}

.status-chip {
  font-weight: 500;
}

.progress-menu-btn {
  transition: all 0.3s ease;
}

.progress-menu-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.no-tasks {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-title {
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.task-form {
  margin-top: 8px;
}
</style>