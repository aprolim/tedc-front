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
              <span v-else-if="store.isUserOnline(chatPartnerId)" class="online-text">
                • En línea
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
                  v-else-if="isPartnerViewingChat && store.isUserOnline(chatPartnerId)"
                  size="14" 
                  color="green"
                  title="Viendo..."
                >mdi-eye</v-icon>
                <v-icon 
                  v-else 
                  size="14" 
                  color="grey"
                  title="Enviado"
                >mdi-check</v-icon>
              </div>
            </div>
          </div>
          
          <!-- Estados de los mensajes -->
          <div 
            v-if="message.senderId === currentUserId && 
                  !message.read && 
                  isPartnerViewingChat && 
                  store.isUserOnline(chatPartnerId)"
            class="viewing-indicator"
          >
            <v-icon size="12" color="green">mdi-eye</v-icon>
            <span>Viendo...</span>
          </div>
          
          <div v-if="message.senderId === currentUserId && message.read" class="read-indicator">
            <v-icon size="12" color="blue-darken-2">mdi-check-all</v-icon>
            <span>Leído {{ formatReadTime(message.readAt) }}</span>
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

// Estados para controlar interacción real
const userInteractedWithChat = ref(false)
const lastInteractionTime = ref(null)
const partnerViewingTimeout = ref(null)

// Debounce timers
let scrollDebounceTimer = null
let visibilityDebounceTimer = null
let markReadDebounceTimer = null
let interactionTimer = null

let removeVisibilityListener = () => {}

// Computed properties
const currentUserId = computed(() => store.user?.id)
const chatPartnerId = computed(() => props.isAdmin ? selectedEmployee.value?.id : 1)

// ✅ CORREGIDO: Solo contar empleados en línea (excluyendo admin)
const onlineCount = computed(() => {
  if (props.isAdmin) {
    return store.onlineEmployeesCount
  } else {
    // Para empleados, contar admin si está en línea
    return store.isUserOnline(1) ? 1 : 0
  }
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

// Computed para saber si el usuario está viendo ESTE chat específico
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

// Message helpers - Solo mensajes del partner que no he leído
const getVisibleUnreadMessageIds = () => {
  if (!chatPartnerId.value || !messagesContainer.value) return []
  
  const container = messagesContainer.value
  const visibleMessages = []
  
  // Obtener todos los elementos de mensaje
  const messageElements = container.querySelectorAll('.message')
  
  messageElements.forEach(element => {
    const rect = element.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    
    // Criterio más permisivo de visibilidad - mensaje parcialmente visible
    const isVisible = (
      rect.top <= containerRect.bottom && 
      rect.bottom >= containerRect.top &&
      rect.height > 0
    )
    
    if (isVisible) {
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

// ✅ CORREGIDO: Marcar mensajes visibles como leídos - MÁS EFECTIVO
const markVisibleMessagesAsRead = async () => {
  // Condiciones más permisivas
  if (document.visibilityState !== 'visible') {
    console.log('🚫 No marcar como leído: página no visible')
    return
  }
  
  // IMPORTANTE: Solo marcar mensajes del PARTNER como leídos
  const visibleUnreadIds = getVisibleUnreadMessageIds()
  
  if (visibleUnreadIds.length > 0 && chatPartnerId.value) {
    console.log(`✅ Marcando ${visibleUnreadIds.length} mensajes DEL PARTNER como LEÍDOS`)
    
    try {
      // Esto notificará al partner que hemos leído sus mensajes
      await store.markMessagesAsRead(chatPartnerId.value, visibleUnreadIds)
      
      // Actualizar estado local inmediatamente para mejor UX
      visibleUnreadIds.forEach(messageId => {
        const message = store.messages.find(msg => msg.id === messageId)
        if (message && !message.read) {
          message.read = true
          message.readAt = new Date()
          console.log(`✅ Mensaje ${messageId} marcado como LEÍDO localmente`)
        }
      })
      
    } catch (error) {
      console.error('Error marcando mensajes del partner como leídos:', error)
    }
  }
}

// Marcar todos los mensajes como leídos (solo del partner)
const markAllAsRead = async () => {
  if (!chatPartnerId.value) return
  
  // SOLO mensajes del partner que no he leído
  const allUnreadIds = store.getUnreadMessagesFromUser(chatPartnerId.value).map(msg => msg.id)
  if (allUnreadIds.length > 0) {
    markingAsRead.value = true
    console.log(`📖 Marcando TODOS los mensajes DEL PARTNER (${allUnreadIds.length}) como LEÍDOS`)
    
    try {
      await store.markMessagesAsRead(chatPartnerId.value, allUnreadIds)
    } catch (error) {
      console.error('Error marcando todos los mensajes del partner como leídos:', error)
    } finally {
      markingAsRead.value = false
    }
  }
}

// ✅ MEJORADO: Trackear interacción del usuario de forma más agresiva
const trackUserInteraction = () => {
  userInteractedWithChat.value = true
  lastInteractionTime.value = Date.now()
  
  // Notificar inmediatamente que estamos viendo el chat
  if (chatPartnerId.value && isChatVisible.value) {
    store.setChatViewingStatus(chatPartnerId.value, true)
    isPartnerViewingChat.value = true
  }
  
  // Resetear el timer de interacción
  clearTimeout(interactionTimer)
  interactionTimer = setTimeout(() => {
    userInteractedWithChat.value = false
    console.log('⏰ Interacción del usuario expirada')
  }, 30000)
}

// ✅ MEJORADO: Función para manejar cuando el partner deja de ver el chat
const handlePartnerStoppedViewing = () => {
  if (isPartnerViewingChat.value) {
    console.log(`👋 Partner ${chatPartnerId.value} dejó de ver el chat`)
    isPartnerViewingChat.value = false
    store.setChatViewingStatus(chatPartnerId.value, false)
  }
}

const onMessagesScroll = () => {
  if (messagesContainer.value) {
    const container = messagesContainer.value
    const scrollPosition = container.scrollTop + container.clientHeight
    const scrollThreshold = container.scrollHeight - 50
    
    isAtBottom.value = scrollPosition >= scrollThreshold
    
    // Trackear scroll como interacción
    trackUserInteraction()
    
    // ✅ MEJORADO: Marcar mensajes visibles inmediatamente al hacer scroll
    if (document.visibilityState === 'visible') {
      clearTimeout(scrollDebounceTimer)
      scrollDebounceTimer = setTimeout(() => {
        markVisibleMessagesAsRead()
      }, 500) // Delay más corto
    }
  }
}

const scrollToBottomAndMarkRead = () => {
  scrollToBottom()
  trackUserInteraction()
  setTimeout(() => {
    markVisibleMessagesAsRead()
  }, 300) // Delay más corto
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

// ✅ MEJORADO: Observador de visibilidad del chat - MÁS SENSIBLE
const setupVisibilityObserver = () => {
  if (!chatArea.value) return
  
  visibilityObserver.value = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const wasVisible = isChatVisible.value
      isChatVisible.value = entry.isIntersecting
      
      console.log(`📱 Chat ${entry.isIntersecting ? 'visible' : 'oculto'} - Viendo chat: ${isUserViewingThisChat.value}`)
      
      clearTimeout(visibilityDebounceTimer)
      visibilityDebounceTimer = setTimeout(() => {
        if (entry.isIntersecting && chatPartnerId.value && document.visibilityState === 'visible') {
          // Notificar que está viendo el chat
          store.setChatViewingStatus(chatPartnerId.value, true)
          isPartnerViewingChat.value = true
          
          // ✅ MEJORADO: Marcar mensajes como leídos más rápido
          clearTimeout(markReadDebounceTimer)
          markReadDebounceTimer = setTimeout(() => {
            markVisibleMessagesAsRead()
          }, 800) // Delay más corto
          
          // Configurar timeout para cuando deje de ver
          clearTimeout(partnerViewingTimeout.value)
          partnerViewingTimeout.value = setTimeout(() => {
            handlePartnerStoppedViewing()
          }, 5000) // 5 segundos de inactividad
          
        } else if (chatPartnerId.value && wasVisible && !entry.isIntersecting) {
          // Notificar que dejó de ver el chat
          console.log(`🚫 Usuario dejó de ver el chat con ${chatPartnerId.value}`)
          handlePartnerStoppedViewing()
        }
      }, 200)
    })
  }, {
    threshold: 0.3 // Menos estricto para mejor detección
  })
  
  visibilityObserver.value.observe(chatArea.value)
}

// ✅ MEJORADO: Listener para cambios de visibilidad de la página
const setupPageVisibilityListener = () => {
  const handleVisibilityChange = () => {
    console.log(`📄 Visibilidad de página: ${document.visibilityState}`)
    
    if (document.visibilityState === 'hidden') {
      userInteractedWithChat.value = false
      if (chatPartnerId.value) {
        handlePartnerStoppedViewing()
      }
    } else if (document.visibilityState === 'visible' && isChatVisible.value && chatPartnerId.value) {
      // Al volver a la página, notificar que está viendo
      store.setChatViewingStatus(chatPartnerId.value, true)
      isPartnerViewingChat.value = true
      
      // Marcar mensajes como leídos después de un delay
      setTimeout(() => {
        markVisibleMessagesAsRead()
      }, 1000)
    }
    
    clearTimeout(visibilityDebounceTimer)
    visibilityDebounceTimer = setTimeout(() => {
      if (document.visibilityState === 'hidden' && chatPartnerId.value) {
        console.log(`🚫 Página oculta - dejando de ver chat con ${chatPartnerId.value}`)
        handlePartnerStoppedViewing()
      }
    }, 200)
  }
  
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  // ✅ MEJORADO: Trackear clicks y teclas en el chat de forma más agresiva
  const trackInteraction = () => {
    if (isChatVisible.value && document.visibilityState === 'visible') {
      trackUserInteraction()
      
      if (chatPartnerId.value) {
        store.setChatViewingStatus(chatPartnerId.value, true)
        isPartnerViewingChat.value = true
        
        // Reiniciar el timeout de "dejar de ver"
        clearTimeout(partnerViewingTimeout.value)
        partnerViewingTimeout.value = setTimeout(() => {
          handlePartnerStoppedViewing()
        }, 5000)
        
        // Marcar mensajes como leídos inmediatamente al interactuar
        setTimeout(() => {
          markVisibleMessagesAsRead()
        }, 500)
      }
    }
  }
  
  // Agregar event listeners más amplios
  document.addEventListener('click', trackInteraction)
  document.addEventListener('keydown', trackInteraction)
  document.addEventListener('mousemove', trackInteraction)
  document.addEventListener('touchstart', trackInteraction)
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    document.removeEventListener('click', trackInteraction)
    document.removeEventListener('keydown', trackInteraction)
    document.removeEventListener('mousemove', trackInteraction)
    document.removeEventListener('touchstart', trackInteraction)
  }
}

// ✅ MEJORADO: Handler para mensajes entrantes con notificaciones
const handleIncomingMessage = (message) => {
  console.log('📨 Mensaje entrante en chat:', message)
  
  const isRelevantForCurrentUser = 
    message.receiverId === currentUserId.value || 
    message.senderId === currentUserId.value
  
  if (!isRelevantForCurrentUser) return
  
  console.log('💡 Mensaje recibido, se marcará como leído cuando sea visible')
  
  // ✅ NUEVO: Mostrar notificación si el mensaje es para el usuario actual
  if (message.receiverId === currentUserId.value && document.visibilityState !== 'visible') {
    console.log('🔔 Mostrando notificación de mensaje nuevo')
    
    // Obtener nombre del remitente
    let senderName = 'Administrador'
    if (props.isAdmin && selectedEmployee.value) {
      senderName = selectedEmployee.value.name
    } else if (!props.isAdmin && message.senderId !== 1) {
      // Buscar nombre del empleado que envió el mensaje
      const employee = employees.value.find(emp => emp.id === message.senderId)
      senderName = employee?.name || 'Empleado'
    }
    
    // Mostrar notificación
    store.showNewMessageNotification(senderName, message.content)
  }
  
  if (isAtBottom.value) {
    setTimeout(() => {
      scrollToBottom()
    }, 100)
  }
}

// Listener para cuando el partner marca mensajes como leídos
const setupMessagesReadListener = () => {
  if (store.socket) {
    store.socket.on('messagesRead', (data) => {
      console.log('📖 Mensajes marcados como leídos por el partner:', data)
      
      if (data.readerId === chatPartnerId.value) {
        let markedCount = 0
        store.messages.forEach(msg => {
          if (Array.isArray(data.messageIds) && data.messageIds.includes(msg.id)) {
            if (!msg.read) {
              msg.read = true
              msg.readAt = new Date()
              markedCount++
              console.log(`✅ Mensaje ${msg.id} marcado como LEÍDO por el partner`)
            }
          }
        })
        console.log(`✅ Total de mensajes marcados como leídos: ${markedCount}`)
      }
    })
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

// ✅ MEJORADO: Setup de listeners de estado del partner
const setupViewingStatusListeners = () => {
  if (store.socket) {
    store.socket.on('chatViewingStatus', (data) => {
      // console.log('👀 Estado de visualización recibido:', data)
      
      if (data.userId === chatPartnerId.value) {
        isPartnerViewingChat.value = data.isViewing
        // console.log(`🔄 Partner ${data.userId} ${data.isViewing ? 'está viendo' : 'dejó de ver'} el chat`)
        
        if (!data.isViewing) {
          clearTimeout(partnerViewingTimeout.value)
        }
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
      // ✅ MEJORADO: Marcar mensajes como leídos inmediatamente al cargar
      setTimeout(() => {
        markVisibleMessagesAsRead()
      }, 1000)
    }, 100)
    
  } catch (error) {
    console.error('Error cargando mensajes:', error)
  }
}

// Al seleccionar empleado
const selectEmployee = async (employee) => {
  if (selectedEmployee.value) {
    store.setChatViewingStatus(selectedEmployee.value.id, false)
  }
  
  isPartnerViewingChat.value = false
  userInteractedWithChat.value = false
  clearTimeout(partnerViewingTimeout.value)
  
  selectedEmployee.value = employee
  autoScrollEnabled.value = true
  setupMessageListener()
  
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
  setupMessageListener()
  setupStatusListeners()
  setupViewingStatusListeners()
  setupMessagesReadListener()
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
  
  nextTick(() => {
    setupVisibilityObserver()
  })
  
  if (props.isAdmin) {
    await loadEmployees()
  } else {
    await loadMessages()
  }
})

onUnmounted(() => {
  removeVisibilityListener()
  
  if (store.socket) {
    store.socket.off('newMessage', handleIncomingMessage)
    store.socket.off('chatViewingStatus')
    store.socket.off('messagesRead')
  }
  
  if (visibilityObserver.value) {
    visibilityObserver.value.disconnect()
  }
  
  if (chatPartnerId.value) {
    store.setChatViewingStatus(chatPartnerId.value, false)
  }
  
  clearTimeout(scrollDebounceTimer)
  clearTimeout(visibilityDebounceTimer)
  clearTimeout(markReadDebounceTimer)
  clearTimeout(interactionTimer)
  clearTimeout(partnerViewingTimeout.value)
})

// Watchers
watch(filteredMessages, () => {
  if (autoScrollEnabled.value) {
    scrollToBottom()
  }
  
  if (isAtBottom.value && isChatVisible.value && document.visibilityState === 'visible') {
    clearTimeout(markReadDebounceTimer)
    markReadDebounceTimer = setTimeout(() => {
      markVisibleMessagesAsRead()
    }, 800)
  }
})

watch(isUserViewingThisChat, (isViewing) => {
  if (chatPartnerId.value) {
    console.log(`🔄 Usuario ${isViewing ? 'viendo' : 'dejó de ver'} chat con ${chatPartnerId.value}`)
    
    if (isViewing) {
      store.setChatViewingStatus(chatPartnerId.value, true)
      clearTimeout(markReadDebounceTimer)
      markReadDebounceTimer = setTimeout(() => {
        markVisibleMessagesAsRead()
      }, 1000)
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
    setupMessagesReadListener()
  }
})

watch(selectedEmployee, (newEmployee, oldEmployee) => {
  autoScrollEnabled.value = true
  setupMessageListener()
})

watch(() => store.getUnreadCountFromUser(chatPartnerId.value), (newCount) => {
  if (newCount > 0 && isAtBottom.value && isChatVisible.value && document.visibilityState === 'visible') {
    clearTimeout(markReadDebounceTimer)
    markReadDebounceTimer = setTimeout(() => {
      markVisibleMessagesAsRead()
    }, 800)
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

/* Employee List Styles */
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

.online-text {
  color: #666;
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

/* Estados de mensajes */
.viewing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: green;
  margin-top: 2px;
  text-align: right;
}

.sent-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: grey;
  margin-top: 2px;
  text-align: right;
}

.read-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: #1976d2;
  margin-top: 2px;
  text-align: right;
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

/* Scrollbar */
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