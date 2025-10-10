<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Gestión de Tareas</v-card-title>
          <v-card-text>
            <TaskList :is-admin="true" />
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>Chat con Empleados</v-card-title>
          <v-card-text>
            <Chat :is-admin="true" />
          </v-card-text>
        </v-card>
        
        <v-card class="mt-4">
          <v-card-title>Ubicaciones</v-card-title>
          <v-card-text>
            <UserLocation :is-admin="true" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import TaskList from './TaskList.vue'
import Chat from './Chat.vue'
import UserLocation from './UserLocation.vue'
</script>