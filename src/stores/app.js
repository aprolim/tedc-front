import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import socketService from '../services/socket.js'
import { api } from '../services/api.js'

export const useAppStore = defineStore('app', () => {
  const user = ref(null)
  const tasks = ref([])
  const messages = ref([])
  const userLocations = ref({})
  const socket = ref(null)
  const isSocketConnected = ref(false)
  const initialized = ref(false)
  const onlineUsers = ref({})
  const chatViewingStatus = ref({})
  const loading = ref(false)
  const authError = ref(null)

  const socketConnected = computed(() => isSocketConnected.value)

  // ✅ NUEVO: Función de login
  const login = async (email, password) => {
    loading.value = true
    authError.value = null
    
    try {
      console.log('🔐 Intentando login con:', email)
      
      const response = await api.post('/auth/login', {
        email,
        password
      })
      
      if (response.success) {
        console.log('✅ Login exitoso:', response.user.name)
        setUser(response.user)
        
        // Guardar en localStorage para persistencia
        localStorage.setItem('user', JSON.stringify(response.user))
        localStorage.setItem('token', response.token)
        
        return { success: true, user: response.user }
      } else {
        throw new Error(response.message || 'Error en el login')
      }
    } catch (error) {
      console.error('❌ Error en login:', error)
      authError.value = error.message || 'Error de autenticación'
      return { success: false, error: error.message }
    } finally {
      loading.value = false
    }
  }

  // ✅ NUEVO: Función de logout
  // ✅ CORREGIDO: Función de logout mejorada
  const logout = () => {
    console.log('🚪 Ejecutando logout en store...')
    
    // Guardar referencia al usuario actual para logging
    const currentUserName = user.value?.name
    
    // 1. Desconectar socket primero
    if (socket.value) {
      console.log('🔌 Desconectando socket...')
      socket.value.disconnect()
      socket.value = null
    }
    
    // 2. Limpiar localStorage
    console.log('🗑️ Limpiando localStorage...')
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    
    // 3. Resetear estado reactivo
    console.log('🔄 Reseteando estado...')
    user.value = null
    tasks.value = []
    messages.value = []
    userLocations.value = {}
    onlineUsers.value = {}
    chatViewingStatus.value = {}
    initialized.value = false
    isSocketConnected.value = false
    authError.value = null
    loading.value = false
    
    console.log(`✅ Logout completado para: ${currentUserName || 'Usuario'}`)
  }

  // ✅ MODIFICADO: setUser ahora verifica si ya está inicializado
  const setUser = (userData) => {
    if (user.value && user.value.id === userData?.id) {
      console.log('⚠️ Usuario ya establecido, ignorando...')
      return
    }
    
    console.log('👤 SET USER llamado con:', userData)
    user.value = userData
    
    if (userData && !initialized.value) {
      initializeSocket()
      initialized.value = true
    }
  }

  // ✅ NUEVO: Verificar autenticación al cargar la app
  const checkAuth = () => {
    const savedUser = localStorage.getItem('user')
    const savedToken = localStorage.getItem('token')
    
    if (savedUser && savedToken) {
      try {
        const userData = JSON.parse(savedUser)
        console.log('🔍 Usuario encontrado en localStorage:', userData.name)
        setUser(userData)
        return true
      } catch (error) {
        console.error('❌ Error cargando usuario de localStorage:', error)
        logout()
        return false
      }
    }
    return false
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
      
      messages.value.push(message)
    })
    
    socket.value.on('userStatusUpdate', (data) => {
      console.log('🔄 Actualizando estado de usuarios:', data)
      onlineUsers.value = data.onlineUsers
    })
    
    socket.value.on('messagesRead', (data) => {
      console.log('📖 Mensajes marcados como leídos por:', data.readerId)
      
      messages.value.forEach(msg => {
        if (Array.isArray(data.messageIds) && data.messageIds.includes(msg.id)) {
          msg.read = true
          msg.readAt = new Date()
        }
      })
    })
    
    socket.value.on('chatViewingStatus', (data) => {
      console.log(`👀 Estado de visualización: Usuario ${data.userId} ${data.isViewing ? 'viendo' : 'dejó de ver'} chat`)
      chatViewingStatus.value[data.userId] = data.isViewing
    })
    
    // Listeners existentes
    socket.value.on('taskCreated', (task) => {
      console.log('📝 Nueva tarea:', task.title)
      tasks.value.push(task)
    })
    
    socket.value.on('taskUpdated', (task) => {
      console.log('🔄 Tarea actualizada:', task.title)
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

  // Funciones existentes (sin cambios)
  const markMessagesAsRead = (senderId, specificMessageIds = null) => {
    if (socket.value && user.value) {
      socket.value.emit('markMessagesAsRead', {
        userId: user.value.id,
        senderId: senderId,
        messageIds: specificMessageIds
      })
      
      if (specificMessageIds) {
        messages.value.forEach(msg => {
          if (specificMessageIds.includes(msg.id) && 
              msg.senderId === senderId && 
              msg.receiverId === user.value.id &&
              !msg.read) {
            msg.read = true
            msg.readAt = new Date()
          }
        })
      }
    }
  }

  const setChatViewingStatus = (partnerId, isViewing) => {
    if (socket.value && user.value) {
      socket.value.emit('userViewingChat', {
        userId: user.value.id,
        partnerId,
        isViewing
      })
    }
  }

  const updateChatViewingStatus = (data) => {
    chatViewingStatus.value[data.userId] = data.isViewing
  }

  const isPartnerViewingChat = (partnerId) => {
    return chatViewingStatus.value[partnerId] || false
  }

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

  const isUserOnline = (userId) => {
    return onlineUsers.value[userId]?.status === 'online'
  }

  const getUserLastSeen = (userId) => {
    const userData = onlineUsers.value[userId]
    return userData ? userData.lastSeen : null
  }

  const getUnreadCountFromUser = (senderId) => {
    return messages.value.filter(msg => 
      msg.senderId === senderId && 
      msg.receiverId === user.value?.id &&
      !msg.read
    ).length
  }

  const getAllUnreadMessages = () => {
    return messages.value.filter(msg => 
      msg.receiverId === user.value?.id &&
      !msg.read
    )
  }

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
    
    const existingMessagesMap = new Map()
    messages.value.forEach(msg => {
      if (msg.read) {
        existingMessagesMap.set(msg.id, { read: true, readAt: msg.readAt })
      }
    })
    
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

  const addLocalMessage = (message) => {
    messages.value.push({
      ...message,
      id: Date.now(),
      timestamp: new Date(),
      read: false
    })
  }

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
    loading,
    authError,
    isSocketConnected: socketConnected,
    
    // ✅ NUEVAS: Funciones de autenticación
    login,
    logout,
    checkAuth,
    
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
    isEmployee: computed(() => user.value?.role === 'employee'),
    isAuthenticated: computed(() => !!user.value) // ✅ NUEVO
  }
})