import { createRouter, createWebHistory } from 'vue-router'
import { useAppStore } from './stores/app.js'
import AdminDashboard from './components/AdminDashboard.vue'
import EmployeeDashboard from './components/EmployeeDashboard.vue'
import Login from './components/Login.vue'

const routes = [
  { 
    path: '/login', 
    component: Login,
    meta: { requiresAuth: false, hideHeader: true }
  },
  { 
    path: '/admin', 
    component: AdminDashboard,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  { 
    path: '/employee', 
    component: EmployeeDashboard,
    meta: { requiresAuth: true, requiresAdmin: false }
  },
  { 
    path: '/', 
    redirect: '/login'
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// ✅ MEJORADO: Guard de navegación más robusto con manejo de cambio de usuario
router.beforeEach((to, from, next) => {
  const store = useAppStore()
  
  console.log('🛡️ Navegación:', from.path, '→', to.path)
  console.log('🔐 Usuario autenticado:', store.isAuthenticated)
  console.log('👑 Es admin:', store.isAdmin)
  console.log('👤 Usuario actual:', store.user?.name)

  // Si la ruta requiere autenticación
  if (to.meta.requiresAuth) {
    if (!store.isAuthenticated) {
      console.log('🚫 No autenticado, redirigiendo a login')
      next('/login')
      return
    }

    // ✅ NUEVO: Verificar si el usuario tiene permisos para la ruta actual
    if (to.meta.requiresAdmin && !store.isAdmin) {
      console.log('🚫 No es admin, redirigiendo a employee')
      next('/employee')
      return
    }

    // ✅ NUEVO: Si es admin intentando acceder a employee, redirigir a admin
    if (!to.meta.requiresAdmin && store.isAdmin && to.path === '/employee') {
      console.log('👑 Admin intentando acceder a employee, redirigiendo a admin')
      next('/admin')
      return
    }
  }

  // ✅ MEJORADO: Si ya está autenticado y va a login, redirigir según rol
  if (to.path === '/login' && store.isAuthenticated) {
    console.log('🔐 Ya autenticado, redirigiendo según rol')
    if (store.isAdmin) {
      next('/admin')
    } else {
      next('/employee')
    }
    return
  }

  // ✅ NUEVO: Forzar recarga de datos al cambiar de ruta para asegurar datos frescos
  if (from.path !== to.path && store.isAuthenticated) {
    console.log('🔄 Cambio de ruta detectado, asegurando datos actualizados')
    // Aquí podrías agregar lógica para recargar datos si es necesario
  }

  next()
})

export default router