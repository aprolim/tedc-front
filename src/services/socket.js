import { io } from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
  }

  connect() {
    this.socket = io('http://localhost:3000')
    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
    }
  }
}

export default new SocketService()