<!-- src/components/RegisterForm.vue -->
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
        id="username" 
        v-model="username" 
        type="text" 
        required 
        placeholder="Имя пользователя"
        class="login-input"
      />
      
      <input 
        id="email" 
        v-model="email" 
        type="email" 
        required 
        placeholder="Email"
        class="login-input"
      />
      
      <input 
        id="password" 
        v-model="password" 
        type="password" 
        required 
        placeholder="Пароль"
        class="login-input"
      />
      
      <input 
        id="confirmPassword" 
        v-model="confirmPassword" 
        type="password" 
        required 
        placeholder="Повторите пароль"
        class="login-input"
      />
      
      <button 
        type="submit" 
        :disabled="loading"
        class="login-button"
        @click.prevent="handleRegister"
      >
        {{ loading ? 'Регистрация...' : 'Зарегистрироваться' }}
      </button>
      
      <div class="register-link">
        <router-link to="/login">Уже зарегистрированы?</router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { register } from '../services/auth';
// Импортируем компонент логотипа
import SvgLogo from '@/components/SvgLogo.vue';

export default {
  name: 'RegisterForm',
  components: {
    SvgLogo
  },
  
  setup() {
    const router = useRouter();
    const username = ref('');
    const email = ref('');
    const password = ref('');
    const confirmPassword = ref('');
    const error = ref('');
    const loading = ref(false);
    
    const isFormValid = computed(() => {
      return (
        username.value.trim() !== '' &&
        email.value.trim() !== '' &&
        password.value.trim() !== '' &&
        password.value === confirmPassword.value
      );
    });
    
    const handleRegister = async () => {
      if (!isFormValid.value) {
        error.value = 'Пароли не совпадают или не все поля заполнены.';
        return;
      }
      
      loading.value = true;
      error.value = '';
      
      try {
        await register({
          username: username.value,
          email: email.value,
          password: password.value
        });
        
        // После успешной регистрации перенаправляем на страницу логина
        router.push('/login');
      } catch (err) {
        error.value = err.response?.data?.detail || 'Ошибка регистрации. Пожалуйста, попробуйте позже.';
      } finally {
        loading.value = false;
      }
    };
    
    return {
      username,
      email,
      password,
      confirmPassword,
      error,
      loading,
      handleRegister
    };
  }
};
</script>

<style scoped src="@/assets/css/components/LoginPage.css"></style>