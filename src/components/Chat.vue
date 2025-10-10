<template>
  <div>
    <v-list v-if="isAdmin" class="mb-4">
      <v-list-item
        v-for="employee in employees"
        :key="employee.id"
        @click="selectEmployee(employee)"
        :class="{ 'bg-blue-lighten-5': selectedEmployee?.id === employee.id }"
      >
        <v-list-item-title>{{ employee.name }}</v-list-item-title>
      </v-list-item>
    </v-list>

    <div v-if="(!isAdmin || selectedEmployee)" class="chat-container">
      <div class="messages-container" ref="messagesContainer">
        <div
          v-for="message in filteredMessages"
          :key="message.id"
          :class="['message', message.senderId === currentUserId ? 'sent' : 'received']"
        >
          <div class="message-content">{{ message.content }}</div>
          <div class="message-time">{{ formatTime(message.timestamp) }}</div>
        </div>
      </div>
      
      <v-text-field
        v-model="newMessage"
        placeholder="Escribe un mensaje..."
        @keypress.enter="sendMessage"
        append-inner-icon="mdi-send"
        @click:append-inner="sendMessage"
        hide-details
        density="compact"
      ></v-text-field>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useAppStore } from '../stores/app.js'
import { api } from '../services/api.js'

const props = defineProps(['isAdmin'])
const store = useAppStore()
const employees = ref([])
const selectedEmployee = ref(null)
const newMessage = ref('')
const messagesContainer = ref(null)

const currentUserId = computed(() => store.user?.id)
const chatPartnerId = computed(() => props.isAdmin ? selectedEmployee.value?.id : 1) // Admin ID hardcodeado

const filteredMessages = computed(() => {
  return store.messages.filter(msg => 
    (msg.senderId === currentUserId.value && msg.receiverId === chatPartnerId.value) ||
    (msg.senderId === chatPartnerId.value && msg.receiverId === currentUserId.value)
  )
})

onMounted(async () => {
  if (props.isAdmin) {
    await loadEmployees()
  } else {
    await loadMessages()
  }
  
  if (store.socket) {
    store.socket.on('newMessage', (message) => {
      store.messages.push(message)
      scrollToBottom()
    })
  }
})

const loadEmployees = async () => {
  employees.value = await api.get('/users')
}

const loadMessages = async () => {
  const messages = await api.get(`/messages/${store.user.id}`)
  store.setMessages(messages)
}

const selectEmployee = async (employee) => {
  selectedEmployee.value = employee
  await loadMessages()
}

const sendMessage = async () => {
  if (!newMessage.value.trim()) return

  const message = await api.post('/messages', {
    content: newMessage.value,
    senderId: currentUserId.value,
    receiverId: chatPartnerId.value
  })

  newMessage.value = ''
  scrollToBottom()
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

watch(filteredMessages, scrollToBottom)
</script>

<style scoped>
.chat-container {
  height: 400px;
  display: flex;
  flex-direction: column;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.message {
  margin-bottom: 8px;
  max-width: 80%;
}

.message.sent {
  margin-left: auto;
  text-align: right;
}

.message.received {
  margin-right: auto;
}

.message-content {
  padding: 8px 12px;
  border-radius: 12px;
  display: inline-block;
}

.message.sent .message-content {
  background-color: #1976d2;
  color: white;
}

.message.received .message-content {
  background-color: #f5f5f5;
  color: black;
}

.message-time {
  font-size: 0.75rem;
  color: #666;
  margin-top: 2px;
}
</style>