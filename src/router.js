import { createRouter, createWebHistory } from 'vue-router'
import AdminDashboard from './components/AdminDashboard.vue'
import EmployeeDashboard from './components/EmployeeDashboard.vue'

const routes = [
  { 
    path: '/admin', 
    component: AdminDashboard,
    meta: { requiresAuth: false}
  },
  { 
    path: '/employee', 
    component: EmployeeDashboard,
    meta: { requiresAuth: false } // No requiere auth porque mostramos selector
  },
  { 
    path: '/', 
    redirect: '/employee'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Opcional: Guard de navegación
// router.beforeEach((to, from, next) => {
//   // Si va a admin y no hay usuario, redirigir a employee
//   if (to.path === '/admin' && !localStorage.getItem('user')) {
//     next('/employee')
//   } else {
//     next()
//   }
// })

export default router