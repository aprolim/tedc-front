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

// ✅ MEJORADO: Guard de navegación más robusto
router.beforeEach((to, from, next) => {
  const store = useAppStore()
  
  console.log('🛡️ Navegación:', from.path, '→', to.path)
  console.log('🔐 Usuario autenticado:', store.isAuthenticated)
  console.log('👑 Es admin:', store.isAdmin)

  // Si la ruta requiere autenticación
  if (to.meta.requiresAuth) {
    if (!store.isAuthenticated) {
      console.log('🚫 No autenticado, redirigiendo a login')
      next('/login')
      return
    }

    // Si la ruta requiere ser admin
    if (to.meta.requiresAdmin && !store.isAdmin) {
      console.log('🚫 No es admin, redirigiendo a employee')
      next('/employee')
      return
    }

    // Si es empleado intentando acceder a admin
    if (!to.meta.requiresAdmin && store.isAdmin && to.path === '/employee') {
      console.log('👑 Admin intentando acceder a employee, redirigiendo a admin')
      next('/admin')
      return
    }
  }

  // Si ya está autenticado y va a login, redirigir según rol
  if (to.path === '/login' && store.isAuthenticated) {
    console.log('🔐 Ya autenticado, redirigiendo según rol')
    if (store.isAdmin) {
      next('/admin')
    } else {
      next('/employee')
    }
    return
  }

  next()
})

export default router