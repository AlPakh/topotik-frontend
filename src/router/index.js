import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/views/HomePage.vue'
import MainPage from '@/views/MainPage.vue'
import MapView from '@/views/MapView.vue'

// Для простоты, «авторизацию» определим флагом в localStorage.
// В реальном проекте проверяли бы JWT-токен или сессию.
function isAuthenticated() {
    // Возвращаем true, если "авторизован"
    return !!localStorage.getItem('logged_in')
}

const routes = [
    {
        path: '/',
        name: 'Home',
        component: HomePage
    },
    {
        path: '/main',
        name: 'MainPage',
        component: MainPage,
        beforeEnter: (to, from, next) => {
            if (!isAuthenticated()) {
                next({ name: 'Home' })
            } else {
                next()
            }
        }
    },
    {
        path: '/map/:id',
        name: 'MapView',
        component: MapView,
        beforeEnter: (to, from, next) => {
            if (!isAuthenticated()) {
                next({ name: 'Home' })
            } else {
                next()
            }
        }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
