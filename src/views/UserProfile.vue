<template>
  <div class="profile-page">
    <AppHeader />
    <div class="profile-container">
      <h2>Профиль пользователя</h2>
      <div v-if="loading" class="loader">
        Загрузка данных...
      </div>
      <div v-else class="profile-content">
        <div class="profile-info">
          <div class="form-group">
            <label>Имя пользователя</label>
            <input type="text" v-model="username" :class="{ 'error': usernameError }" />
            <span class="error-message" v-if="usernameError">{{ usernameError }}</span>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" v-model="email" :class="{ 'error': emailError }" />
            <span class="error-message" v-if="emailError">{{ emailError }}</span>
          </div>
          <div class="form-group">
            <label>Новый пароль</label>
            <input type="password" v-model="newPassword" :class="{ 'error': passwordError }" />
            <span class="error-message" v-if="passwordError">{{ passwordError }}</span>
          </div>
          <div class="form-group">
            <label>Подтверждение пароля</label>
            <input type="password" v-model="confirmPassword" :class="{ 'error': passwordError }" />
          </div>
        </div>
        <div class="profile-actions">
          <button @click="saveChanges" :disabled="!isFormValid || isSaving">
            {{ isSaving ? 'Сохранение...' : 'Сохранить изменения' }}
          </button>
          <button @click="logout" class="logout-button">Выйти</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, getCurrentInstance } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import { getCurrentUser, updateUser, checkAvailability } from '@/services/users'
import { logout as authLogout } from '@/services/auth'
import Cookies from 'js-cookie'
import '@/assets/css/views/user-profile.css'

export default {
  name: 'UserProfile',
  components: {
    AppHeader
  },
  setup() {
    const router = useRouter()
    const { proxy } = getCurrentInstance()
    const loading = ref(true)
    const username = ref('')
    const originalUsername = ref('')
    const email = ref('')
    const originalEmail = ref('')
    const newPassword = ref('')
    const confirmPassword = ref('')
    const usernameError = ref('')
    const emailError = ref('')
    const passwordError = ref('')
    const isSaving = ref(false)

    const validateEmail = (email) => {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return re.test(email)
    }

    const validateUsername = (username) => {
      if (!username) return 'Имя пользователя не может быть пустым'
      if (username.length < 3) return 'Имя пользователя должно содержать минимум 3 символа'
      return ''
    }

    const validatePassword = () => {
      if (newPassword.value && newPassword.value.length < 6) {
        return 'Пароль должен содержать минимум 6 символов'
      }
      if (newPassword.value && newPassword.value !== confirmPassword.value) {
        return 'Пароли не совпадают'
      }
      return ''
    }

    // Следим за изменениями полей для валидации
    watch([email, username, newPassword, confirmPassword], () => {
      usernameError.value = validateUsername(username.value)
      emailError.value = validateEmail(email.value) ? '' : 'Введите корректный email'
      passwordError.value = validatePassword()
    })

    // Загрузка данных пользователя
    const loadUserData = async () => {
      loading.value = true
      try {
        const userData = await getCurrentUser()
        username.value = userData.username
        originalUsername.value = userData.username
        email.value = userData.email
        originalEmail.value = userData.email
      } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error)
      } finally {
        loading.value = false
      }
    }

    // Проверка, изменились ли данные пользователя
    const isDataChanged = computed(() => {
      return username.value !== originalUsername.value || 
             email.value !== originalEmail.value || 
             newPassword.value.length > 0
    })

    const isFormValid = computed(() => {
      return !usernameError.value && !emailError.value && !passwordError.value && isDataChanged.value
    })

    // Проверка уникальности имени пользователя и email
    const checkUniqueness = async () => {
      if (username.value === originalUsername.value && email.value === originalEmail.value) {
        return true
      }

      try {
        const result = await checkAvailability(email.value, username.value)
        
        if (result.username_exists && username.value !== originalUsername.value) {
          usernameError.value = 'Это имя пользователя уже занято'
          return false
        }
        
        if (result.email_exists && email.value !== originalEmail.value) {
          emailError.value = 'Этот email уже зарегистрирован'
          return false
        }
        
        return true
      } catch (error) {
        console.error('Ошибка при проверке уникальности:', error)
        return false
      }
    }

    const saveChanges = async () => {
      if (!isFormValid.value) return

      // Проверка уникальности перед сохранением
      const isUnique = await checkUniqueness()
      if (!isUnique) return

      isSaving.value = true
      try {
        const userData = {
          username: username.value !== originalUsername.value ? username.value : undefined,
          email: email.value !== originalEmail.value ? email.value : undefined,
          password: newPassword.value || undefined
        }

        const updatedUser = await updateUser(userData)
        
        // Обновляем данные в cookies
        if (userData.username) {
          Cookies.set('username', updatedUser.username, { expires: 15 })
        }
        
        // Обновляем оригинальные значения
        originalUsername.value = updatedUser.username
        originalEmail.value = updatedUser.email
        
        // Сбрасываем поля пароля
        newPassword.value = ''
        confirmPassword.value = ''
        
        proxy.$alert.success('Изменения сохранены')
      } catch (error) {
        console.error('Ошибка при сохранении:', error)
        if (error.response?.status === 400) {
          if (error.response.data.detail.includes('Email')) {
            emailError.value = 'Этот email уже зарегистрирован'
          } else if (error.response.data.detail.includes('Username')) {
            usernameError.value = 'Это имя пользователя уже занято'
          } else {
            proxy.$alert.error('Ошибка при сохранении: ' + error.response.data.detail)
          }
        } else {
          proxy.$alert.error('Ошибка при сохранении изменений')
        }
      } finally {
        isSaving.value = false
      }
    }

    const logout = async () => {
      try {
        await authLogout()
        router.push('/login')
      } catch (error) {
        console.error('Ошибка при выходе:', error)
      }
    }

    onMounted(() => {
      loadUserData()
    })

    return {
      loading,
      username,
      email,
      newPassword,
      confirmPassword,
      usernameError,
      emailError,
      passwordError,
      isSaving,
      isFormValid,
      saveChanges,
      logout
    }
  }
}
</script>

<style scoped src="@/assets/css/views/UserProfile.css"></style> 