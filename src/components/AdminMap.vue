<template>
  <div class="admin-map">
    <!-- Panel de control para empleados -->
    <div class="map-control-panel">
      <div class="control-group">
        <h4>👥 Control de Empleados</h4>
        
        <div class="filter-section">
          <label>Filtrar por empleado:</label>
          <select v-model="selectedEmployee" @change="filterLocations" class="form-select">
            <option value="all">Todos los empleados</option>
            <option v-for="employee in employees" :key="employee.id" :value="employee.id">
              {{ employee.name }}
            </option>
          </select>
        </div>

        <div class="filter-section">
          <label>Rango de tiempo:</label>
          <select v-model="timeRange" @change="filterLocations" class="form-select">
            <option value="today">Hoy</option>
            <option value="week">Esta semana</option>
            <option value="month">Este mes</option>
            <option value="all">Todo el histórico</option>
          </select>
        </div>

        <div class="action-buttons">
          <button @click="refreshLocations" class="btn-control">
            🔄 Actualizar ubicaciones
          </button>
          <button @click="toggleRealTime" class="btn-control" :class="{ 'active': realTimeEnabled }">
            {{ realTimeEnabled ? '⏸️ Pausar' : '▶️' }} Tiempo real
          </button>
          <button @click="exportEmployeeData" class="btn-control">
            📊 Exportar reporte
          </button>
        </div>
      </div>

      <!-- Lista de empleados conectados -->
      <div class="employees-list">
        <h4>📍 Empleados Activos ({{ activeEmployees.length }})</h4>
        <div v-for="employee in activeEmployees" :key="employee.id" 
             class="employee-item" @click="focusOnEmployee(employee)">
          <div class="employee-avatar">
            {{ getInitials(employee.name) }}
          </div>
          <div class="employee-info">
            <strong>{{ employee.name }}</strong>
            <small>{{ formatTime(employee.lastUpdate) }}</small>
            <div class="employee-status" :class="employee.status">
              {{ getStatusText(employee.status) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mapa principal -->
    <div ref="mapContainer" class="map-container"></div>

    <!-- Panel de información del empleado seleccionado -->
    <div v-if="selectedEmployeeInfo" class="employee-info-panel">
      <div class="info-header">
        <h4>👤 {{ selectedEmployeeInfo.name }}</h4>
        <button @click="selectedEmployeeInfo = null" class="close-btn">×</button>
      </div>
      
      <div class="info-content">
        <div class="info-row">
          <label>Última actualización:</label>
          <span>{{ formatTime(selectedEmployeeInfo.lastUpdate) }}</span>
        </div>
        <div class="info-row">
          <label>Coordenadas:</label>
          <span>{{ selectedEmployeeInfo.lat.toFixed(6) }}, {{ selectedEmployeeInfo.lng.toFixed(6) }}</span>
        </div>
        <div class="info-row">
          <label>Estado:</label>
          <span class="status-badge" :class="selectedEmployeeInfo.status">
            {{ getStatusText(selectedEmployeeInfo.status) }}
          </span>
        </div>
        <div class="info-row">
          <label>Velocidad:</label>
          <span>{{ selectedEmployeeInfo.speed || '0' }} km/h</span>
        </div>
        <div class="info-row">
          <label>Precisión:</label>
          <span>{{ selectedEmployeeInfo.accuracy || 'N/A' }}m</span>
        </div>
      </div>

      <div class="info-actions">
        <button @click="viewEmployeeHistory(selectedEmployeeInfo)" class="btn-small">
          📈 Ver histórico
        </button>
        <button @click="sendMessageToEmployee(selectedEmployeeInfo)" class="btn-small">
          💬 Enviar mensaje
        </button>
      </div>
    </div>

    <!-- Estadísticas rápidas -->
    <div class="stats-panel">
      <div class="stat-item">
        <div class="stat-value">{{ totalEmployees }}</div>
        <div class="stat-label">Total Empleados</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ activeEmployees.length }}</div>
        <div class="stat-label">Activos Ahora</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ locationsToday }}</div>
        <div class="stat-label">Ubicaciones Hoy</div>
      </div>
    </div>
  </div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default {
  name: 'AdminMap',
  data() {
    return {
      map: null,
      employees: [],
      employeeMarkers: {},
      selectedEmployee: 'all',
      timeRange: 'today',
      realTimeEnabled: true,
      selectedEmployeeInfo: null,
      refreshInterval: null,
      totalEmployees: 0,
      locationsToday: 0
    };
  },
  computed: {
    activeEmployees() {
      return this.employees.filter(emp => emp.status !== 'offline');
    }
  },
  async mounted() {
    this.initMap();
    await this.loadEmployees();
    await this.loadEmployeeLocations();
    this.startRealTimeUpdates();
  },
  methods: {
    initMap() {
      // Centrar en una ubicación por defecto (puedes ajustar según tu región)
      this.map = L.map(this.$refs.mapContainer).setView([19.4326, -99.1332], 12);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(this.map);
    },

    async loadEmployees() {
      try {
        // Aquí iría tu API call para obtener la lista de empleados
        const response = await this.$axios.get('/api/employees');
        this.employees = response.data;
        this.totalEmployees = this.employees.length;
      } catch (error) {
        console.error('Error loading employees:', error);
        // Datos de ejemplo para desarrollo
        this.employees = [
          { id: 1, name: 'Juan Pérez', status: 'active', lastUpdate: new Date() },
          { id: 2, name: 'María García', status: 'active', lastUpdate: new Date() },
          { id: 3, name: 'Carlos López', status: 'inactive', lastUpdate: new Date(Date.now() - 3600000) },
          { id: 4, name: 'Ana Martínez', status: 'offline', lastUpdate: new Date(Date.now() - 86400000) }
        ];
        this.totalEmployees = this.employees.length;
      }
    },

    async loadEmployeeLocations() {
      try {
        // Aquí iría tu API call para obtener las ubicaciones
        const params = {
          employeeId: this.selectedEmployee === 'all' ? null : this.selectedEmployee,
          timeRange: this.timeRange
        };
        
        const response = await this.$axios.get('/api/employee-locations', { params });
        this.updateMapWithLocations(response.data);
        
        // Actualizar estadísticas
        this.locationsToday = response.data.todayCount || response.data.length;
      } catch (error) {
        console.error('Error loading locations:', error);
        // Datos de ejemplo para desarrollo
        const sampleLocations = [
          { 
            employeeId: 1, 
            name: 'Juan Pérez', 
            lat: 19.4326, 
            lng: -99.1332, 
            timestamp: new Date(),
            status: 'active',
            speed: 25,
            accuracy: 10
          },
          { 
            employeeId: 2, 
            name: 'María García', 
            lat: 19.4340, 
            lng: -99.1400, 
            timestamp: new Date(),
            status: 'active',
            speed: 0,
            accuracy: 15
          }
        ];
        this.updateMapWithLocations(sampleLocations);
        this.locationsToday = sampleLocations.length;
      }
    },

    updateMapWithLocations(locations) {
      // Limpiar marcadores existentes
      Object.values(this.employeeMarkers).forEach(marker => {
        this.map.removeLayer(marker);
      });
      this.employeeMarkers = {};

      // Agregar nuevos marcadores
      locations.forEach(location => {
        const icon = this.getEmployeeIcon(location);
        const marker = L.marker([location.lat, location.lng], { icon })
          .addTo(this.map)
          .bindPopup(this.createEmployeePopup(location))
          .on('click', () => {
            this.selectedEmployeeInfo = location;
          });

        this.employeeMarkers[location.employeeId] = marker;
      });

      // Ajustar vista del mapa para mostrar todos los marcadores
      if (locations.length > 0) {
        const group = new L.featureGroup(Object.values(this.employeeMarkers));
        this.map.fitBounds(group.getBounds().pad(0.1));
      }
    },

    getEmployeeIcon(location) {
      const statusColors = {
        active: '#28a745',    // Verde
        inactive: '#ffc107',  // Amarillo
        offline: '#6c757d',   // Gris
        moving: '#007bff',    // Azul
        stopped: '#dc3545'    // Rojo
      };

      return L.divIcon({
        className: `employee-marker ${location.status}`,
        html: `
          <div class="marker-container">
            <div class="marker-pin" style="background-color: ${statusColors[location.status] || '#6c757d'}">
              <span class="marker-initials">${this.getInitials(location.name)}</span>
            </div>
            <div class="marker-pulse"></div>
          </div>
        `,
        iconSize: [30, 42],
        iconAnchor: [15, 42]
      });
    },

    createEmployeePopup(location) {
      return `
        <div class="employee-popup">
          <h4>${location.name}</h4>
          <p><strong>Estado:</strong> ${this.getStatusText(location.status)}</p>
          <p><strong>Última actualización:</strong> ${this.formatTime(location.timestamp)}</p>
          <p><strong>Coordenadas:</strong> ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</p>
          ${location.speed ? `<p><strong>Velocidad:</strong> ${location.speed} km/h</p>` : ''}
        </div>
      `;
    },

    getInitials(name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    },

    getStatusText(status) {
      const statusMap = {
        active: 'Activo',
        inactive: 'Inactivo',
        offline: 'Desconectado',
        moving: 'En movimiento',
        stopped: 'Detenido'
      };
      return statusMap[status] || status;
    },

    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    filterLocations() {
      this.loadEmployeeLocations();
    },

    refreshLocations() {
      this.loadEmployeeLocations();
    },

    toggleRealTime() {
      this.realTimeEnabled = !this.realTimeEnabled;
      if (this.realTimeEnabled) {
        this.startRealTimeUpdates();
      } else {
        this.stopRealTimeUpdates();
      }
    },

    startRealTimeUpdates() {
      this.refreshInterval = setInterval(() => {
        if (this.realTimeEnabled) {
          this.loadEmployeeLocations();
        }
      }, 30000); // Actualizar cada 30 segundos
    },

    stopRealTimeUpdates() {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
      }
    },

    focusOnEmployee(employee) {
      const marker = this.employeeMarkers[employee.id];
      if (marker) {
        this.map.setView(marker.getLatLng(), 15);
        marker.openPopup();
        this.selectedEmployeeInfo = employee;
      }
    },

    viewEmployeeHistory(employee) {
      this.$router.push(`/admin/employee-history/${employee.id}`);
    },

    sendMessageToEmployee(employee) {
      // Implementar envío de mensajes
      alert(`Enviar mensaje a: ${employee.name}`);
    },

    exportEmployeeData() {
      // Implementar exportación de datos
      const data = this.employees.map(emp => ({
        nombre: emp.name,
        estado: this.getStatusText(emp.status),
        última_actualización: this.formatTime(emp.lastUpdate)
      }));

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-empleados-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  },

  beforeUnmount() {
    this.stopRealTimeUpdates();
    if (this.map) {
      this.map.remove();
    }
  }
};
</script>

<style scoped>
.admin-map {
  position: relative;
  height: 100vh;
  width: 100%;
}

.map-container {
  height: 100%;
  width: 100%;
}

.map-control-panel {
  position: absolute;
  top: 10px;
  left: 10px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  z-index: 1000;
  width: 300px;
  max-height: 80vh;
  overflow-y: auto;
}

.control-group h4 {
  margin: 0 0 15px 0;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.filter-section {
  margin-bottom: 15px;
}

.filter-section label {
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
  font-weight: bold;
  color: #666;
}

.form-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-control {
  padding: 10px;
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  font-size: 14px;
}

.btn-control:hover {
  background: #e9ecef;
}

.btn-control.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.employees-list {
  margin-top: 20px;
}

.employees-list h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #333;
}

.employee-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border: 1px solid #eee;
  border-radius: 4px;
  margin-bottom: 5px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.employee-item:hover {
  background: #f8f9fa;
}

.employee-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #007bff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  margin-right: 10px;
}

.employee-info {
  flex: 1;
}

.employee-info strong {
  display: block;
  font-size: 14px;
}

.employee-info small {
  color: #666;
  font-size: 11px;
}

.employee-status {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  background: #6c757d;
  color: white;
  display: inline-block;
  margin-top: 2px;
}

.employee-status.active {
  background: #28a745;
}

.employee-status.inactive {
  background: #ffc107;
  color: #000;
}

.employee-status.offline {
  background: #6c757d;
}

.employee-info-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  z-index: 1000;
  width: 280px;
}

.info-header {
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 15px;
}

.info-header h4 {
  margin: 0;
  flex: 1;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
}

.info-content {
  margin-bottom: 15px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
}

.info-row label {
  font-weight: bold;
  color: #666;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  color: white;
}

.status-badge.active {
  background: #28a745;
}

.status-badge.inactive {
  background: #ffc107;
  color: #000;
}

.info-actions {
  display: flex;
  gap: 8px;
}

.btn-small {
  padding: 6px 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  flex: 1;
}

.stats-panel {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  z-index: 1000;
  display: flex;
  gap: 20px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #007bff;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-top: 5px;
}

/* Estilos para los marcadores de empleados */
.employee-marker .marker-container {
  position: relative;
}

.employee-marker .marker-pin {
  width: 30px;
  height: 30px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
}

.employee-marker .marker-initials {
  transform: rotate(45deg);
  color: white;
  font-size: 10px;
  font-weight: bold;
}

.employee-marker .marker-pulse {
  position: absolute;
  top: -10px;
  left: -10px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: inherit;
  opacity: 0.6;
  animation: pulse 2s infinite;
  z-index: 1;
}

@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.3;
  }
  100% {
    transform: scale(0.8);
    opacity: 0.6;
  }
}

.employee-popup {
  min-width: 200px;
}

.employee-popup h4 {
  margin: 0 0 8px 0;
  color: #333;
}

.employee-popup p {
  margin: 4px 0;
  font-size: 12px;
  color: #666;
}
</style>