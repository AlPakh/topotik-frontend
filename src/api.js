// src/api.js
import axios from 'axios';
import Cookies from 'js-cookie';

// Получаем URL API из переменных окружения с фоллбэком на локальный сервер
const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:8000';
console.log('Используется API URL:', API_URL);

// Создаём экземпляр axios с базовым URL для API
const api = axios.create({
    baseURL: API_URL, // URL бэкенда из переменной окружения
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

// API для работы с картами
export const mapsApi = {
    // Получение всех карт пользователя
    async getUserMaps() {
        const token = Cookies.get('access_token');
        return await fetch(`${API_URL}/maps`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }).then(res => res.json());
    },

    // Создание новой карты
    async createMap(data) {
        const token = Cookies.get('access_token');
        return await fetch(`${API_URL}/maps`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        }).then(res => res.json());
    },

    // Создание пользовательской карты с фоновым изображением
    async createCustomMap(data, backgroundImageId = null) {
        const token = Cookies.get('access_token');
        const mapData = {
            ...data,
            is_custom: true,
            background_image_id: backgroundImageId
        };

        return await fetch(`${API_URL}/maps`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(mapData)
        }).then(res => res.json());
    },

    // Обновление фонового изображения для карты
    async updateMapBackground(mapId, imageId) {
        const token = Cookies.get('access_token');
        return await fetch(`${API_URL}/maps/${mapId}/background-image`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ background_image_id: imageId })
        }).then(res => res.json());
    },

    // Удаление карты с удалением фонового изображения, если оно не используется в других картах
    async deleteMapWithImage(mapId) {
        const token = Cookies.get('access_token');
        return await fetch(`${API_URL}/maps/${mapId}/with-image`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }).then(res => res.json());
    },
};

// API для работы с изображениями
export const imagesApi = {
    // Загрузка изображения на сервер
    async uploadImage(file, description = null) {
        const token = Cookies.get('access_token');

        const formData = new FormData();
        formData.append('file', file);
        if (description) {
            formData.append('description', description);
        }

        return await fetch(`${API_URL}/images/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        }).then(res => res.json());
    },

    // Получение списка изображений пользователя
    async getUserImages(limit = 50, offset = 0) {
        const token = Cookies.get('access_token');
        return await fetch(`${API_URL}/images/list?limit=${limit}&offset=${offset}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }).then(res => res.json());
    },

    // Получение информации об изображении по ID
    async getImage(imageId) {
        const token = Cookies.get('access_token');
        return await fetch(`${API_URL}/images/${imageId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }).then(res => res.json());
    },

    // Удаление изображения
    async deleteImage(imageId) {
        const token = Cookies.get('access_token');
        return await fetch(`${API_URL}/images/${imageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }).then(res => {
            if (!res.ok) {
                throw new Error(`Ошибка при удалении изображения: ${res.status}`);
            }
            return res.json();
        });
    }
};
