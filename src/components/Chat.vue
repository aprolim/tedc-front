<template>
  <div class="chat-wrapper">
    <!-- Lista de empleados (solo admin) -->
    <div v-if="isAdmin" class="employee-list-container">
      <v-card class="employee-list-card">
        <v-card-title class="employee-list-header">
          <span>Empleados del equipo</span>
          <v-chip :color="onlineCount > 0 ? 'green' : 'grey'" size="small" variant="flat">
            {{ onlineCount }} en línea
          </v-chip>
        </v-card-title>
        
        <v-card-text class="pa-0">
          <v-list class="employee-list">
            <v-list-item
              v-for="employee in sortedEmployees"
              :key="employee.id"
              @click="selectEmployee(employee)"
              :class="{ 
                'selected-employee': selectedEmployee?.id === employee.id,
                'has-unread': hasUnreadMessages(employee.id)
              }"
              class="employee-list-item"
            >
              <template v-slot:prepend>
                <div class="employee-avatar-container">
                  <v-avatar color="primary" size="48">
                    <span class="text-white avatar-text">{{ getInitials(employee.name) }}</span>
                  </v-avatar>
                  <v-badge
                    :color="getUserStatusColor(employee.id)"
                    dot
                    class="status-badge"
                    bordered
                  />
                </div>
              </template>

              <v-list-item-title class="employee-name">
                {{ employee.name }}
                <v-icon v-if="hasUnreadMessages(employee.id)" color="primary" size="small" class="ml-1">
                  mdi-message-alert
                </v-icon>
              </v-list-item-title>
              
              <v-list-item-subtitle class="employee-status" :class="getUserStatusTextColor(employee.id)">
                {{ getUserStatusText(employee.id) }}
              </v-list-item-subtitle>

              <template v-slot:append>
                <div class="employee-meta">
                  <v-badge 
                    v-if="getUnreadCount(employee.id) > 0"
                    :content="getUnreadCount(employee.id)"
                    color="red"
                    class="unread-badge"
                  />
                  <div v-if="getLastMessageTime(employee.id)" class="last-message-time">
                    {{ formatLastMessageTime(employee.id) }}
                  </div>
                </div>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </div>

    <!-- Área de chat -->
    <div v-if="(!isAdmin || selectedEmployee)" class="chat-area" ref="chatArea">
      <!-- Header del chat -->
      <div class="chat-header">
        <div class="chat-partner-info">
          <div class="partner-avatar-container">
            <v-avatar :color="isAdmin ? 'primary' : 'blue-darken-2'" size="44">
              <span class="text-white avatar-text">
                {{ isAdmin ? getInitials(selectedEmployee?.name) : 'A' }}
              </span>
            </v-avatar>
            <v-badge 
              :color="getUserStatusColor(chatPartnerId)"
              dot
              class="status-badge"
              bordered
            />
            <div 
              v-if="isPartnerViewingChat && store.isUserOnline(chatPartnerId)"
              class="viewing-indicator-header"
              title="Está viendo el chat"
            >
              <v-icon size="14" color="green">mdi-eye</v-icon>
            </div>
          </div>
          <div class="partner-details">
            <div class="partner-name">
              {{ isAdmin ? selectedEmployee?.name : 'Administrador' }}
            </div>
            <div class="partner-status" :class="getUserStatusTextColor(chatPartnerId)">
              {{ getUserStatusText(chatPartnerId) }}
              <span v-if="isPartnerViewingChat && store.isUserOnline(chatPartnerId)" class="viewing-text">
                • Viendo el chat
              </span>
            </div>
          </div>
        </div>

        <v-btn 
          v-if="hasUnreadMessages(chatPartnerId)"
          icon 
          size="small"
          @click="markAllAsRead"
          :loading="markingAsRead"
          title="Marcar todos como leídos"
          class="mark-read-btn"
        >
          <v-icon>mdi-check-all</v-icon>
        </v-btn>
      </div>

      <!-- Lista de mensajes -->
      <div class="messages-container" ref="messagesContainer" @scroll="onMessagesScroll">
        <div v-if="filteredMessages.length === 0" class="empty-chat">
          <v-icon size="48" color="grey-lighten-1">mdi-forum-outline</v-icon>
          <div class="empty-title">No hay mensajes aún</div>
          <div class="empty-subtitle">¡Envía el primer mensaje!</div>
        </div>
        
        <div
          v-for="message in filteredMessages"
          :key="message.id"
          :data-message-id="message.id"
          :class="['message', message.senderId === currentUserId ? 'sent' : 'received']"
        >
          <div class="message-bubble">
            <div class="message-content">{{ message.content }}</div>
            <div class="message-meta">
              <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              <div v-if="message.senderId === currentUserId" class="message-status">
                <v-icon 
                  v-if="message.read" 
                  size="14" 
                  color="blue-darken-2"
                  title="Leído"
                >mdi-check-all</v-icon>
                <v-icon 
                  v-else 
                  size="14" 
                  color="grey"
                  title="Enviado"
                >mdi-check</v-icon>
              </div>
            </div>
          </div>
          
          <!-- SOLO mostrar "viendo" para mensajes NO LEÍDOS del usuario actual -->
          <div 
            v-if="message.senderId === currentUserId && 
                  !message.read && 
                  isPartnerViewingChat && 
                  store.isUserOnline(chatPartnerId)"
            class="viewing-indicator"
          >
            <v-icon size="12" color="orange">mdi-eye</v-icon>
            <span>Viendo...</span>
          </div>
          
          <div v-if="message.senderId === currentUserId && message.read" class="read-indicator">
            ✓ Leído {{ formatReadTime(message.readAt) }}
          </div>
        </div>

        <div 
          v-if="unreadMessagesCount > 0 && !isAtBottom" 
          class="new-messages-indicator"
          @click="scrollToBottomAndMarkRead"
        >
          <v-chip color="primary" size="small">
            <v-icon start size="small">mdi-arrow-down</v-icon>
            {{ unreadMessagesCount }} nuevo{{ unreadMessagesCount > 1 ? 's' : '' }}
          </v-chip>
        </div>
      </div>

      <!-- Input de mensajes -->
      <div class="message-input-area">
        <v-text-field
          v-model="newMessage"
          placeholder="Escribe un mensaje..."
          @keypress.enter="sendMessage"
          append-inner-icon="mdi-send"
          @click:append-inner="sendMessage"
          :loading="sendingMessage"
          :disabled="!store.isSocketConnected || sendingMessage"
          hide-details
          density="comfortable"
          variant="outlined"
          class="message-input"
        />
        
        <div class="connection-status">
          <v-icon 
            :color="store.isSocketConnected ? 'green' : 'red'" 
            size="small"
            class="status-icon"
          >mdi-circle</v-icon>
          {{ connectionStatus }}
        </div>
      </div>
    </div>

    <!-- Estado sin selección (solo admin) -->
    <div v-else-if="isAdmin" class="no-selection-state">
      <v-icon size="64" color="grey-lighten-1">mdi-account-multiple</v-icon>
      <div class="no-selection-text">Selecciona un empleado para comenzar a chatear</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { useAppStore } from '../stores/app.js'
import { api } from '../services/api.js'

const props = defineProps(['isAdmin'])
const store = useAppStore()

// Reactive data
const employees = ref([])
const selectedEmployee = ref(null)
const newMessage = ref('')
const messagesContainer = ref(null)
const chatArea = ref(null)
const sendingMessage = ref(false)
const markingAsRead = ref(false)
const isAtBottom = ref(true)
const autoScrollEnabled = ref(true)
const isChatVisible = ref(false)
const visibilityObserver = ref(null)

// Estado de visibilidad del partner
const isPartnerViewingChat = ref(false)

// CORREGIDO: Nuevos estados para controlar interacción real
const userInteractedWithChat = ref(false)
const lastInteractionTime = ref(null)

// Debounce timers
let scrollDebounceTimer = null
let visibilityDebounceTimer = null
let markReadDebounceTimer = null
let interactionTimer = null

// Computed properties
const currentUserId = computed(() => store.user?.id)
const chatPartnerId = computed(() => props.isAdmin ? selectedEmployee.value?.id : 1)

const onlineCount = computed(() => {
  return Object.values(store.onlineUsers).filter(user => user.status === 'online').length
})

// Contar todos los mensajes no leídos
const unreadMessagesCount = computed(() => {
  if (!chatPartnerId.value) return 0
  return store.getUnreadCountFromUser(chatPartnerId.value)
})

const sortedEmployees = computed(() => {
  return [...employees.value].sort((a, b) => {
    const unreadA = getUnreadCount(a.id)
    const unreadB = getUnreadCount(b.id)
    
    if (unreadA > 0 && unreadB === 0) return -1
    if (unreadA === 0 && unreadB > 0) return 1
    
    const timeA = getLastMessageTime(a.id) || 0
    const timeB = getLastMessageTime(b.id) || 0
    return timeB - timeA
  })
})

const filteredMessages = computed(() => {
  if (!currentUserId.value || !chatPartnerId.value) return []
  
  return store.messages.filter(msg => 
    (msg.senderId === currentUserId.value && msg.receiverId === chatPartnerId.value) ||
    (msg.senderId === chatPartnerId.value && msg.receiverId === currentUserId.value)
  ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
})

const connectionStatus = computed(() => {
  if (!store.isSocketConnected) return 'Conectando al servidor...'
  return 'Conectado - Mensajes en tiempo real'
})

// CORREGIDO: Computed más estricto para saber si el usuario está viendo ESTE chat
const isUserViewingThisChat = computed(() => {
  return isChatVisible.value && 
         document.visibilityState === 'visible' && 
         userInteractedWithChat.value
})

// Status helpers
const getUserStatusColor = (userId) => {
  return store.isUserOnline(userId) ? 'green' : 'red'
}

const getUserStatusTextColor = (userId) => {
  return store.isUserOnline(userId) ? 'text-green' : 'text-grey'
}

const getUserStatusText = (userId) => {
  if (store.isUserOnline(userId)) return 'En línea'
  
  const lastSeen = store.getUserLastSeen(userId)
  if (!lastSeen) return 'Desconectado'
  
  const now = new Date()
  const lastSeenDate = new Date(lastSeen)
  const diffMs = now - lastSeenDate
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Recientemente'
  if (diffMins < 60) return `Hace ${diffMins} min`
  return `Visto ${lastSeenDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
}

// CORREGIDO: Message helpers - Solo mensajes del partner que no he leído
const getVisibleUnreadMessageIds = () => {
  if (!chatPartnerId.value || !messagesContainer.value) return []
  
  const container = messagesContainer.value
  const visibleMessages = []
  
  // Obtener todos los elementos de mensaje
  const messageElements = container.querySelectorAll('.message')
  
  messageElements.forEach(element => {
    const rect = element.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    
    // CORREGIDO: Criterio más estricto de visibilidad
    // El mensaje debe estar completamente visible en el viewport
    const isFullyVisible = (
      rect.top >= containerRect.top && 
      rect.bottom <= containerRect.bottom &&
      rect.height > 0
    )
    
    if (isFullyVisible) {
      const messageId = parseInt(element.dataset.messageId)
      const message = filteredMessages.value.find(msg => msg.id === messageId)
      
      // SOLO mensajes del partner que yo no he leído
      if (message && 
          message.senderId === chatPartnerId.value && 
          message.receiverId === currentUserId.value &&
          !message.read) {
        visibleMessages.push(message.id)
      }
    }
  })
  
  console.log(`👀 ${visibleMessages.length} mensajes visibles no leídos DEL PARTNER`)
  return visibleMessages
}

const hasUnreadMessages = (employeeId) => {
  return getUnreadCount(employeeId) > 0
}

const getUnreadCount = (employeeId) => {
  return store.getUnreadCountFromUser(employeeId)
}

const getLastMessageTime = (employeeId) => {
  const messagesWithEmployee = store.messages.filter(msg => 
    (msg.senderId === employeeId && msg.receiverId === currentUserId.value) ||
    (msg.senderId === currentUserId.value && msg.receiverId === employeeId)
  )
  
  if (messagesWithEmployee.length === 0) return null
  
  const lastMessage = messagesWithEmployee.reduce((latest, current) => {
    return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
  })
  
  return new Date(lastMessage.timestamp)
}

const getLastMessagePreview = (employeeId) => {
  const lastTime = getLastMessageTime(employeeId)
  if (!lastTime) return ''
  
  const lastMessage = store.messages.find(msg => 
    (msg.senderId === employeeId && msg.receiverId === currentUserId.value) ||
    (msg.senderId === currentUserId.value && msg.receiverId === employeeId)
  )
  
  if (!lastMessage) return ''
  
  const content = lastMessage.content
  return content.length > 30 ? content.substring(0, 30) + '...' : content
}

// UI helpers
const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
}

const formatLastMessageTime = (employeeId) => {
  const lastTime = getLastMessageTime(employeeId)
  if (!lastTime) return ''
  
  const now = new Date()
  const diffMs = now - lastTime
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  
  return lastTime.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatReadTime = (readAt) => {
  if (!readAt) return ''
  return new Date(readAt).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// CORREGIDO COMPLETAMENTE: Marcar mensajes visibles como leídos
const markVisibleMessagesAsRead = async () => {
  // CORREGIDO: Condiciones MUCHO más estrictas
  if (!isChatVisible.value || 
      !isUserViewingThisChat.value || 
      document.visibilityState !== 'visible' ||
      !userInteractedWithChat.value) {
    console.log('🚫 No marcar como leído: condiciones no cumplidas')
    return
  }
  
  // CORREGIDO: Verificar que haya pasado al menos 2 segundos desde la última interacción
  const now = Date.now()
  if (lastInteractionTime.value && (now - lastInteractionTime.value) < 2000) {
    console.log('🚫 No marcar como leído: interacción muy reciente')
    return
  }
  
  // IMPORTANTE: Solo marcar mensajes del PARTNER como leídos
  const visibleUnreadIds = getVisibleUnreadMessageIds()
  
  if (visibleUnreadIds.length > 0 && chatPartnerId.value) {
    console.log(`👀 Marcando ${visibleUnreadIds.length} mensajes DEL PARTNER como leídos`)
    
    try {
      // Esto notificará al partner que hemos leído sus mensajes
      await store.markMessagesAsRead(chatPartnerId.value, visibleUnreadIds)
    } catch (error) {
      console.error('Error marcando mensajes del partner como leídos:', error)
    }
  } else {
    console.log('💡 No hay mensajes del partner para marcar como leídos')
  }
}

// Marcar todos los mensajes como leídos (solo del partner)
const markAllAsRead = async () => {
  if (!chatPartnerId.value) return
  
  // SOLO mensajes del partner que no he leído
  const allUnreadIds = store.getUnreadMessagesFromUser(chatPartnerId.value).map(msg => msg.id)
  if (allUnreadIds.length > 0) {
    markingAsRead.value = true
    console.log(`📖 Marcando TODOS los mensajes DEL PARTNER (${allUnreadIds.length}) como leídos`)
    
    try {
      await store.markMessagesAsRead(chatPartnerId.value, allUnreadIds)
    } catch (error) {
      console.error('Error marcando todos los mensajes del partner como leídos:', error)
    } finally {
      markingAsRead.value = false
    }
  }
}

// CORREGIDO: Trackear interacción del usuario
const trackUserInteraction = () => {
  userInteractedWithChat.value = true
  lastInteractionTime.value = Date.now()
  
  // Resetear el timer de interacción
  clearTimeout(interactionTimer)
  interactionTimer = setTimeout(() => {
    userInteractedWithChat.value = false
    console.log('⏰ Interacción del usuario expirada')
  }, 30000) // 30 segundos sin interacción = no está activo
}

const onMessagesScroll = () => {
  if (messagesContainer.value) {
    const container = messagesContainer.value
    const scrollPosition = container.scrollTop + container.clientHeight
    const scrollThreshold = container.scrollHeight - 50
    
    isAtBottom.value = scrollPosition >= scrollThreshold
    
    // CORREGIDO: Trackear scroll como interacción
    trackUserInteraction()
    
    // Marcar mensajes visibles cuando se hace scroll (solo mensajes del partner)
    if (isChatVisible.value && isUserViewingThisChat.value) {
      clearTimeout(scrollDebounceTimer)
      scrollDebounceTimer = setTimeout(() => {
        markVisibleMessagesAsRead()
      }, 1500) // Delay más largo
    }
  }
}

const scrollToBottomAndMarkRead = () => {
  scrollToBottom()
  trackUserInteraction() // CORREGIDO: Click es interacción
  setTimeout(() => {
    if (isUserViewingThisChat.value) {
      markVisibleMessagesAsRead()
    }
  }, 1000)
}

const scrollToBottom = () => {
  if (!autoScrollEnabled.value) return
  
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      isAtBottom.value = true
    }
  })
}

// CORREGIDO: Observador de visibilidad del chat - MÁS ESTRICTO
const setupVisibilityObserver = () => {
  if (!chatArea.value) return
  
  visibilityObserver.value = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const wasVisible = isChatVisible.value
      isChatVisible.value = entry.isIntersecting
      
      console.log(`📱 Chat ${entry.isIntersecting ? 'visible' : 'oculto'} - Viendo chat: ${isUserViewingThisChat.value}`)
      
      // Usar debounce para evitar notificaciones rápidas
      clearTimeout(visibilityDebounceTimer)
      visibilityDebounceTimer = setTimeout(() => {
        if (entry.isIntersecting && chatPartnerId.value && document.visibilityState === 'visible') {
          // CORREGIDO: Solo notificar que está viendo si hay interacción reciente
          if (userInteractedWithChat.value) {
            store.setChatViewingStatus(chatPartnerId.value, true)
          }
          
          // Marcar mensajes visibles como leídos después de un delay (solo del partner)
          clearTimeout(markReadDebounceTimer)
          markReadDebounceTimer = setTimeout(() => {
            markVisibleMessagesAsRead()
          }, 3000) // Delay MUCHO más largo - 3 segundos
        } else if (chatPartnerId.value && wasVisible && !entry.isIntersecting) {
          // Notificar que dejó de ver el chat solo si antes estaba visible
          console.log(`🚫 Usuario dejó de ver el chat con ${chatPartnerId.value}`)
          store.setChatViewingStatus(chatPartnerId.value, false)
        }
      }, 500)
    })
  }, {
    threshold: 0.8 // 80% del componente visible - MUCHO más estricto
  })
  
  visibilityObserver.value.observe(chatArea.value)
}

// CORREGIDO: Listener para cambios de visibilidad de la página
const setupPageVisibilityListener = () => {
  const handleVisibilityChange = () => {
    console.log(`📄 Visibilidad de página: ${document.visibilityState}`)
    
    // CORREGIDO: Resetear interacción cuando la página se oculta
    if (document.visibilityState === 'hidden') {
      userInteractedWithChat.value = false
    }
    
    clearTimeout(visibilityDebounceTimer)
    visibilityDebounceTimer = setTimeout(() => {
      if (document.visibilityState === 'hidden' && chatPartnerId.value) {
        // Página oculta - notificar que dejó de ver el chat
        console.log(`🚫 Página oculta - dejando de ver chat con ${chatPartnerId.value}`)
        store.setChatViewingStatus(chatPartnerId.value, false)
      } else if (document.visibilityState === 'visible' && isChatVisible.value && chatPartnerId.value) {
        // CORREGIDO: Solo notificar que está viendo si hay interacción
        // No notificar automáticamente al volver a la página
        console.log(`👀 Página visible - esperando interacción para notificar`)
        
        // No marcar automáticamente como leídos al volver
        // El usuario debe interactuar primero
      }
    }, 300)
  }
  
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  // CORREGIDO: También trackear clicks y teclas en el chat
  const trackInteraction = () => {
    if (isChatVisible.value && document.visibilityState === 'visible') {
      trackUserInteraction()
      
      // Notificar que está viendo el chat después de interacción
      if (chatPartnerId.value) {
        store.setChatViewingStatus(chatPartnerId.value, true)
      }
    }
  }
  
  // Agregar event listeners para interacción
  document.addEventListener('click', trackInteraction)
  document.addEventListener('keydown', trackInteraction)
  
  // Retornar la función para remover los listeners
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    document.removeEventListener('click', trackInteraction)
    document.removeEventListener('keydown', trackInteraction)
  }
}

// Handler para mensajes entrantes - NO marcar automáticamente
const handleIncomingMessage = (message) => {
  console.log('📨 Mensaje entrante en chat:', message)
  
  const isRelevantForCurrentUser = 
    message.receiverId === currentUserId.value || 
    message.senderId === currentUserId.value
  
  if (!isRelevantForCurrentUser) return
  
  // IMPORTANTE: NO marcar automáticamente como leído
  // Solo se marcará cuando el usuario realmente vea el mensaje
  console.log('💡 Mensaje recibido, se marcará como leído cuando sea visible')
  
  // Auto-scroll si estamos al final
  if (isAtBottom.value) {
    setTimeout(() => {
      scrollToBottom()
    }, 100)
  }
}

const setupMessageListener = () => {
  if (store.socket) {
    store.socket.off('newMessage', handleIncomingMessage)
    store.socket.on('newMessage', handleIncomingMessage)
  }
}

const setupStatusListeners = () => {
  if (store.socket) {
    store.socket.on('userStatusUpdate', (data) => {
      console.log('🔄 Actualización de estado:', data)
    })
  }
}

// Setup de listeners de estado del partner
const setupViewingStatusListeners = () => {
  if (store.socket) {
    store.socket.on('chatViewingStatus', (data) => {
      console.log('👀 Estado de visualización recibido:', data)
      
      // SOLO actualizar si es nuestro partner actual
      if (data.userId === chatPartnerId.value) {
        isPartnerViewingChat.value = data.isViewing
        console.log(`🔄 Partner ${data.userId} ${data.isViewing ? 'está viendo' : 'dejó de ver'} el chat`)
      }
      
      store.updateChatViewingStatus(data)
    })
  }
}

// Data loading
const loadEmployees = async () => {
  try {
    employees.value = await api.get('/users')
    const employeeWithUnread = employees.value.find(emp => hasUnreadMessages(emp.id))
    selectedEmployee.value = employeeWithUnread || employees.value[0]
    
    if (selectedEmployee.value) {
      await loadMessages()
    }
  } catch (error) {
    console.error('Error cargando empleados:', error)
  }
}

const loadMessages = async () => {
  try {
    const messages = await api.get(`/messages/${currentUserId.value}`)
    store.setMessages(messages)
    
    setTimeout(() => {
      scrollToBottom()
      // NO marcar automáticamente como leídos al cargar
    }, 100)
    
  } catch (error) {
    console.error('Error cargando mensajes:', error)
  }
}

// Al seleccionar empleado
const selectEmployee = async (employee) => {
  // Notificar que dejó de ver el chat anterior
  if (selectedEmployee.value) {
    store.setChatViewingStatus(selectedEmployee.value.id, false)
  }
  
  // Resetear estado del partner
  isPartnerViewingChat.value = false
  userInteractedWithChat.value = false // CORREGIDO: Resetear interacción
  
  selectedEmployee.value = employee
  autoScrollEnabled.value = true
  setupMessageListener()
  
  // CORREGIDO: No notificar automáticamente que está viendo
  // Esperar a que el usuario interactúe
  
  await loadMessages()
}

const sendMessage = async () => {
  if (!newMessage.value.trim()) return
  
  if (!store.isSocketConnected) {
    alert('Espera a que se establezca la conexión...')
    return
  }

  if (!chatPartnerId.value) {
    alert('Selecciona un empleado para chatear')
    return
  }

  sendingMessage.value = true
  autoScrollEnabled.value = true
  
  // CORREGIDO: Enviar mensaje es una interacción
  trackUserInteraction()
  
  try {
    const messageData = {
      content: newMessage.value.trim(),
      senderId: currentUserId.value,
      receiverId: chatPartnerId.value
    }
    
    await api.post('/messages', messageData)
    newMessage.value = ''
    scrollToBottom()
    
  } catch (error) {
    console.error('Error enviando mensaje:', error)
    alert('Error enviando mensaje: ' + error.message)
  } finally {
    sendingMessage.value = false
  }
}

// Lifecycle
onMounted(async () => {
  let removeVisibilityListener = () => {}
  
  setupMessageListener()
  setupStatusListeners()
  setupViewingStatusListeners()
  removeVisibilityListener = setupPageVisibilityListener()
  
  const waitForConnection = () => {
    return new Promise((resolve) => {
      if (store.isSocketConnected) {
        resolve()
      } else {
        const interval = setInterval(() => {
          if (store.isSocketConnected) {
            clearInterval(interval)
            resolve()
          }
        }, 100)
      }
    })
  }
  
  await waitForConnection()
  
  // Configurar observador de visibilidad después de que el DOM esté listo
  nextTick(() => {
    setupVisibilityObserver()
  })
  
  if (props.isAdmin) {
    await loadEmployees()
  } else {
    await loadMessages()
    // CORREGIDO: No notificar automáticamente que está viendo
    // Esperar a que el empleado interactúe con el chat
  }
  
  // Limpiar listener al desmontar
  onUnmounted(() => {
    removeVisibilityListener()
  })
})

onUnmounted(() => {
  if (store.socket) {
    store.socket.off('newMessage', handleIncomingMessage)
    store.socket.off('chatViewingStatus')
  }
  
  if (visibilityObserver.value) {
    visibilityObserver.value.disconnect()
  }
  
  // Notificar que dejó de ver el chat actual
  if (chatPartnerId.value) {
    store.setChatViewingStatus(chatPartnerId.value, false)
  }
  
  // Limpiar todos los timers
  clearTimeout(scrollDebounceTimer)
  clearTimeout(visibilityDebounceTimer)
  clearTimeout(markReadDebounceTimer)
  clearTimeout(interactionTimer)
})

// Watchers
watch(filteredMessages, () => {
  if (autoScrollEnabled.value) {
    scrollToBottom()
  }
  
  // Marcar mensajes visibles como leídos solo si estamos viendo el chat (solo del partner)
  if (isAtBottom.value && isUserViewingThisChat.value) {
    clearTimeout(markReadDebounceTimer)
    markReadDebounceTimer = setTimeout(() => {
      markVisibleMessagesAsRead()
    }, 2000)
  }
})

// Watcher para cuando el chat se vuelve visible
watch(isUserViewingThisChat, (isViewing) => {
  if (chatPartnerId.value) {
    console.log(`🔄 Usuario ${isViewing ? 'viendo' : 'dejó de ver'} chat con ${chatPartnerId.value}`)
    
    if (isViewing) {
      store.setChatViewingStatus(chatPartnerId.value, true)
      // Al volver a ver el chat, marcar mensajes visibles como leídos después de delay (solo del partner)
      clearTimeout(markReadDebounceTimer)
      markReadDebounceTimer = setTimeout(() => {
        markVisibleMessagesAsRead()
      }, 2500)
    } else {
      store.setChatViewingStatus(chatPartnerId.value, false)
    }
  }
})

watch(() => store.isSocketConnected, (connected) => {
  if (connected) {
    setupMessageListener()
    setupStatusListeners()
    setupViewingStatusListeners()
  }
})

watch(selectedEmployee, (newEmployee, oldEmployee) => {
  autoScrollEnabled.value = true
  setupMessageListener()
})

watch(() => store.getUnreadCountFromUser(chatPartnerId.value), (newCount) => {
  if (newCount > 0 && isAtBottom.value && isUserViewingThisChat.value) {
    clearTimeout(markReadDebounceTimer)
    markReadDebounceTimer = setTimeout(() => {
      markVisibleMessagesAsRead()
    }, 2000)
  }
})
</script>

<style scoped>
.chat-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Employee List Styles - DISEÑO MEJORADO */
.employee-list-container {
  flex: 1;
  min-height: 300px;
  max-height: 400px;
}

.employee-list-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.employee-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}

.employee-list {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.employee-list-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.3s ease;
  min-height: 80px;
  display: flex;
  align-items: center;
}

.employee-list-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.employee-list-item.selected-employee {
  background-color: rgba(25, 118, 210, 0.08);
  border-left: 4px solid #1976d2;
}

.employee-list-item.has-unread {
  border-left: 4px solid #ff4444;
}

.employee-avatar-container {
  position: relative;
  margin-right: 12px;
}

.employee-name {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
}

.employee-status {
  font-size: 0.875rem;
  opacity: 0.8;
}

.employee-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  margin-left: auto;
  padding-left: 12px;
}

.unread-badge {
  flex-shrink: 0;
}

.last-message-time {
  font-size: 0.75rem;
  color: #666;
  white-space: nowrap;
}

/* Chat Area Styles */
.chat-area {
  height: 500px;
  display: flex;
  flex-direction: column;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  flex-shrink: 0;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  min-height: 64px;
  flex-shrink: 0;
}

.chat-partner-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.partner-avatar-container {
  position: relative;
}

.partner-details {
  flex: 1;
  min-width: 0;
}

.partner-name {
  font-weight: 500;
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.partner-status {
  font-size: 0.875rem;
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.viewing-text {
  color: green;
  font-weight: 500;
}

.viewing-indicator-header {
  position: absolute;
  bottom: -2px;
  right: -2px;
  background: white;
  border-radius: 50%;
  padding: 2px;
}

.mark-read-btn {
  flex-shrink: 0;
}

/* Messages Styles */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #fafafa;
  position: relative;
  min-height: 200px;
}

.empty-chat {
  text-align: center;
  padding: 48px 16px;
  color: #666;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.empty-title {
  margin-top: 12px;
  font-weight: 500;
}

.empty-subtitle {
  font-size: 0.875rem;
  margin-top: 4px;
}

.message {
  margin-bottom: 16px;
  max-width: 85%;
}

.message.sent {
  margin-left: auto;
  text-align: right;
}

.message.received {
  margin-right: auto;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 18px;
  display: inline-block;
  max-width: 100%;
  word-wrap: break-word;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.message.sent .message-bubble {
  background-color: #1976d2;
  color: white;
  border-bottom-right-radius: 4px;
}

.message.received .message-bubble {
  background-color: #ffffff;
  color: #333;
  border: 1px solid #e0e0e0;
  border-bottom-left-radius: 4px;
}

.message-content {
  line-height: 1.4;
  word-break: break-word;
}

.message-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 4px;
  opacity: 0.8;
}

.message-time {
  font-size: 0.75rem;
}

.message.sent .message-time {
  color: rgba(255, 255, 255, 0.8);
}

.message.received .message-time {
  color: #666;
}

.message-status {
  display: flex;
  align-items: center;
}

.viewing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: orange;
  margin-top: 2px;
  text-align: right;
}

.read-indicator {
  text-align: right;
  margin-top: 2px;
  font-size: 0.75rem;
  color: #1976d2;
}

.new-messages-indicator {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  cursor: pointer;
  z-index: 10;
}

.new-messages-indicator:hover {
  opacity: 0.9;
}

/* Input Area Styles */
.message-input-area {
  padding: 12px 16px;
  background: white;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.message-input {
  font-size: 0.9rem;
}

.connection-status {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  color: #666;
  margin-top: 4px;
  padding: 0 8px;
}

.status-icon {
  margin-right: 4px;
}

/* No Selection State */
.no-selection-state {
  text-align: center;
  padding: 48px 16px;
  color: #666;
  height: 400px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.no-selection-text {
  margin-top: 12px;
  font-weight: 500;
}

/* Status Badge */
.status-badge {
  position: absolute;
  bottom: 2px;
  right: 2px;
  transform: scale(0.9);
}

.status-badge :deep(.v-badge__badge) {
  border: 2px solid white;
  min-width: 12px;
  height: 12px;
  border-radius: 50%;
}

.avatar-text {
  font-weight: 600;
  font-size: 0.9rem;
  letter-spacing: 0.5px;
}

/* Scrollbar mejorado */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.employee-list::-webkit-scrollbar {
  width: 4px;
}

.employee-list::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.employee-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}
</style>