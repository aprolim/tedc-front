// src/services/notifications.js

class NotificationService {
  constructor() {
    this.permission = null
    this.isSupported = 'Notification' in window
    this.init()
  }

  async init() {
    if (!this.isSupported) {
      console.log('❌ Notificaciones no soportadas en este navegador')
      return
    }

    this.permission = Notification.permission
    
    if (this.permission === 'default') {
      console.log('🔔 Solicitar permiso para notificaciones')
    } else if (this.permission === 'granted') {
      console.log('✅ Permiso de notificaciones concedido')
    }
    
    // ✅ CORREGIDO: Registrar service worker para PWA
    this.registerServiceWorker()
  }

  // ✅ NUEVO: Registrar Service Worker
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })
        console.log('✅ Service Worker registrado:', registration)
      } catch (error) {
        console.log('❌ Service Worker no registrado:', error)
      }
    }
  }

  // ✅ Solicitar permiso para notificaciones
  async requestPermission() {
    if (!this.isSupported) return false

    try {
      this.permission = await Notification.requestPermission()
      console.log('🔔 Permiso de notificaciones:', this.permission)
      return this.permission === 'granted'
    } catch (error) {
      console.error('❌ Error solicitando permiso:', error)
      return false
    }
  }

  // ✅ Mostrar notificación
  async showNotification(title, options = {}) {
    if (!this.isSupported || this.permission !== 'granted') {
      console.log('🚫 Notificaciones no disponibles o permiso no concedido')
      return false
    }

    try {
      // Configuración por defecto
      const defaultOptions = {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        vibrate: [200, 100, 200], // Patrón de vibración
        requireInteraction: true, // Mantener visible hasta interacción
        tag: 'tareas-app', // Agrupar notificaciones
        renotify: true,
        silent: false,
        ...options
      }

      const notification = new Notification(title, defaultOptions)

      // Manejar clic en la notificación
      notification.onclick = () => {
        window.focus()
        notification.close()
        
        // Navegar a la app si está en otra pestaña
        if (options.url) {
          window.location.href = options.url
        }
      }

      // Cerrar automáticamente después de 10 segundos
      setTimeout(() => {
        notification.close()
      }, 10000)

      return true
    } catch (error) {
      console.error('❌ Error mostrando notificación:', error)
      return false
    }
  }

  // ✅ Notificación de nuevo mensaje (MUY LLAMATIVA)
  async showNewMessageNotification(senderName, message, messageCount = 1) {
    const title = messageCount > 1 
      ? `${messageCount} mensajes nuevos de ${senderName}`
      : `Nuevo mensaje de ${senderName}`

    const options = {
      body: message.length > 100 ? message.substring(0, 100) + '...' : message,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      image: '/pwa-192x192.png', // Imagen más grande
      vibrate: [300, 100, 300, 100, 300], // Vibración más larga
      requireInteraction: true, // Forzar interacción
      tag: 'new-message',
      renotify: true,
      silent: false,
      actions: [
        {
          action: 'open',
          title: 'Abrir Chat'
        },
        {
          action: 'dismiss',
          title: 'Cerrar'
        }
      ],
      data: {
        url: window.location.origin + (senderName === 'Administrador' ? '/employee' : '/admin'),
        timestamp: new Date().toISOString(),
        sender: senderName
      }
    }

    // ✅ CORREGIDO: Usar service worker si está disponible
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          payload: { title, options }
        })
        console.log('🔔 Notificación enviada al Service Worker')
        return true
      } catch (error) {
        console.log('⚠️ Fallback a Notification API:', error)
      }
    }

    // Fallback a Notification API estándar
    return await this.showNotification(title, options)
  }

  // ✅ Notificación de tarea asignada
  async showTaskAssignedNotification(taskTitle, assignedBy) {
    return await this.showNotification(
      'Nueva tarea asignada',
      {
        body: `"${taskTitle}" - Asignada por ${assignedBy}`,
        icon: '/pwa-192x192.png',
        vibrate: [200, 100, 200],
        tag: 'new-task',
        requireInteraction: false,
        data: {
          url: window.location.origin + '/employee',
          type: 'task'
        }
      }
    )
  }

  // ✅ Verificar si las notificaciones están soportadas y permitidas
  canNotify() {
    return this.isSupported && this.permission === 'granted'
  }

  // ✅ Obtener estado de permisos
  getPermissionStatus() {
    return this.permission
  }
}

// Exportar instancia singleton
export default new NotificationService()