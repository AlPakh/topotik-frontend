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
    console.log('setAuthToken вызван с токеном:', token ? `${token.substring(0, 10)}...` : 'null');

    if (token) {
        console.log('Устанавливаем заголовок Authorization в формате: Bearer + token');
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('Заголовок после установки:',
            api.defaults.headers.common['Authorization'] ?
                `${api.defaults.headers.common['Authorization'].substring(0, 20)}...` :
                'отсутствует'
        );
    } else {
        console.log('Удаляем заголовок Authorization');
        delete api.defaults.headers.common['Authorization'];
    }
};

// Инициализация токена при загрузке приложения
const token = Cookies.get('access_token');
if (token) {
    console.log('Инициализация API с токеном из cookie:', token.substring(0, 10) + '...');
    setAuthToken(token);
} else {
    console.log('Инициализация API без токена (не найден в cookie)');
}

// Добавляем перехватчик запросов, чтобы проверять заголовки перед отправкой
api.interceptors.request.use(
    config => {
        console.log('Отправляем запрос на:', config.url);
        console.log('Метод запроса:', config.method.toUpperCase());
        console.log('Заголовки запроса:', {
            'Content-Type': config.headers['Content-Type'],
            'Authorization': config.headers.Authorization ?
                `${config.headers.Authorization.substring(0, 20)}...` :
                'отсутствует'
        });

        if (config.data) {
            console.log('Данные запроса:', JSON.stringify(config.data));
        }

        return config;
    },
    error => {
        console.error('Ошибка в перехватчике запросов:', error);
        return Promise.reject(error);
    }
);

// Добавляем перехватчик ответов для обработки ошибок авторизации
api.interceptors.response.use(
    response => {
        console.log('Получен ответ от:', response.config.url);
        console.log('Статус ответа:', response.status);
        console.log('Данные ответа:', response.data);
        return response;
    },
    error => {
        // Если ошибка 401, пробуем обновить токен из cookie
        if (error.response && error.response.status === 401) {
            console.log('Ошибка авторизации, пробуем восстановить токен из cookie');
            const token = Cookies.get('access_token');
            if (token) {
                console.log('Найден токен в cookie:', token.substring(0, 10) + '...');
                // Повторно устанавливаем токен и пробуем запрос снова
                setAuthToken(token);

                console.log('Токен переустановлен, но не повторяем запрос автоматически');
                // Для сложных случаев можно попробовать повторить запрос
                // const originalRequest = error.config;
                // return api(originalRequest);
            } else {
                console.warn('Токен не найден в cookie при 401 ошибке');
            }
        }
        return Promise.reject(error);
    }
);

// Экспортируем клиент API
export { api };
