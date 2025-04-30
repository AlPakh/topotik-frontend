<!-- src/components/LoginForm.vue -->
<template>
  <div class="login-form">
    <h2>Вход в систему</h2>
    <form @submit.prevent="handleLogin">
      <div class="form-group">
        <label for="email">Электронная почта</label>
        <input 
          id="email" 
          v-model="email" 
          type="email" 
          required 
          placeholder="Введите email"
        />
      </div>
      
      <div class="form-group">
        <label for="password">Пароль</label>
        <input 
          id="password" 
          v-model="password" 
          type="password" 
          required 
          placeholder="Введите пароль"
        />
      </div>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <button type="submit" :disabled="loading">
        {{ loading ? 'Входим...' : 'Войти' }}
      </button>
    </form>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '../services/auth';

export default {
  name: 'LoginForm',
  
  setup() {
    const router = useRouter();
    const email = ref('');
    const password = ref('');
    const error = ref('');
    const loading = ref(false);
    
    const handleLogin = async () => {
      loading.value = true;
      error.value = '';
      
      try {
        await login(email.value, password.value);
        router.push('/dashboard'); // Перенаправление после успешного входа
      } catch (err) {
        error.value = err.response?.data?.detail || 'Ошибка входа. Проверьте учетные данные.';
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

<style scoped>
.login-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

h2 {
  text-align: center;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  width: 100%;
  padding: 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button:hover {
  background-color: #45a049;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.error-message {
  color: red;
  margin-bottom: 15px;
}
</style> 