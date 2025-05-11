// src/api.js
import axios from 'axios';
import Cookies from 'js-cookie';

// Создаём экземпляр axios с базовым URL для API
const api = axios.create({
    baseURL: 'http://localhost:8000', // URL бэкенда
    headers: {
        'Content-Type': 'application/json',
    },
});

// Включаем токен авторизации в заголовки, если он есть
export const setAuthToken = (token) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

// Инициализация токена при загрузке приложения
const token = Cookies.get('access_token');
if (token) {
    setAuthToken(token);
}

// Экспортируем клиент API
export { api };
