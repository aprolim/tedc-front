import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import socketService from '../services/socket.js'

export const useAppStore = defineStore('app', () => {
  const user = ref(null)
  const tasks = ref([])
  const messages = ref([])
  const userLocations = ref({})
  const socket = ref(null)
  const isSocketConnected = ref(false)
  const initialized = ref(false)
  const onlineUsers = ref({})

  const socketConnected = computed(() => isSocketConnected.value)

  const setUser = (userData) => {
    if (user.value && user.value.id === userData.id) {
      console.log('⚠️ Usuario ya establecido, ignorando...')
      return
    }
    
    console.log('👤 SET USER llamado con:', userData)
    user.value = userData
    
    if (!initialized.value) {
      initializeSocket()
      initialized.value = true
    }
  }

  const initializeSocket = () => {
    console.log('🔌 Inicializando socket para user:', user.value?.id)
    socket.value = socketService.connect()
    
    socket.value.on('connect', () => {
      console.log('✅ Socket CONECTADO - User ID:', user.value?.id)
      isSocketConnected.value = true
      
      // Notificar que el usuario está en línea
      if (user.value) {
        socket.value.emit('userOnline', user.value.id)
      }
    })
    
    socket.value.on('disconnect', () => {
      console.log('❌ Socket DESCONECTADO')
      isSocketConnected.value = false
    })
    
    socket.value.on('connect_error', (error) => {
      console.log('❌ Error de conexión socket:', error)
      isSocketConnected.value = false
    })

    // Configurar listeners de eventos
    // REEMPLAZAR la sección del socket.newMessage con esta versión CORREGIDA:
    socket.value.on('newMessage', (message) => {
      console.log('📨 Nuevo mensaje recibido en store')
      console.log('   De:', message.senderId, 'Para:', message.receiverId)
      console.log('   Contenido:', message.content)
      
      // Agregar el mensaje al store
      messages.value.push(message)
      
      // ✅ LÓGICA CORREGIDA: Solo marcar como leído si soy el RECEPTOR
      // y el mensaje es relevante para mi sesión actual
      if (message.receiverId === user.value?.id) {
        console.log('💡 Mensaje para mí - El componente decidirá si marcarlo como leído')
        
        // Pequeño delay para permitir que el componente se actualice
        setTimeout(() => {
          // Emitir un evento para que el componente sepa que hay un nuevo mensaje
          // El componente manejará el marcado como leído según el contexto
          socket.value.emit('newMessageProcessed', { 
            messageId: message.id,
            receiverId: user.value.id,
            senderId: message.senderId
          })
        }, 100)
      }
    })
    
    // Actualizar estado de usuarios en línea
    socket.value.on('userStatusUpdate', (data) => {
      console.log('🔄 Actualizando estado de usuarios:', data)
      console.log('   Usuario afectado:', data.userId, 'Estado:', data.status)
      console.log('   Total de usuarios en línea:', Object.values(data.onlineUsers).filter(u => u.status === 'online').length)
      
      // Actualizar el estado completo de usuarios en línea
      onlineUsers.value = data.onlineUsers
      
      // Log para debugging
      const onlineCount = Object.values(onlineUsers.value).filter(u => u.status === 'online').length
      console.log(`📊 Estado actual - Usuarios en línea: ${onlineCount}`)
    })
    
    // Mensajes marcados como leídos
    socket.value.on('messagesRead', (data) => {
      console.log('📖 Mensajes marcados como leídos por:', data.readerId)
      console.log('   Mensajes afectados:', data.messageIds)
      
      // Actualizar estado local de mensajes leídos
      messages.value.forEach(msg => {
        if (data.messageIds === 'all') {
          // Marcar todos los mensajes del lector como leídos
          if (msg.senderId === user.value?.id && msg.receiverId === data.readerId) {
            msg.read = true
            msg.readAt = new Date()
            console.log(`✅ Todos los mensajes para ${data.readerId} marcados como leídos`)
          }
        } else if (Array.isArray(data.messageIds)) {
          // Marcar mensajes específicos como leídos
          if (data.messageIds.includes(msg.id)) {
            msg.read = true
            msg.readAt = new Date()
            console.log(`✅ Mensaje ${msg.id} marcado como leído`)
          }
        }
      })
    })
    
    // Listeners existentes
    socket.value.on('taskCreated', (task) => {
      console.log('📝 Nueva tarea:', task.title)
      tasks.value.push(task)
    })
    
    socket.value.on('taskUpdated', (task) => {
      console.log('🔄 Tarea actualizada:', task.title, task.progress + '%')
      const index = tasks.value.findIndex(t => t.id === task.id)
      if (index !== -1) {
        tasks.value[index] = task
      }
    })
    
    socket.value.on('locationUpdate', (data) => {
      console.log('📍 Ubicación actualizada - User:', data.userId)
      userLocations.value[data.userId] = data.location
    })
  }

  // Función para marcar mensajes específicos como leídos
  const markMessagesAsRead = (senderId, specificMessageIds = null) => {
    if (socket.value && user.value) {
      console.log(`📤 Enviando markMessagesAsRead:`, {
        userId: user.value.id,
        senderId: senderId,
        messageIds: specificMessageIds
      })
      
      socket.value.emit('markMessagesAsRead', {
        userId: user.value.id,
        senderId: senderId,
        messageIds: specificMessageIds
      })
      
      // Actualizar estado local inmediatamente para mejor UX
      if (specificMessageIds) {
        messages.value.forEach(msg => {
          if (specificMessageIds.includes(msg.id) && !msg.read) {
            msg.read = true
            msg.readAt = new Date()
            console.log(`✅ Mensaje ${msg.id} marcado como leído localmente`)
          }
        })
      } else {
        // Marcar todos los mensajes no leídos de este sender
        messages.value.forEach(msg => {
          if (msg.senderId === senderId && msg.receiverId === user.value.id && !msg.read) {
            msg.read = true
            msg.readAt = new Date()
            console.log(`✅ Todos los mensajes de ${senderId} marcados como leídos`)
          }
        })
      }
    }
  }

  // Función para marcar todos los mensajes de un sender como leídos
  const markAllMessagesAsRead = (senderId) => {
    markMessagesAsRead(senderId, null)
  }

  // Función para obtener estado de un usuario
  const isUserOnline = (userId) => {
    return onlineUsers.value[userId]?.status === 'online'
  }

  // Función para obtener el último tiempo de actividad de un usuario
  const getUserLastSeen = (userId) => {
    const userData = onlineUsers.value[userId]
    return userData ? userData.lastSeen : null
  }

  // Función para contar mensajes no leídos de un usuario específico
  const getUnreadCountFromUser = (senderId) => {
    return messages.value.filter(msg => 
      msg.senderId === senderId && 
      msg.receiverId === user.value?.id &&
      !msg.read
    ).length
  }

  // Función para obtener todos los mensajes no leídos
  const getAllUnreadMessages = () => {
    return messages.value.filter(msg => 
      msg.receiverId === user.value?.id &&
      !msg.read
    )
  }

  // Función para obtener mensajes no leídos de un usuario específico
  const getUnreadMessagesFromUser = (senderId) => {
    return messages.value.filter(msg => 
      msg.senderId === senderId && 
      msg.receiverId === user.value?.id &&
      !msg.read
    )
  }

  const setTasks = (tasksData) => {
    console.log('📋 Estableciendo tareas:', tasksData.length)
    tasks.value = tasksData
  }

  const setMessages = (messagesData) => {
    console.log('💾 Guardando mensajes:', messagesData.length)
    
    // Preservar el estado de 'read' de los mensajes existentes
    const existingMessagesMap = new Map()
    messages.value.forEach(msg => {
      if (msg.read) {
        existingMessagesMap.set(msg.id, { read: true, readAt: msg.readAt })
      }
    })
    
    // Aplicar el estado de 'read' a los nuevos mensajes
    messagesData.forEach(msg => {
      const existingState = existingMessagesMap.get(msg.id)
      if (existingState) {
        msg.read = existingState.read
        msg.readAt = existingState.readAt
      }
    })
    
    messages.value = messagesData
  }

  const updateUserLocation = (data) => {
    userLocations.value[data.userId] = data.location
  }

  // Función para agregar un mensaje localmente (para testing)
  const addLocalMessage = (message) => {
    messages.value.push({
      ...message,
      id: Date.now(),
      timestamp: new Date(),
      read: false
    })
  }

  // Función para limpiar todos los datos (para testing)
  const clearData = () => {
    user.value = null
    tasks.value = []
    messages.value = []
    userLocations.value = {}
    onlineUsers.value = {}
    initialized.value = false
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }
  }

  return {
    // Estados
    user,
    tasks,
    messages,
    userLocations,
    socket,
    onlineUsers,
    isSocketConnected: socketConnected,
    
    // Setters
    setUser,
    setTasks,
    setMessages,
    updateUserLocation,
    
    // Funciones de mensajes
    markMessagesAsRead,
    markAllMessagesAsRead,
    isUserOnline,
    getUserLastSeen,
    getUnreadCountFromUser,
    getAllUnreadMessages,
    getUnreadMessagesFromUser,
    
    // Funciones de utilidad
    addLocalMessage,
    clearData,
    
    // Computed adicionales para conveniencia
    currentUser: computed(() => user.value),
    totalUnreadCount: computed(() => getAllUnreadMessages().length),
    isAdmin: computed(() => user.value?.role === 'admin'),
    isEmployee: computed(() => user.value?.role === 'employee')
  }
})