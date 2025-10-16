// src/utils/taskProgress.js

/**
 * Calcula el progreso y estado de una tarea de forma consistente
 * entre frontend y backend
 */
export const calculateTaskProgress = (task) => {
  if (!task.individualProgress || !task.assignedTo) {
    return { 
      progress: 0, 
      status: 'pending', 
      allCompleted: false,
      completedCount: 0,
      totalAssigned: 0
    }
  }

  // ✅ CORREGIDO: Normalizar assignedTo a array
  const assignedTo = Array.isArray(task.assignedTo) 
    ? task.assignedTo.map(id => parseInt(id))
    : [parseInt(task.assignedTo)]

  const totalAssigned = assignedTo.length

  if (totalAssigned === 0) {
    return { 
      progress: 0, 
      status: 'pending', 
      allCompleted: false,
      completedCount: 0,
      totalAssigned: 0
    }
  }

  // ✅ CORREGIDO: Calcular suma de progresos considerando TODOS los asignados
  let totalProgress = 0
  let completedCount = 0
  let usersWithAnyProgress = 0

  assignedTo.forEach(userId => {
    const userProgress = task.individualProgress[userId] || 0
    totalProgress += userProgress
    
    if (userProgress === 100) {
      completedCount++
    }
    if (userProgress > 0) {
      usersWithAnyProgress++
    }
  })

  // ✅ CORREGIDO: Dividir entre el TOTAL de asignados, no solo los que tienen progreso
  const averageProgress = Math.round(totalProgress / totalAssigned)

  // ✅ CORREGIDO: Solo completado si TODOS los asignados tienen 100%
  const allCompleted = assignedTo.every(userId => 
    task.individualProgress[userId] === 100
  )

  let status = 'pending'
  if (allCompleted) {
    status = 'completed'
  } else if (averageProgress > 0 || usersWithAnyProgress > 0) {
    status = 'in-progress'
  }

  console.log(`📊 Cálculo de progreso CORREGIDO:`)
  console.log(`   - Asignados: ${assignedTo.join(', ')}`)
  console.log(`   - Progresos individuales:`, task.individualProgress)
  console.log(`   - Total progreso: ${totalProgress}`)
  console.log(`   - Total asignados: ${totalAssigned}`)
  console.log(`   - Promedio CORRECTO: ${averageProgress}%`)
  console.log(`   - Completados: ${completedCount}/${totalAssigned}`)
  console.log(`   - Todos completados: ${allCompleted}`)

  return {
    progress: allCompleted ? 100 : averageProgress,
    status,
    allCompleted,
    completedCount,
    totalAssigned
  }
}

/**
 * Obtiene el progreso de un usuario específico
 */
export const getUserProgress = (task, userId) => {
  if (!task.individualProgress) return 0
  return task.individualProgress[userId] || 0
}

/**
 * Verifica si una tarea está vencida
 */
export const isTaskOverdue = (task) => {
  if (!task.dueDate) return false
  const dueDate = new Date(task.dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return dueDate < today && task.status !== 'completed'
}