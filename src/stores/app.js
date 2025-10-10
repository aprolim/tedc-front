import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const user = ref(null)
  const tasks = ref([])
  const messages = ref([])
  const userLocations = ref({})
  const socket = ref(null)

  const setUser = (userData) => {
    user.value = userData
  }

  const setTasks = (tasksData) => {
    tasks.value = tasksData
  }

  const setMessages = (messagesData) => {
    messages.value = messagesData
  }

  const setSocket = (socketInstance) => {
    socket.value = socketInstance
  }

  const updateUserLocation = (data) => {
    userLocations.value[data.userId] = data.location
  }

  return {
    user,
    tasks,
    messages,
    userLocations,
    socket,
    setUser,
    setTasks,
    setMessages,
    setSocket,
    updateUserLocation
  }
})