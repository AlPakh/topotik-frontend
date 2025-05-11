<template>
  <Teleport to="body">
    <div class="alert-container">
      <transition-group name="alert">
        <div 
          v-for="(alert, index) in alerts" 
          :key="alert.id" 
          class="app-alert"
          :class="{ success: alert.type === 'success', error: alert.type === 'error' }"
        >
          <div class="alert-content">
            <div class="alert-message">{{ alert.message }}</div>
            <button class="close-button" @click="removeAlert(index)">×</button>
          </div>
          <div class="alert-progress">
            <div class="progress-bar" :style="{ animationDuration: alert.duration + 'ms' }"></div>
          </div>
        </div>
      </transition-group>
    </div>
  </Teleport>
</template>

<script>
import { ref, defineComponent, onMounted } from 'vue';
import { registerAlertInstance } from '@/services/alertService';

// Используем уникальный идентификатор для каждого уведомления
let nextId = 0;

export default defineComponent({
  name: 'AppAlert',
  setup() {
    const alerts = ref([]);

    const addAlert = (message, options = {}) => {
      const defaultOptions = {
        type: 'success',
        duration: 8000, // 8 секунд по умолчанию
      };

      const alertOptions = { ...defaultOptions, ...options };
      const alert = {
        id: nextId++,
        message,
        type: alertOptions.type,
        duration: alertOptions.duration,
      };

      alerts.value.push(alert);

      // Автоматическое удаление алерта через указанное время
      setTimeout(() => {
        removeAlert(alerts.value.findIndex(a => a.id === alert.id));
      }, alertOptions.duration);
    };

    const removeAlert = (index) => {
      if (index !== -1) {
        alerts.value.splice(index, 1);
      }
    };

    // Регистрируем экземпляр компонента в сервисе alertService
    onMounted(() => {
      registerAlertInstance({
        alerts,
        addAlert,
        removeAlert
      });
    });

    return {
      alerts,
      addAlert,
      removeAlert,
    };
  }
});
</script>

<style scoped src="@/assets/css/components/AppAlert.css"> </style>
