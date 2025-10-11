import { io } from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
  }

  connect() {
    this.socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling']
    })
    
    this.socket.on('connect', () => {
      console.log('✅ Conectado al servidor Socket.io')
    })
    
    this.socket.on('disconnect', () => {
      console.log('❌ Desconectado del servidor')
    })
    
    this.socket.on('connect_error', (error) => {
      console.log('❌ Error de conexión:', error)
    })
    
    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
    }
  }
}

export default new SocketService()