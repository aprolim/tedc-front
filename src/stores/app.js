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
  const chatViewingStatus = ref({}) // { [partnerId]: boolean }

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
    socket.value.on('newMessage', (message) => {
      console.log('📨 Nuevo mensaje recibido en store')
      console.log('   De:', message.senderId, 'Para:', message.receiverId)
      console.log('   Contenido:', message.content)
      
      // Agregar el mensaje al store
      messages.value.push(message)
      
      // NO marcar automáticamente como leído - la lógica de visibilidad se encargará
      console.log('💡 Mensaje agregado, se marcará como leído cuando sea visible')
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
        if (Array.isArray(data.messageIds) && data.messageIds.includes(msg.id)) {
          msg.read = true
          msg.readAt = new Date()
          console.log(`✅ Mensaje ${msg.id} marcado como leído`)
        }
      })
    })
    
    // Estado de visualización del chat
    socket.value.on('chatViewingStatus', (data) => {
      console.log(`👀 Estado de visualización: Usuario ${data.userId} ${data.isViewing ? 'viendo' : 'dejó de ver'} chat con ${data.partnerId}`)
      chatViewingStatus.value[data.userId] = data.isViewing
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

  // En el store, modifica la función markMessagesAsRead:
  const markMessagesAsRead = (senderId, specificMessageIds = null) => {
    if (socket.value && user.value) {
      console.log(`📤 Enviando markMessagesAsRead:`, {
        userId: user.value.id,
        senderId: senderId,
        messageIds: specificMessageIds
      })
      
      // IMPORTANTE: Solo marcar mensajes del OTRO usuario como leídos
      // No marcar nuestros propios mensajes
      socket.value.emit('markMessagesAsRead', {
        userId: user.value.id,
        senderId: senderId,
        messageIds: specificMessageIds
      })
      
      // CORREGIDO: Solo actualizar estado local para mensajes del OTRO usuario
      if (specificMessageIds) {
        messages.value.forEach(msg => {
          // SOLO marcar como leído si el mensaje es del OTRO usuario (senderId)
          // y yo soy el receptor (receiverId)
          if (specificMessageIds.includes(msg.id) && 
              msg.senderId === senderId && 
              msg.receiverId === user.value.id &&
              !msg.read) {
            msg.read = true
            msg.readAt = new Date()
            console.log(`✅ Mensaje ${msg.id} marcado como leído localmente`)
          }
        })
      }
    }
  }

  // Función para notificar estado de visualización del chat
  const setChatViewingStatus = (partnerId, isViewing) => {
    if (socket.value && user.value) {
      console.log(`📤 Notificando estado de visualización: ${user.value.id} -> ${partnerId} = ${isViewing}`)
      socket.value.emit('userViewingChat', {
        userId: user.value.id,
        partnerId,
        isViewing
      })
    }
  }

  // Función para actualizar estado de visualización recibido del servidor
  const updateChatViewingStatus = (data) => {
    chatViewingStatus.value[data.userId] = data.isViewing
  }

  // Función para verificar si el partner está viendo el chat
  const isPartnerViewingChat = (partnerId) => {
    return chatViewingStatus.value[partnerId] || false
  }

  // Función para marcar todos los mensajes de un sender como leídos
  const markAllMessagesAsRead = (senderId) => {
    const unreadMessages = messages.value.filter(msg => 
      msg.senderId === senderId && 
      msg.receiverId === user.value?.id &&
      !msg.read
    ).map(msg => msg.id)
    
    if (unreadMessages.length > 0) {
      markMessagesAsRead(senderId, unreadMessages)
    }
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
    chatViewingStatus.value = {}
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
    chatViewingStatus,
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
    
    // Funciones de visibilidad del chat
    setChatViewingStatus,
    updateChatViewingStatus,
    isPartnerViewingChat,
    
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