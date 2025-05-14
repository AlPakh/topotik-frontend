import { createRouter, createWebHistory } from 'vue-router'
import MainPage from '@/views/MainPage.vue'
import MapView from '@/views/MapView.vue'
import { isAuthenticated } from '@/services/auth'
import LoginPage from '@/components/LoginPage.vue'
import UserProfile from '@/views/UserProfile.vue'
import LocationConfirmation from '@/components/LocationConfirmation.vue'

// Обновленные маршруты
const routes = [
    {
        path: '/',
        name: 'Root',
        redirect: '/main'
    },
    {
        path: '/login',
        name: 'Login',
        component: LoginPage,
        meta: { requiresAuth: false }
    },
    {
        path: '/register',
        name: 'Register',
        component: () => import('@/components/RegisterForm.vue'),
        meta: { requiresAuth: false }
    },
    {
        path: '/location',
        name: 'LocationConfirmation',
        component: LocationConfirmation,
        meta: { requiresAuth: true }
    },
    {
        path: '/main',
        name: 'MainPage',
        component: MainPage,
        meta: { requiresAuth: true }
    },
    {
        path: '/map/:id',
        name: 'MapView',
        component: MapView,
        meta: { requiresAuth: true }
    },
    {
        path: '/maps/create',
        name: 'CreateMap',
        component: () => import('@/views/CreateMap.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/collections',
        name: 'Collections',
        component: () => import('@/views/Collections.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/collections/:id',
        name: 'CollectionDetails',
        component: () => import('@/views/CollectionDetails.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/lk',
        name: 'UserProfile',
        component: UserProfile,
        meta: { requiresAuth: true }
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@/views/NotFound.vue'),
        meta: { requiresAuth: false }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Защита маршрутов
router.beforeEach((to, from, next) => {
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

    if (requiresAuth && !isAuthenticated()) {
        next({ name: 'Login' });
    } else {
        next();
    }
})

export default router
