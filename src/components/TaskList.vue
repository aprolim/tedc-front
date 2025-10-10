<template>
  <div>
    <v-btn v-if="isAdmin" color="primary" @click="showDialog = true" class="mb-4">
      Nueva Tarea
    </v-btn>

    <v-list lines="two">
      <v-list-item v-for="task in filteredTasks" :key="task.id" class="mb-2">
        <template v-slot:prepend>
          <v-progress-circular
            :model-value="task.progress"
            :color="getProgressColor(task.progress)"
            size="40"
          >
            {{ task.progress }}%
          </v-progress-circular>
        </template>

        <v-list-item-title>{{ task.title }}</v-list-item-title>
        <v-list-item-subtitle>{{ task.description }}</v-list-item-subtitle>
        
        <template v-slot:append>
          <v-chip :color="getStatusColor(task.status)" class="mr-2">
            {{ getStatusText(task.status) }}
          </v-chip>
          <v-menu v-if="!isAdmin">
            <template v-slot:activator="{ props }">
              <v-btn icon v-bind="props">
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list>
              <v-list-item @click="updateProgress(task, 25)">
                <v-list-item-title>25% Completado</v-list-item-title>
              </v-list-item>
              <v-list-item @click="updateProgress(task, 50)">
                <v-list-item-title>50% Completado</v-list-item-title>
              </v-list-item>
              <v-list-item @click="updateProgress(task, 75)">
                <v-list-item-title>75% Completado</v-list-item-title>
              </v-list-item>
              <v-list-item @click="updateProgress(task, 100)">
                <v-list-item-title>Completado</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>
      </v-list-item>
    </v-list>

    <!-- Dialog para crear tarea -->
    <v-dialog v-model="showDialog" max-width="500" v-if="isAdmin">
      <v-card>
        <v-card-title>Nueva Tarea</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="createTask">
            <v-text-field v-model="newTask.title" label="Título" required></v-text-field>
            <v-textarea v-model="newTask.description" label="Descripción"></v-textarea>
            <v-select
              v-model="newTask.assignedTo"
              :items="employees"
              item-title="name"
              item-value="id"
              label="Asignar a"
            ></v-select>
            <v-text-field
              v-model="newTask.dueDate"
              type="date"
              label="Fecha límite"
            ></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showDialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="createTask">Crear</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '../stores/app.js'
import { api } from '../services/api.js'
import socketService from '../services/socket.js'

const props = defineProps(['isAdmin'])
const store = useAppStore()
const showDialog = ref(false)
const employees = ref([])
const newTask = ref({
  title: '',
  description: '',
  assignedTo: null,
  dueDate: ''
})

const filteredTasks = computed(() => {
  if (props.isAdmin) {
    return store.tasks
  } else {
    return store.tasks.filter(task => task.assignedTo === store.user?.id)
  }
})

onMounted(async () => {
  await loadTasks()
  if (props.isAdmin) {
    await loadEmployees()
  }
  
  // Escuchar actualizaciones en tiempo real
  if (store.socket) {
    store.socket.on('taskCreated', (task) => {
      store.tasks.push(task)
    })
    
    store.socket.on('taskUpdated', (task) => {
      const index = store.tasks.findIndex(t => t.id === task.id)
      if (index !== -1) {
        store.tasks[index] = task
      }
    })
  }
})

const loadTasks = async () => {
  const url = props.isAdmin ? '/tasks' : `/tasks?userId=${store.user.id}`
  const tasks = await api.get(url)
  store.setTasks(tasks)
}

const loadEmployees = async () => {
  employees.value = await api.get('/users')
}

const createTask = async () => {
  const task = await api.post('/tasks', {
    ...newTask.value,
    assignedBy: store.user.id
  })
  showDialog.value = false
  newTask.value = { title: '', description: '', assignedTo: null, dueDate: '' }
}

const updateProgress = async (task, progress) => {
  const updatedTask = await api.put(`/tasks/${task.id}`, {
    progress,
    status: progress === 100 ? 'completed' : 'in-progress'
  })
  
  if (store.socket) {
    store.socket.emit('taskProgress', {
      taskId: task.id,
      progress
    })
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
</script>