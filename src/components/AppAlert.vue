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

<style scoped>
.alert-container {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 400px;
  pointer-events: none;
}

.app-alert {
  width: 100%;
  background-color: rgb(162, 233, 226); /* Светло-бирюзовый цвет */
  color: #333;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin-bottom: 10px;
  overflow: hidden;
  pointer-events: auto;
}

.app-alert.error {
  background-color: #ffdddd;
}

.alert-content {
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alert-message {
  font-size: 14px;
  font-weight: 500;
}

.close-button {
  background: none;
  border: none;
  color: #555;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  margin: 0;
  line-height: 1;
}

.alert-progress {
  height: 4px;
  width: 100%;
  background-color: rgba(255, 255, 255, 0.5);
}

.progress-bar {
  height: 100%;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.1);
  transform-origin: left;
  animation: progress linear forwards;
}

@keyframes progress {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

/* Анимации для transition-group */
.alert-enter-active {
  animation: slide-up 0.4s ease;
}

.alert-leave-active {
  animation: slide-down 0.4s ease;
  animation-fill-mode: forwards;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-down {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(30px);
  }
}
</style> 