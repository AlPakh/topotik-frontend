<template>
  <div class="login-container">
    <div class="login-form">
      <div class="logo-container">
        <svg-logo width="240px" height="70px" />
      </div>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <input 
        v-model="email" 
        placeholder="Логин" 
        class="login-input username"
        type="login"
        required
      />
      
      <input 
        type="password" 
        v-model="password" 
        placeholder="Пароль" 
        class="login-input password"
        required
      />
      
      <button 
        @click="handleLogin" 
        :disabled="loading"
        class="login-button"
      >
        {{ loading ? 'Выполняется вход...' : 'Войти' }}
      </button>
      
      <div class="register-link">
        <router-link to="/register">Зарегистрироваться</router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '@/services/auth';
// Импортируем компонент логотипа
import SvgLogo from '@/components/SvgLogo.vue';

export default {
  name: 'LoginPage',
  components: {
    SvgLogo
  },
  
  setup() {
    const router = useRouter();
    const email = ref('');
    const password = ref('');
    const error = ref('');
    const loading = ref(false);
    
    const handleLogin = async () => {
      if (!email.value || !password.value) {
        error.value = 'Пожалуйста, введите email и пароль';
        return;
      }
      
      loading.value = true;
      error.value = '';
      
      try {
        await login(email.value, password.value);
        router.push('/main');
      } catch (err) {
        error.value = err.response?.data?.detail || 'Ошибка входа. Проверьте учетные данные.';
        console.error('Ошибка входа:', err);
      } finally {
        loading.value = false;
      }
    };
    
    return {
      email,
      password,
      error,
      loading,
      handleLogin
    };
  }
};
</script>

<style scoped src="@/assets/css/components/LoginPage.css"></style>

<style scoped>
/* Улучшенные стили для контейнера логотипа */
.logo-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto 30px;
  width: 240px;
  height: 70px;
  overflow: visible;
}
</style>
