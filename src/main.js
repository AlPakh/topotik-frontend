import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/css/fonts.css'
import { setAuthToken } from './api'
import alertPlugin from './plugins/alertPlugin'

// Восстанавливаем токен из localStorage при запуске приложения
const token = localStorage.getItem('access_token')
if (token) {
    setAuthToken(token)
}

const app = createApp(App)
app.use(router)
app.use(alertPlugin)
app.mount('#app')
