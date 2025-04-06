<template>
  <div class="login-container">
    <div class="login-form">
      <h2 class="title">ТОПОТИК</h2>
      
      <input 
        v-model="username" 
        placeholder="Логин" 
        class="login-input username"
      />
      
      <input 
        type="password" 
        v-model="password" 
        placeholder="Пароль" 
        class="login-input password"
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
  name: 'LoginPage',
  data() {
    return {
      username: '',
      password: ''
    };
  },
  methods: {
    login() {
      // Любые данные разрешают авторизацию
      localStorage.setItem('logged_in', 'true');
      this.$router.push('/main');
    }
  }
};
</script>

<style scoped src="@/assets/css/components/LoginPage.css"></style>
