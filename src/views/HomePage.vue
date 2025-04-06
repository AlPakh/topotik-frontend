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

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f5f5f5;
}

.login-form {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  background-color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid #ddd;
}

.app-title {
  color: #14ae5c;
  font-size: 32px;
  font-weight: normal;
  margin: 0 0 30px 0;
  font-family: 'Avdira', sans-serif;
  text-align: center;
}

.login-input {
  width: 100%;
  padding: 12px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
}

.login-button {
  width: 100%;
  padding: 12px;
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  margin-top: 10px;
}

.login-button:hover {
  background-color: #e0e0e0;
}

/* Адаптивность */
@media (max-width: 480px) {
  .login-form {
    width: 90%;
    padding: 20px;
  }
  
  .app-title {
    font-size: 28px;
    margin-bottom: 25px;
  }
}
</style>
