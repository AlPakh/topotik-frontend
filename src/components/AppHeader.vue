<template>
  <header class="app-header">
    <h1 class="app-title" @click="goToMain">Topotik</h1>
    <div class="user-info" @click="handleUserClick">
      <span class="user-name">{{ username }}</span>
      <span class="user-icon">{{ userInitial }}</span>
    </div>
  </header>
</template>

<script>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { isAuthenticated, getUsername } from '../services/auth'

export default {
  name: 'AppHeader',
  setup() {
    const router = useRouter()

    const username = computed(() => getUsername())

    const userInitial = computed(() => {
      return username.value.charAt(0).toUpperCase()
    })

    const goToMain = () => {
      router.push('/main')
    }

    const handleUserClick = () => {
      if (isAuthenticated()) {
        router.push('/lk')
      } else {
        router.push('/login')
      }
    }

    return {
      username,
      userInitial,
      goToMain,
      handleUserClick
    }
  }
}
</script>

<style scoped>
.app-header {
  min-height: 5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.app-title {
  margin: 0;
  font-size: 2.5rem;
  color: #4CAF50;
  cursor: pointer;
  transition: color 0.3s ease;
}

.app-title:hover {
  color: #45a049;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.user-info:hover {
  background-color: #f5f5f5;
}

.user-name {
  font-size: 1rem;
  color: #333;
}

.user-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: #4CAF50;
  color: white;
  border-radius: 50%;
  font-size: 2,5rem;
  font-weight: bold;
}
</style> 