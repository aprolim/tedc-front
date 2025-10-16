import { createRouter, createWebHistory } from 'vue-router'
import { useAppStore } from './stores/app.js'
import AdminDashboard from './components/AdminDashboard.vue'
import EmployeeDashboard from './components/EmployeeDashboard.vue'
import Login from './components/Login.vue'
import AdminMap from './components/AdminMap.vue' // ✅ Agregar import

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
    path: '/admin/map',  // ✅ NUEVA RUTA DEL MAPA
    component: AdminMap,
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

// ✅ CORREGIDO: Guard de navegación simplificado
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

    // Si requiere ser admin pero el usuario no es admin
    if (to.meta.requiresAdmin && !store.isAdmin) {
      console.log('🚫 No es admin, redirigiendo a employee')
      next('/employee')
      return
    }
  }

  // ✅ CORREGIDO: Si ya está autenticado y trata de ir a login, redirigir según rol
  if (to.path === '/login' && store.isAuthenticated) {
    console.log('🔐 Ya autenticado, redirigiendo según rol desde login')
    if (store.isAdmin) {
      next('/admin')
    } else {
      next('/employee')
    }
    return
  }

  // ✅ NUEVO: Permitir navegación normal si pasa todas las validaciones
  console.log('✅ Navegación permitida a:', to.path)
  next()
})

export default router