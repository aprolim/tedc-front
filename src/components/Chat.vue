<template>
  <div class="chat-wrapper">
    <!-- Lista de empleados (solo admin) -->
    <div v-if="isAdmin" class="employee-list-container">
      <v-list class="mb-4">
        <v-list-subheader class="d-flex justify-space-between">
          <span>Empleados del equipo</span>
          <span class="text-caption" :class="onlineCount > 0 ? 'text-green' : 'text-grey'">
            {{ onlineCount }} en línea
          </span>
        </v-list-subheader>
        
        <v-list-item
          v-for="employee in sortedEmployees"
          :key="employee.id"
          @click="selectEmployee(employee)"
          :class="{ 
            'bg-blue-lighten-5': selectedEmployee?.id === employee.id,
            'border-left-primary': hasUnreadMessages(employee.id)
          }"
          class="border-left-4 employee-item"
        >
          <div class="employee-avatar-container">
            <v-avatar color="primary" size="44">
              <span class="text-white avatar-text">{{ getInitials(employee.name) }}</span>
            </v-avatar>
            <v-badge
              :color="getUserStatusColor(employee.id)"
              dot
              class="status-badge"
              bordered
            />
          </div>

          <div class="employee-info">
            <div class="employee-name">
              {{ employee.name }}
              <v-icon v-if="hasUnreadMessages(employee.id)" color="primary" size="small" class="ml-1">
                mdi-message-alert
              </v-icon>
            </div>
            <div class="employee-status" :class="getUserStatusTextColor(employee.id)">
              {{ getUserStatusText(employee.id) }}
              <span v-if="getLastMessagePreview(employee.id)" class="message-preview">
                • {{ getLastMessagePreview(employee.id) }}
              </span>
            </div>
          </div>

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
        </v-list-item>
      </v-list>
    </div>

    <!-- Área de chat -->
    <div v-if="(!isAdmin || selectedEmployee)" class="chat-area">
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
          </div>
          <div class="partner-details">
            <div class="partner-name">
              {{ isAdmin ? selectedEmployee?.name : 'Administrador' }}
            </div>
            <div class="partner-status" :class="getUserStatusTextColor(chatPartnerId)">
              {{ getUserStatusText(chatPartnerId) }}
            </div>
          </div>
        </div>

        <v-btn 
          v-if="hasUnreadMessages(chatPartnerId)"
          icon 
          size="small"
          @click="markVisibleAsRead"
          :loading="markingAsRead"
          title="Marcar mensajes visibles como leídos"
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
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useAppStore } from '../stores/app.js'
import { api } from '../services/api.js'

const props = defineProps(['isAdmin'])
const store = useAppStore()

// Reactive data
const employees = ref([])
const selectedEmployee = ref(null)
const newMessage = ref('')
const messagesContainer = ref(null)
const sendingMessage = ref(false)
const markingAsRead = ref(false)
const isAtBottom = ref(true)
const autoScrollEnabled = ref(true)

// Computed properties
const currentUserId = computed(() => store.user?.id)
const chatPartnerId = computed(() => props.isAdmin ? selectedEmployee.value?.id : 1)

const onlineCount = computed(() => {
  return Object.values(store.onlineUsers).filter(user => user.status === 'online').length
})

const unreadMessagesCount = computed(() => {
  if (!chatPartnerId.value) return 0
  return getVisibleUnreadMessageIds().length
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

// Message helpers
const getVisibleUnreadMessageIds = () => {
  if (!chatPartnerId.value) return []
  
  return filteredMessages.value
    .filter(msg => 
      msg.senderId === chatPartnerId.value && 
      msg.receiverId === currentUserId.value &&
      !msg.read
    )
    .map(msg => msg.id)
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

// Core functionality
const markVisibleAsRead = async () => {
  const unreadMessageIds = getVisibleUnreadMessageIds()
  if (unreadMessageIds.length > 0 && chatPartnerId.value) {
    markingAsRead.value = true
    console.log(`📖 Marcando ${unreadMessageIds.length} mensajes visibles como leídos`)
    
    try {
      await store.markMessagesAsRead(chatPartnerId.value, unreadMessageIds)
    } catch (error) {
      console.error('Error marcando mensajes como leídos:', error)
    } finally {
      markingAsRead.value = false
    }
  }
}

const onMessagesScroll = () => {
  if (messagesContainer.value) {
    const container = messagesContainer.value
    const scrollPosition = container.scrollTop + container.clientHeight
    const scrollThreshold = container.scrollHeight - 50
    
    isAtBottom.value = scrollPosition >= scrollThreshold
    
    if (isAtBottom.value) {
      markVisibleAsRead()
    }
  }
}

const scrollToBottomAndMarkRead = () => {
  scrollToBottom()
  setTimeout(() => {
    markVisibleAsRead()
  }, 300)
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

// Message handling
const handleIncomingMessage = (message) => {
  console.log('📨 Mensaje entrante en chat:', message)
  
  const isRelevantForCurrentUser = 
    message.receiverId === currentUserId.value || 
    message.senderId === currentUserId.value
  
  if (!isRelevantForCurrentUser) return
  
  if (message.receiverId === currentUserId.value && 
      message.senderId === chatPartnerId.value) {
    
    setTimeout(() => {
      store.markMessagesAsRead(message.senderId, [message.id])
    }, 200)
  }
  
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
      setTimeout(() => {
        markVisibleAsRead()
      }, 200)
    }, 100)
    
  } catch (error) {
    console.error('Error cargando mensajes:', error)
  }
}

const selectEmployee = async (employee) => {
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
  
  if (props.isAdmin) {
    await loadEmployees()
  } else {
    await loadMessages()
  }
})

import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (store.socket) {
    store.socket.off('newMessage', handleIncomingMessage)
  }
})

// Watchers
watch(filteredMessages, () => {
  if (autoScrollEnabled.value) {
    scrollToBottom()
  }
  
  if (isAtBottom.value) {
    markVisibleAsRead()
  }
})

watch(() => store.isSocketConnected, (connected) => {
  if (connected) {
    setupMessageListener()
  }
})

watch(selectedEmployee, () => {
  autoScrollEnabled.value = true
  setupMessageListener()
})

watch(() => store.getUnreadCountFromUser(chatPartnerId.value), (newCount) => {
  if (newCount > 0 && isAtBottom.value) {
    markVisibleAsRead()
  }
})
</script>

<style scoped>
.chat-wrapper {
  height: 100%;
}

/* Employee List Styles */
.employee-list-container {
  max-height: 400px;
  overflow-y: auto;
}

.employee-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.employee-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.employee-avatar-container {
  position: relative;
  flex-shrink: 0;
}

.employee-info {
  flex: 1;
  min-width: 0;
}

.employee-name {
  font-weight: 500;
  display: flex;
  align-items: center;
}

.employee-status {
  font-size: 0.875rem;
  margin-top: 2px;
}

.message-preview {
  color: #666;
}

.employee-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.unread-badge {
  flex-shrink: 0;
}

.last-message-time {
  font-size: 0.75rem;
  color: #666;
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
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  min-height: 64px;
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
}

.partner-name {
  font-weight: 500;
  font-size: 1rem;
}

.partner-status {
  font-size: 0.875rem;
  margin-top: 2px;
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
}

.empty-chat {
  text-align: center;
  padding: 48px 16px;
  color: #666;
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
  padding: 8px 16px;
  background: white;
  border-top: 1px solid #e0e0e0;
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

.border-left-primary {
  border-left: 4px solid #1976d2 !important;
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
</style>