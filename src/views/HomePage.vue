<template>
  <div class="login-container">
    <div class="login-form">
      <h1 class="app-title">ΤοποΤικ</h1>
      
      <input 
        v-model="username" 
        placeholder="Логин" 
        class="login-input"
      />
      
      <input 
        type="password" 
        v-model="password" 
        placeholder="Пароль" 
        class="login-input"
      />
      
      <button 
        @click="login" 
        class="login-button"
      >
        Войти
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HomePage',
  data() {
    return {
      username: '',
      password: ''
    }
  },
  methods: {
    login() {
      // Любые данные разрешают авторизацию
      localStorage.setItem('logged_in', 'true')
      this.$router.push('/main')
    }
  }
}
</script>

<style scoped src="@/assets/css/views/HomePage.css"></style>