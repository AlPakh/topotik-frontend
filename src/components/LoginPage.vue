<template>
  <div class="login-container">
    <div class="login-form">
      <div class="logo-container">
        <svg-logo width="240px" height="70px" />
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div class="input-wrapper">
        <input
          v-model="email"
          placeholder="Логин или Email"
          class="login-input username"
          type="text"
          required
          @keyup.enter="handleLogin"
        />
      </div>

      <div class="input-wrapper">
        <div class="password-input-container">
          <input
            :type="showPassword ? 'text' : 'password'"
            v-model="password"
            placeholder="Пароль"
            class="login-input password"
            required
            @keyup.enter="handleLogin"
          />
          <button
            type="button"
            class="password-toggle"
            @click="togglePasswordVisibility"
          >
            <span v-if="showPassword">👁️‍🗨️</span>
            <span v-else>👁️</span>
          </button>
        </div>
      </div>

      <button @click="handleLogin" :disabled="loading" class="login-button">
        {{ loading ? "Выполняется вход..." : "Войти" }}
      </button>

      <div class="register-link">
        <router-link to="/register">Зарегистрироваться</router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { login } from "@/services/auth";
// Импортируем компонент логотипа
import SvgLogo from "@/components/SvgLogo.vue";

export default {
  name: "LoginPage",
  components: {
    SvgLogo,
  },

  setup() {
    const router = useRouter();
    const email = ref("");
    const password = ref("");
    const error = ref("");
    const loading = ref(false);
    const showPassword = ref(false);

    const togglePasswordVisibility = () => {
      showPassword.value = !showPassword.value;
    };

    const handleLogin = async () => {
      if (!email.value || !password.value) {
        error.value = "Пожалуйста, введите email и пароль";
        return;
      }

      loading.value = true;
      error.value = "";

      try {
        await login(email.value, password.value);
        router.push("/main");
      } catch (err) {
        console.error("Ошибка входа:", err);

        // Улучшенная обработка ошибок
        if (err.response?.data?.detail) {
          const detail = err.response.data.detail;

          if (typeof detail === "string") {
            if (detail.includes("Invalid credentials")) {
              error.value = "Неверный логин или пароль";
            } else {
              error.value = detail;
            }
          } else {
            error.value = "Ошибка входа. Проверьте учетные данные.";
          }
        } else {
          error.value = "Ошибка входа. Пожалуйста, попробуйте позже.";
        }
      } finally {
        loading.value = false;
      }
    };

    return {
      email,
      password,
      error,
      loading,
      showPassword,
      handleLogin,
      togglePasswordVisibility,
    };
  },
};
</script>

<style scoped src="@/assets/css/components/LoginPage.css"></style>
