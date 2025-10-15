import { io } from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
    this.connectionAttempts = 0
    this.maxConnectionAttempts = 5
  }

  connect() {
    console.log('🔌 Conectando al servidor Socket.io...')
    
    this.socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnectionAttempts: this.maxConnectionAttempts,
      reconnectionDelay: 1000,
    })
    
    this.socket.on('connect', () => {
      console.log('✅ Conectado al servidor Socket.io')
      this.connectionAttempts = 0
    })
    
    this.socket.on('disconnect', (reason) => {
      console.log('❌ Desconectado del servidor:', reason)
    })
    
    this.socket.on('connect_error', (error) => {
      this.connectionAttempts++
      console.log(`❌ Error de conexión (${this.connectionAttempts}/${this.maxConnectionAttempts}):`, error.message)
    })
    
    this.socket.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Intentando reconectar (${attempt}/${this.maxConnectionAttempts})...`)
    })
    
    this.socket.on('reconnect', (attempt) => {
      console.log(`✅ Reconectado después de ${attempt} intentos`)
    })
    
    this.socket.on('reconnect_error', (error) => {
      console.log('❌ Error en reconexión:', error)
    })
    
    this.socket.on('reconnect_failed', () => {
      console.log('❌ Falló la reconexión después de todos los intentos')
    })
    
    return this.socket
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Desconectando socket...')
      this.socket.disconnect()
      this.socket = null
    }
  }

  getSocket() {
    return this.socket
  }
}

export default new SocketService()