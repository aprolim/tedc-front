import { createRouter, createWebHistory } from 'vue-router'
import AdminDashboard from './components/AdminDashboard.vue'
import EmployeeDashboard from './components/EmployeeDashboard.vue'

const routes = [
  { path: '/admin', component: AdminDashboard, meta: { requiresAuth: true, role: 'admin' } },
  { path: '/employee', component: EmployeeDashboard, meta: { requiresAuth: true, role: 'employee' } },
  { path: '/', redirect: '/employee' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router