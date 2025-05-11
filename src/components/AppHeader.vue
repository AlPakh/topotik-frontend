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

<style scoped src="@/assets/css/components/AppHeader.css"> </style>