// src/api.js
import axios from 'axios';

// Создаём экземпляр axios с базовым URL для API
const api = axios.create({
    baseURL: 'https://topotik.onrender.com', // URL бэкенда
    headers: {
        'Content-Type': 'application/json',
    },
});

// Включаем токен авторизации в заголовки, если он есть
const setAuthToken = (token) => {
    if (token) {
        api.defaults.headers['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers['Authorization'];
    }
};

// Экспортируем клиент API
export { api, setAuthToken };
