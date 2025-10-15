<template>
  <v-container class="fill-height d-flex align-center justify-center login-container">
    <v-card width="400" class="pa-6 login-card" elevation="8">
      <v-card-title class="text-center login-title">
        <v-icon size="48" color="primary" class="mb-4">mdi-shield-account</v-icon>
        <div class="text-h5 font-weight-bold">Sistema de Tareas</div>
        <div class="text-subtitle-1 text-grey-darken-1 mt-2">Iniciar Sesión</div>
      </v-card-title>
      
      <v-card-text>
        <v-form @submit.prevent="handleLogin" class="login-form">
          <v-text-field
            v-model="email"
            label="Correo Electrónico"
            type="email"
            prepend-inner-icon="mdi-email"
            variant="outlined"
            :error-messages="emailErrors"
            @blur="validateEmail"
            required
            class="mb-4"
          ></v-text-field>

          <v-text-field
            v-model="password"
            label="Contraseña"
            :type="showPassword ? 'text' : 'password'"
            prepend-inner-icon="mdi-lock"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            variant="outlined"
            :error-messages="passwordErrors"
            @click:append-inner="showPassword = !showPassword"
            @blur="validatePassword"
            required
            class="mb-2"
          ></v-text-field>

          <v-alert
            v-if="store.authError"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            {{ store.authError }}
          </v-alert>

          <v-btn
            type="submit"
            color="primary"
            size="large"
            block
            :loading="store.loading"
            :disabled="!isFormValid"
            class="login-btn"
          >
            <v-icon left>mdi-login</v-icon>
            Iniciar Sesión
          </v-btn>
        </v-form>

        <!-- Información de usuarios de prueba -->
        <v-expansion-panels variant="accordion" class="mt-6">
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon left>mdi-information</v-icon>
              Credenciales de Prueba
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-list density="compact" class="credentials-list">
                <v-list-item
                  v-for="user in testUsers"
                  :key="user.id"
                  @click="fillCredentials(user)"
                  class="credential-item"
                >
                  <template v-slot:prepend>
                    <v-avatar :color="user.role === 'admin' ? 'primary' : 'blue'" size="32">
                      <span class="text-white text-caption">{{ getInitials(user.name) }}</span>
                    </v-avatar>
                  </template>
                  
                  <v-list-item-title class="text-caption font-weight-medium">
                    {{ user.name }}
                  </v-list-item-title>
                  
                  <v-list-item-subtitle class="text-caption">
                    {{ user.email }}
                  </v-list-item-subtitle>

                  <template v-slot:append>
                    <v-chip 
                      :color="user.role === 'admin' ? 'primary' : 'blue'" 
                      size="x-small"
                      variant="flat"
                    >
                      {{ user.role === 'admin' ? 'Admin' : 'Empleado' }}
                    </v-chip>
                  </template>
                </v-list-item>
              </v-list>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '../stores/app.js'
import { useRouter } from 'vue-router'

const store = useAppStore()
const router = useRouter()

// Reactive data
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const emailErrors = ref('')
const passwordErrors = ref('')

// Usuarios de prueba
const testUsers = ref([
  {
    id: 1,
    name: 'Administrador',
    email: 'admin@empresa.com',
    password: 'admin123',
    role: 'admin'
  },
  {
    id: 2,
    name: 'Juan Pérez',
    email: 'juan@empresa.com',
    password: 'juan123',
    role: 'employee'
  },
  {
    id: 3,
    name: 'María García',
    email: 'maria@empresa.com',
    password: 'maria123',
    role: 'employee'
  },
  {
    id: 4,
    name: 'Carlos López',
    email: 'carlos@empresa.com',
    password: 'carlos123',
    role: 'employee'
  }
])

// Computed
const isFormValid = computed(() => {
  return email.value && password.value && !emailErrors.value && !passwordErrors.value
})

// Methods
const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email.value) {
    emailErrors.value = 'El correo electrónico es requerido'
  } else if (!emailRegex.test(email.value)) {
    emailErrors.value = 'Ingresa un correo electrónico válido'
  } else {
    emailErrors.value = ''
  }
}

const validatePassword = () => {
  if (!password.value) {
    passwordErrors.value = 'La contraseña es requerida'
  } else if (password.value.length < 6) {
    passwordErrors.value = 'La contrraseña debe tener al menos 6 caracteres'
  } else {
    passwordErrors.value = ''
  }
}

const fillCredentials = (user) => {
  email.value = user.email
  password.value = user.password
  validateEmail()
  validatePassword()
}

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
}

// ✅ CORREGIDO: Función de login mejorada con manejo de cambio de usuario
const handleLogin = async () => {
  // Validar formulario
  validateEmail()
  validatePassword()
  
  if (!isFormValid.value) {
    return
  }

  console.log('🔐 Enviando credenciales:', email.value)
  
  // ✅ NUEVO: Resetear formulario después del login exitoso
  const result = await store.login(email.value, password.value)
  
  if (result.success) {
    console.log('✅ Login exitoso, redirigiendo...')
    
    // ✅ CORREGIDO: Resetear formulario
    email.value = ''
    password.value = ''
    emailErrors.value = ''
    passwordErrors.value = ''
    
    // Redirigir según el rol
    if (result.user.role === 'admin') {
      router.push('/admin')
    } else {
      router.push('/employee')
    }
  } else {
    console.log('❌ Error en login:', result.error)
    // El error ya se muestra a través de store.authError
  }
}

// Lifecycle
onMounted(() => {
  console.log('🔐 Componente Login montado')
  
  // ✅ CORREGIDO: Resetear formulario al montar
  email.value = ''
  password.value = ''
  emailErrors.value = ''
  passwordErrors.value = ''
  store.authError = null
  
  // Si ya está autenticado, redirigir
  if (store.isAuthenticated) {
    console.log('🔐 Usuario ya autenticado, redirigiendo...')
    if (store.isAdmin) {
      router.push('/admin')
    } else {
      router.push('/employee')
    }
  }
})
</script>

<style scoped>
.login-container {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
  min-height: 100vh;
}

.login-card {
  border-radius: 16px;
  backdrop-filter: blur(10px);
}

.login-title {
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.login-form {
  margin-bottom: 8px;
}

.login-btn {
  border-radius: 8px;
  height: 48px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.5px;
}

.credentials-list {
  background: transparent;
}

.credential-item {
  border-radius: 8px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.credential-item:hover {
  background-color: rgba(25, 118, 210, 0.08);
  transform: translateX(4px);
}

:deep(.v-expansion-panel-text__wrapper) {
  padding: 8px 0 !important;
}
</style>