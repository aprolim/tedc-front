import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import socketService from '../services/socket.js'
import { api } from '../services/api.js'
import notificationService from '../services/notifications.js'

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

  // ✅ NUEVO: Generar ID único por pestaña
  const getSessionId = () => {
    let sessionId = sessionStorage.getItem('app_session_id')
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      sessionStorage.setItem('app_session_id', sessionId)
    }
    return sessionId
  }

  // ✅ NUEVO: Prefijo único para cada pestaña
  const getStorageKey = (key) => {
    return `${getSessionId()}_${key}`
  }

  // Computed properties
  const socketConnected = computed(() => isSocketConnected.value)
  const currentUser = computed(() => user.value)
  const totalUnreadCount = computed(() => getAllUnreadMessages().length)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isEmployee = computed(() => user.value?.role === 'employee')
  const isAuthenticated = computed(() => !!user.value)
  
  const onlineEmployeesCount = computed(() => {
    return Object.values(onlineUsers.value).filter(userData => 
      userData.status === 'online' && userData.userId !== 1
    ).length
  })
  
  const onlineEmployees = computed(() => {
    const employees = []
    for (const [userId, userData] of Object.entries(onlineUsers.value)) {
      if (userData.status === 'online' && userId !== '1') {
        employees.push({
          id: parseInt(userId),
          ...userData
        })
      }
    }
    return employees
  })

  const canNotify = computed(() => notificationService.canNotify())
  const notificationPermission = computed(() => notificationService.getPermissionStatus())

  // ✅ NUEVA FUNCIÓN: Limpiar datos de usuario
  const clearUserData = () => {
    console.log('🧹 Limpiando datos del usuario anterior...')
    tasks.value = []
    messages.value = []
    userLocations.value = {}
    onlineUsers.value = {}
    chatViewingStatus.value = {}
    authError.value = null
    
    // Cerrar socket del usuario anterior
    if (socket.value) {
      console.log('🔌 Cerrando socket del usuario anterior')
      socket.value.disconnect()
      socket.value = null
      isSocketConnected.value = false
      initialized.value = false
    }
  }

  // Authentication
  const login = async (email, password) => {
    loading.value = true
    authError.value = null
    
    try {
      console.log('🔐 Intentando login con:', email)
      console.log('🆔 Session ID:', getSessionId())
      
      const response = await api.post('/auth/login', {
        email,
        password
      })
      
      if (response.success) {
        console.log('✅ Login exitoso:', response.user.name)
        
        // ✅ CORREGIDO: Usar sessionStorage en lugar de localStorage
        setUser(response.user)
        
        sessionStorage.setItem(getStorageKey('user'), JSON.stringify(response.user))
        sessionStorage.setItem(getStorageKey('token'), response.token)
        
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

  const logout = () => {
    console.log('🚪 Ejecutando logout en store...')
    
    const currentUserName = user.value?.name
    
    clearUserData()
    
    // ✅ CORREGIDO: Limpiar sessionStorage de esta pestaña
    sessionStorage.removeItem(getStorageKey('user'))
    sessionStorage.removeItem(getStorageKey('token'))
    
    user.value = null
    
    console.log(`✅ Logout completado para: ${currentUserName || 'Usuario'}`)
  }

  // ✅ CORREGIDO: Función setUser mejorada
  const setUser = (userData) => {
    console.log('👤 SET USER llamado con:', userData?.name)
    console.log('🆔 Session ID:', getSessionId())
    
    if (user.value && user.value.id !== userData?.id) {
      console.log(`🔄 Cambiando usuario: ${user.value.name} → ${userData.name}`)
      clearUserData()
    } else if (!user.value && userData) {
      console.log('🆕 Estableciendo usuario inicial:', userData.name)
    } else if (user.value && user.value.id === userData?.id) {
      console.log('ℹ️ Mismo usuario, manteniendo datos existentes')
    }
    
    user.value = userData
    
    if (userData && !initialized.value) {
      initializeSocket()
      initialized.value = true
    }
  }

  const checkAuth = () => {
    // ✅ CORREGIDO: Usar sessionStorage con prefijo único
    const savedUser = sessionStorage.getItem(getStorageKey('user'))
    const savedToken = sessionStorage.getItem(getStorageKey('token'))
    
    console.log('🔍 Verificando autenticación...')
    console.log('🆔 Session ID:', getSessionId())
    console.log('📁 Usuario en sessionStorage:', savedUser ? 'Sí' : 'No')
    
    if (savedUser && savedToken) {
      try {
        const userData = JSON.parse(savedUser)
        console.log('🔍 Usuario encontrado en sessionStorage:', userData.name)
        setUser(userData)
        return true
      } catch (error) {
        console.error('❌ Error cargando usuario de sessionStorage:', error)
        logout()
        return false
      }
    } else {
      console.log('🔍 No hay usuario autenticado en esta pestaña')
      // ✅ Asegurar que no hay datos residuales
      if (user.value) {
        console.log('⚠️ Hay usuario en store pero no en sessionStorage, limpiando...')
        clearUserData()
        user.value = null
      }
    }
    return false
  }

  // Socket Management
  const initializeSocket = () => {
    console.log('🔌 Inicializando socket para user:', user.value?.id)
    console.log('🆔 Session ID:', getSessionId())
    
    if (socket.value) {
      console.log('⚠️ Socket ya existe, cerrando conexión anterior...')
      socket.value.disconnect()
      socket.value = null
    }
    
    socket.value = socketService.connect()
    setupSocketListeners()
    
    socket.value.on('connect', () => {
      console.log('✅ Socket CONECTADO - User ID:', user.value?.id)
      isSocketConnected.value = true
      
      if (user.value) {
        socket.value.emit('userOnline', user.value.id)
        console.log('📢 Emitiendo userOnline para:', user.value.id)
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
  }

  const setupSocketListeners = () => {
    if (!socket.value) {
      console.log('❌ No hay socket para configurar listeners')
      return
    }

    console.log('🔧 Configurando listeners de socket...')

    const events = [
      'newMessage', 'userStatusUpdate', 'messagesRead', 
      'chatViewingStatus', 'taskCreated', 'taskUpdated', 
      'locationUpdate', 'taskProgress'
    ]
    
    events.forEach(event => {
      socket.value.off(event)
    })

    socket.value.on('newMessage', (message) => {
      console.log('📨 Nuevo mensaje recibido en store:', message)
      const exists = messages.value.find(m => m.id === message.id)
      if (!exists) {
        messages.value.push(message)
        console.log('✅ Mensaje agregado al store')
        
        if (message.receiverId === user.value?.id && document.visibilityState !== 'visible') {
          const senderName = message.senderId === 1 ? 'Administrador' : `Empleado ${message.senderId}`
          showNewMessageNotification(senderName, message.content)
        }
      }
    })
    
    socket.value.on('userStatusUpdate', (data) => {
      console.log('🔄 Actualizando estado de usuarios:', data)
      onlineUsers.value = { ...onlineUsers.value, ...data.onlineUsers }
    })
    
    socket.value.on('messagesRead', (data) => {
      console.log('📖 Mensajes marcados como leídos por:', data.readerId)
      
      let markedCount = 0
      messages.value.forEach(msg => {
        if (Array.isArray(data.messageIds) && data.messageIds.includes(msg.id)) {
          if (!msg.read) {
            msg.read = true
            msg.readAt = new Date()
            markedCount++
          }
        }
      })
      console.log(`✅ ${markedCount} mensajes marcados como leídos`)
    })
    
    socket.value.on('chatViewingStatus', (data) => {
      console.log(`👀 Estado de visualización: Usuario ${data.userId} ${data.isViewing ? 'viendo' : 'dejó de ver'} chat`)
      chatViewingStatus.value[data.userId] = data.isViewing
    })
    
    // ✅ CORREGIDO: Listener de taskCreated - EVITA DUPLICADOS
    socket.value.on('taskCreated', (task) => {
      console.log('📝 Nueva tarea recibida por socket:', task.title)
      console.log('🔍 Verificando si la tarea ya existe...')
      
      // ✅ VERIFICACIÓN ROBUSTA PARA EVITAR DUPLICADOS
      const exists = tasks.value.find(t => t.id === task.id)
      
      if (exists) {
        console.log('⚠️ Tarea ya existe en store, ignorando duplicado del socket')
        console.log('📋 Tarea existente:', exists.title)
        return
      }
      
      // ✅ VERIFICAR SI LA TAREA ES RELEVANTE PARA EL USUARIO ACTUAL
      let isRelevant = false
      
      if (user.value?.role === 'admin') {
        // Admin ve todas las tareas
        isRelevant = true
        console.log('👑 Admin - Tarea relevante (ve todas)')
      } else if (user.value) {
        // Empleado solo ve tareas asignadas a él
        const assignedTo = Array.isArray(task.assignedTo) 
          ? task.assignedTo.map(id => parseInt(id))
          : [parseInt(task.assignedTo)]
        
        isRelevant = assignedTo.includes(user.value.id)
        console.log(`👤 Empleado ${user.value.id} - Tarea relevante: ${isRelevant}`)
        console.log(`📋 Tarea asignada a: ${assignedTo.join(', ')}`)
      }
      
      if (isRelevant) {
        tasks.value.push(task)
        console.log('✅ Tarea agregada desde socket (relevante para usuario)')
        
        // ✅ Mostrar notificación si es empleado y la tarea es para él
        if (user.value?.role === 'employee' && document.visibilityState !== 'visible') {
          showTaskNotification(task.title, 'Administrador')
        }
      } else {
        console.log('ℹ️ Tarea recibida pero no relevante para usuario actual, ignorando')
      }
    })
    
    socket.value.on('taskUpdated', (task) => {
      console.log('🔄 Tarea actualizada recibida:22', task)
      const index = tasks.value.findIndex(t => t.id === task.id)
      if (index !== -1) {
        tasks.value[index] = task
        console.log('✅ Tarea actualizada en store desde socket')
      } else {
        console.log('⚠️ Tarea no encontrada en store, verificando relevancia...')
        
        // ✅ Misma verificación de relevancia que en taskCreated
        let isRelevant = false
        if (user.value?.role === 'admin') {
          isRelevant = true
        } else if (user.value) {
          const assignedTo = Array.isArray(task.assignedTo) 
            ? task.assignedTo.map(id => parseInt(id))
            : [parseInt(task.assignedTo)]
          isRelevant = assignedTo.includes(user.value.id)
        }
        
        if (isRelevant) {
          tasks.value.push(task)
          console.log('✅ Tarea agregada desde actualización (relevante)')
        }
      }
    })
    
    socket.value.on('locationUpdate', (data) => {
      console.log('📍 Ubicación actualizada - User:', data.userId)
      userLocations.value[data.userId] = data.location
    })
    
    socket.value.on('taskProgress', (data) => {
      console.log('📊 Progreso de tarea recibido:', data)
      const task = tasks.value.find(t => t.id === data.taskId)
      if (task && data.userId && data.progress !== undefined) {
        if (!task.individualProgress) {
          task.individualProgress = {}
        }
        task.individualProgress[data.userId] = data.progress
        
        // ✅ CORREGIDO COMPLETAMENTE: Replicar la misma lógica de cálculo que en el backend
        const progressValues = Object.values(task.individualProgress)
        const totalProgress = progressValues.reduce((sum, p) => sum + p, 0)
        const averageProgress = progressValues.length > 0 ? Math.round(totalProgress / progressValues.length) : 0
        
        const assignedTo = Array.isArray(task.assignedTo) 
          ? task.assignedTo.map(id => parseInt(id))
          : [parseInt(task.assignedTo)]
        
        // ✅ CORREGIDO: Verificar que TODOS los asignados tengan 100%
        const allCompleted = assignedTo.every(userId => 
          task.individualProgress[userId] === 100
        )
        
        // ✅ CORREGIDO: Contar cuántos han completado para logs informativos
        const completedCount = assignedTo.filter(userId => 
          task.individualProgress[userId] === 100
        ).length
        const totalAssigned = assignedTo.length
        
        console.log(`📊 Cálculo de progreso local:`)
        console.log(`   - Asignados: ${assignedTo.join(', ')}`)
        console.log(`   - Progresos individuales:`, task.individualProgress)
        console.log(`   - Completados: ${completedCount}/${totalAssigned}`)
        console.log(`   - Promedio: ${averageProgress}%`)
        console.log(`   - Todos completados: ${allCompleted}`)
        
        if (allCompleted) {
          task.status = 'completed'
          task.progress = 100
          console.log(`✅ Tarea COMPLETADA localmente: Todos los asignados (${completedCount}/${totalAssigned}) han terminado`)
        } else if (averageProgress > 0 || progressValues.length > 0) {
          task.status = 'in-progress'
          task.progress = averageProgress
          console.log(`🔄 Tarea EN PROGRESO localmente: ${completedCount}/${totalAssigned} completados, promedio ${averageProgress}%`)
        } else {
          task.status = 'pending'
          task.progress = 0
          console.log(`⏳ Tarea PENDIENTE localmente: Sin progreso`)
        }
        
        console.log(`✅ Progreso actualizado localmente: ${task.title} - ${task.progress}%`)
      }
    })

    console.log('✅ Todos los listeners de socket configurados')
  }

  // Notifications
  const requestNotificationPermission = async () => {
    return await notificationService.requestPermission()
  }

  const showNewMessageNotification = async (senderName, message, messageCount = 1) => {
    if (!user.value) return false
    
    if (document.visibilityState === 'visible') {
      console.log('📱 App en primer plano, no mostrar notificación')
      return false
    }

    return await notificationService.showNewMessageNotification(senderName, message, messageCount)
  }

  const showTaskNotification = async (taskTitle, assignedBy) => {
    if (!user.value) return false
    
    if (document.visibilityState === 'visible') {
      return false
    }

    return await notificationService.showTaskAssignedNotification(taskTitle, assignedBy)
  }

  // Task Management
  // En la función updateIndividualProgress, reemplaza el cálculo actual con:
  const updateIndividualProgress = async (taskId, progress) => {
    console.log('777', progress)
    if (!user.value?.id) {
      console.log('❌ No hay usuario logueado para actualizar progreso')
      throw new Error('Usuario no autenticado')
    }
    
    try {
      console.log(`📊 Actualizando progreso: taskId=${taskId}, userId=${user.value.id}, progress=${progress}`)
      
      const response = await api.put(`/tasks/${taskId}/progress/${user.value.id}`, {
        progress
      })
      
      console.log('✅ Respuesta del servidor:', response)
      
      // ✅ CORREGIDO COMPLETAMENTE: Actualizar localmente con la misma lógica del backend
      const taskIndex = tasks.value.findIndex(t => t.id === taskId)
      if (taskIndex !== -1) {
        if (!tasks.value[taskIndex].individualProgress) {
          tasks.value[taskIndex].individualProgress = {}
        }
        tasks.value[taskIndex].individualProgress[user.value.id] = progress
        
        // ✅ CORREGIDO: Replicar EXACTAMENTE la misma lógica del backend
        const assignedTo = Array.isArray(tasks.value[taskIndex].assignedTo) 
          ? tasks.value[taskIndex].assignedTo.map(id => parseInt(id))
          : [parseInt(tasks.value[taskIndex].assignedTo)]
        
        const totalAssigned = assignedTo.length
        let totalProgressSum = 0
        let completedCount = 0
        
        // Calcular suma total considerando TODOS los asignados
        assignedTo.forEach(userId => {
          const userProgress = tasks.value[taskIndex].individualProgress[userId] || 0
          totalProgressSum += userProgress
          
          if (userProgress === 100) {
            completedCount++
          }
        })
        
        // ✅ SIEMPRE calcular el promedio entre TODOS los asignados
        const averageProgress = Math.round(totalProgressSum / totalAssigned)
        
        // ✅ CORREGIDO: Solo completado si TODOS los asignados tienen 100%
        const allCompleted = assignedTo.every(userId => 
          tasks.value[taskIndex].individualProgress[userId] === 100
        )
        
        // ✅ CORREGIDO: Determinar estado
        let status = 'pending'
        if (allCompleted) {
          status = 'completed'
        } else if (averageProgress > 0 || Object.keys(tasks.value[taskIndex].individualProgress).length > 0) {
          status = 'in-progress'
        }
        
        // ✅ ACTUALIZAR con valores CORRECTOS
        tasks.value[taskIndex].progress = averageProgress
        tasks.value[taskIndex].status = status
        
        console.log(`📊 Cálculo CORREGIDO local:`)
        console.log(`   - Asignados: ${assignedTo.join(', ')}`)
        console.log(`   - Progresos individuales:`, tasks.value[taskIndex].individualProgress)
        console.log(`   - Suma total: ${totalProgressSum}`)
        console.log(`   - Total asignados: ${totalAssigned}`)
        console.log(`   - Promedio CORRECTO: ${averageProgress}%`)
        console.log(`   - Completados: ${completedCount}/${totalAssigned}`)
        console.log(`   - Todos completados: ${allCompleted}`)
        console.log(`   - Estado: ${status}`)
        
        console.log(`✅ Progreso actualizado CORRECTAMENTE localmente: ${tasks.value[taskIndex].title} - ${tasks.value[taskIndex].progress}%`)
      }
      
      if (socket.value && socket.value.connected) {
        socket.value.emit('taskProgress', {
          taskId,
          progress,
          userId: user.value.id
        })
        console.log('📢 Evento taskProgress emitido')
      }
      
      return response
    } catch (error) {
      console.error('❌ Error actualizando progreso individual:', error)
      throw error
    }
  }

  const getMyProgress = (task) => {
    if (!user.value?.id) {
      console.log(`📊 getMyProgress: No hay usuario logueado`)
      return 0
    }
    
    if (!task.individualProgress) {
      console.log(`📊 getMyProgress: task="${task.title}" no tiene individualProgress`)
      return 0
    }
    
    const userProgress = task.individualProgress[user.value.id]
    console.log(`📊 getMyProgress: task="${task.title}", userProgress=${userProgress}`)
    return userProgress !== undefined ? userProgress : 0
  }

  const getOtherUsersProgress = (task) => {
    if (!task.individualProgress || !user.value?.id) {
      console.log(`📊 getOtherUsersProgress: No hay datos suficientes`)
      return []
    }
    
    const otherProgress = Object.entries(task.individualProgress)
      .filter(([userId]) => parseInt(userId) !== user.value.id)
      .map(([userId, progress]) => ({
        userId: parseInt(userId),
        progress,
        userName: `Empleado ${userId}`
      }))
    
    console.log(`📊 getOtherUsersProgress: ${otherProgress.length} otros usuarios`)
    return otherProgress
  }

  // Data Management
  const setTasks = (tasksData) => {
    console.log('📋 Estableciendo tareas:', tasksData.length)
    console.log('📄 Tareas recibidas:', tasksData.map(t => ({ 
      id: t.id, 
      title: t.title, 
      assignedTo: t.assignedTo,
      individualProgress: t.individualProgress 
    })))
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

  // Message Management
  const markMessagesAsRead = (senderId, specificMessageIds = null) => {
    if (socket.value && socket.value.connected && user.value) {
      socket.value.emit('markMessagesAsRead', {
        userId: user.value.id,
        senderId: senderId,
        messageIds: specificMessageIds
      })
      console.log('📢 Evento markMessagesAsRead emitido')
      
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
    } else {
      console.log('❌ Socket no disponible para marcar mensajes como leídos')
    }
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

  // Chat Viewing Status
  const setChatViewingStatus = (partnerId, isViewing) => {
    if (socket.value && socket.value.connected && user.value) {
      socket.value.emit('userViewingChat', {
        userId: user.value.id,
        partnerId,
        isViewing
      })
      console.log(`📢 userViewingChat emitido: ${isViewing ? 'viendo' : 'dejó de ver'} chat con ${partnerId}`)
    } else {
      console.log('❌ Socket no disponible para enviar estado de visualización')
    }
  }

  const updateChatViewingStatus = (data) => {
    chatViewingStatus.value[data.userId] = data.isViewing
  }

  const isPartnerViewingChat = (partnerId) => {
    return chatViewingStatus.value[partnerId] || false
  }

  // Location Management
  const updateUserLocation = (data) => {
    userLocations.value[data.userId] = data.location
  }

  const sendUserLocation = (location) => {
    if (socket.value && socket.value.connected && user.value) {
      socket.value.emit('userLocation', {
        userId: user.value.id,
        location: {
          ...location,
          lastUpdate: new Date()
        }
      })
      console.log('📍 Ubicación enviada al servidor')
    } else {
      console.log('❌ Socket no disponible para enviar ubicación')
    }
  }

  // User Status
  const isUserOnline = (userId) => {
    return onlineUsers.value[userId]?.status === 'online'
  }

  const getUserLastSeen = (userId) => {
    const userData = onlineUsers.value[userId]
    return userData ? userData.lastSeen : null
  }

  // Utility Functions
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
    clearUserData()
  }

  const reconnectSocket = () => {
    if (!isSocketConnected.value && user.value) {
      console.log('🔄 Intentando reconectar socket...')
      initializeSocket()
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
    
    // Computed
    isSocketConnected: socketConnected,
    currentUser,
    totalUnreadCount,
    isAdmin,
    isEmployee,
    isAuthenticated,
    onlineEmployeesCount,
    onlineEmployees,
    canNotify,
    notificationPermission,
    
    // Authentication
    login,
    logout,
    checkAuth,
    setUser,
    
    // Socket
    reconnectSocket,
    
    // Notifications
    requestNotificationPermission,
    showNewMessageNotification,
    showTaskNotification,
    
    // Tasks
    updateIndividualProgress,
    getMyProgress,
    getOtherUsersProgress,
    setTasks,
    
    // Messages
    setMessages,
    markMessagesAsRead,
    markAllMessagesAsRead,
    getUnreadCountFromUser,
    getAllUnreadMessages,
    getUnreadMessagesFromUser,
    addLocalMessage,
    
    // Chat
    setChatViewingStatus,
    updateChatViewingStatus,
    isPartnerViewingChat,
    
    // Location
    updateUserLocation,
    sendUserLocation,
    
    // Users
    isUserOnline,
    getUserLastSeen,
    
    // Utility
    clearData
  }
})