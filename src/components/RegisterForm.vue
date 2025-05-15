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

      <div class="input-wrapper">
        <input
          id="username"
          v-model="username"
          type="text"
          required
          placeholder="Имя пользователя"
          class="login-input"
          @input="validateUsername"
          @keyup.enter="handleRegister"
        />
        <div v-if="usernameError" class="validation-error">
          {{ usernameError }}
        </div>
      </div>

      <div class="input-wrapper">
        <input
          id="email"
          v-model="email"
          type="email"
          required
          placeholder="Email"
          class="login-input"
          @keyup.enter="handleRegister"
        />
      </div>

      <div class="input-wrapper">
        <div class="password-input-container">
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            placeholder="Пароль"
            class="login-input"
            @input="evaluatePasswordStrength"
            @keyup.enter="handleRegister"
          />
          <button
            type="button"
            class="password-toggle"
            @click="togglePasswordVisibility('password')"
          >
            <span v-if="showPassword">👁️‍🗨️</span>
            <span v-else>👁️</span>
          </button>
        </div>

        <div v-if="password" class="password-strength">
          <div class="strength-bar-container">
            <div
              class="strength-bar"
              :style="{
                width: strengthPercent + '%',
                backgroundColor: strengthColor,
              }"
            ></div>
          </div>
          <span class="strength-text" :style="{ color: strengthColor }">{{
            strengthText
          }}</span>
        </div>
      </div>

      <div class="input-wrapper">
        <div class="password-input-container">
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            required
            placeholder="Повторите пароль"
            class="login-input"
            @input="validatePasswordMatch"
            @keyup.enter="handleRegister"
          />
          <button
            type="button"
            class="password-toggle"
            @click="togglePasswordVisibility('confirm')"
          >
            <span v-if="showConfirmPassword">👁️‍🗨️</span>
            <span v-else>👁️</span>
          </button>
        </div>
        <div v-if="passwordMatchError" class="validation-error">
          {{ passwordMatchError }}
        </div>
      </div>

      <button
        type="submit"
        :disabled="
          loading || !isFormValid || !!usernameError || passwordStrength < 2
        "
        class="login-button"
        @click.prevent="handleRegister"
      >
        {{ loading ? "Регистрация..." : "Зарегистрироваться" }}
      </button>

      <div class="register-link">
        <router-link to="/login">Уже зарегистрированы?</router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { register } from "../services/auth";
// Импортируем компонент логотипа
import SvgLogo from "@/components/SvgLogo.vue";

export default {
  name: "RegisterForm",
  components: {
    SvgLogo,
  },

  setup() {
    const router = useRouter();
    const username = ref("");
    const usernameError = ref("");
    const email = ref("");
    const password = ref("");
    const confirmPassword = ref("");
    const error = ref("");
    const loading = ref(false);
    const showPassword = ref(false);
    const showConfirmPassword = ref(false);
    const passwordStrength = ref(0);
    const strengthText = ref("");
    const strengthColor = ref("");
    const strengthPercent = ref(0);
    const passwordMatchError = ref("");

    // Проверка корректности имени пользователя
    const validateUsername = () => {
      const value = username.value.trim();

      if (value.length < 4) {
        usernameError.value =
          "Имя пользователя должно содержать не менее 4 символов";
        return false;
      }

      // Проверяем на запрещенные символы (разрешаем буквы, цифры, нижнее подчеркивание и дефис)
      const invalidCharsRegex = /[^a-zA-Z0-9а-яА-ЯёЁ_-]/;
      if (invalidCharsRegex.test(value)) {
        usernameError.value = "Имя пользователя содержит недопустимые символы";
        return false;
      }

      usernameError.value = "";
      return true;
    };

    // Функция для оценки сложности пароля
    const evaluatePasswordStrength = () => {
      const value = password.value;
      let score = 0;

      // Не менее 6 символов
      const hasMinLength = value.length >= 6;
      if (hasMinLength) score++;

      // Специальные символы
      const hasSpecialChars = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(
        value
      );
      if (hasSpecialChars) score++;

      // Цифры
      const hasNumbers = /[0-9]+/.test(value);
      if (hasNumbers) score++;

      // Буквы
      const hasLetters = /[a-zA-Zа-яА-ЯёЁ]+/.test(value);
      if (hasLetters) score++;

      // Не менее 10 символов
      const hasLongLength = value.length >= 10;
      if (hasLongLength) score++;

      // Установка текста и цвета в зависимости от оценки
      passwordStrength.value = score;
      strengthPercent.value = (score / 5) * 100;

      if (score < 2) {
        strengthText.value = "Слабый пароль";
        strengthColor.value = "#FF4136"; // Красный
      } else if (score === 2) {
        strengthText.value = "Слабый пароль";
        strengthColor.value = "#FF851B"; // Оранжевый
      } else if (score === 3) {
        strengthText.value = "Нормальный пароль";
        strengthColor.value = "#FFDC00"; // Желтый
      } else if (score === 4) {
        strengthText.value = "Хороший пароль";
        strengthColor.value = "#2ECC40"; // Зеленый
      } else {
        strengthText.value = "Надежный пароль";
        strengthColor.value = "#0074D9"; // Синий
      }
    };

    // Переключение видимости пароля
    const togglePasswordVisibility = (field) => {
      if (field === "password") {
        showPassword.value = !showPassword.value;
      } else if (field === "confirm") {
        showConfirmPassword.value = !showConfirmPassword.value;
      }
    };

    const isFormValid = computed(() => {
      return (
        username.value.trim() !== "" &&
        email.value.trim() !== "" &&
        password.value.trim() !== "" &&
        password.value === confirmPassword.value &&
        !usernameError.value
      );
    });

    const validatePasswordMatch = () => {
      if (confirmPassword.value && password.value !== confirmPassword.value) {
        passwordMatchError.value = "Пароли не совпадают";
        return false;
      } else {
        passwordMatchError.value = "";
        return true;
      }
    };

    // Наблюдаем за изменением пароля для обновления оценки
    watch(password, () => {
      evaluatePasswordStrength();
      // Проверяем совпадение паролей при изменении основного пароля
      if (confirmPassword.value) {
        validatePasswordMatch();
      }
    });

    // Наблюдаем за изменением поля подтверждения пароля
    watch(confirmPassword, validatePasswordMatch);

    const handleRegister = async () => {
      // Проверяем имя пользователя
      if (!validateUsername()) {
        return;
      }

      // Проверка сложности пароля
      if (passwordStrength.value < 2) {
        error.value =
          "Пароль слишком слабый. Добавьте цифры, специальные символы или увеличьте длину.";
        return;
      }

      // Проверка совпадения паролей
      if (!validatePasswordMatch()) {
        return;
      }

      // Проверка формата email
      if (!email.value.includes("@") || !email.value.includes(".")) {
        error.value = "Неверный формат почты";
        return;
      }

      // Проверка полноты заполнения
      if (!isFormValid.value) {
        error.value = "Пожалуйста, заполните все поля корректно";
        return;
      }

      loading.value = true;
      error.value = "";

      try {
        console.log("Начинаем процесс регистрации с данными:", {
          username: username.value,
          email: email.value,
          password: password.value ? "********" : null,
        });

        const registerData = await register({
          username: username.value,
          email: email.value,
          password: password.value,
        });

        console.log("Регистрация успешна, полученные данные:", {
          username: registerData.username,
          token: registerData.access_token
            ? `${registerData.access_token.substring(0, 10)}...`
            : "отсутствует",
          token_type: registerData.token_type,
        });

        // Небольшая задержка перед перенаправлением, чтобы токен успел применится
        console.log("Делаем задержку перед перенаправлением...");
        await new Promise((resolve) => setTimeout(resolve, 300));

        // После успешной регистрации перенаправляем на страницу подтверждения местоположения
        console.log("Перенаправляем на страницу выбора местоположения...");
        router.push("/location");
      } catch (err) {
        console.error("Ошибка при регистрации:", err);
        console.log("Детали ошибки:", {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });

        // Улучшенная обработка ошибок
        if (err.response?.data?.detail) {
          const detail = err.response.data.detail;

          if (typeof detail === "string") {
            // Обработка известных ошибок
            if (detail.includes("Email уже зарегистрирован")) {
              error.value = "Этот адрес электронной почты уже зарегистрирован";
            } else if (detail.includes("value is not a valid email")) {
              error.value = "Неверный формат адреса электронной почты";
            } else {
              error.value = detail;
            }
          } else if (Array.isArray(detail)) {
            // Для списка ошибок валидации
            const errorMessages = [];

            detail.forEach((err) => {
              if (err.type === "value_error" && err.loc.includes("email")) {
                errorMessages.push("Неверный формат адреса электронной почты");
              } else if (
                err.type === "value_error" &&
                err.loc.includes("username")
              ) {
                errorMessages.push("Недопустимое имя пользователя");
              } else {
                errorMessages.push(err.msg);
              }
            });

            error.value = errorMessages.join(". ");
          }
        } else {
          error.value = "Ошибка регистрации. Пожалуйста, попробуйте позже.";
        }
      } finally {
        loading.value = false;
      }
    };

    return {
      username,
      usernameError,
      email,
      password,
      confirmPassword,
      error,
      loading,
      showPassword,
      showConfirmPassword,
      passwordStrength,
      strengthText,
      strengthColor,
      strengthPercent,
      isFormValid,
      handleRegister,
      validateUsername,
      evaluatePasswordStrength,
      togglePasswordVisibility,
      passwordMatchError,
      validatePasswordMatch,
    };
  },
};
</script>

<style scoped src="@/assets/css/components/LoginPage.css"></style>