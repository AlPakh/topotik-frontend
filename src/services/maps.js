import { api } from '@/api'

/**
 * Получить список всех карт пользователя
 */
export const getUserMaps = async () => {
    const response = await api.get('/maps/user')
    return response.data
}

/**
 * Получить все доступные карты (аналогично getUserMaps, для совместимости)
 */
export const getMaps = async () => {
    const response = await api.get('/maps/user')
    return response.data
}

/**
 * Получить карту по ID
 * @param {string} mapId - ID карты
 */
export const getMapById = async (mapId) => {
    try {
        console.log(`Получение данных карты: ${mapId}`);
        const response = await api.get(`/maps/${mapId}/with-image`);

        // Проверяем наличие фонового изображения и форматируем URL правильно
        if (response.data && response.data.background_image_id) {
            console.log('Карта имеет фоновое изображение:', response.data.background_image_id);

            // Проверяем, содержит ли ответ уже URL изображения
            if (!response.data.background_image_url) {
                // Если URL отсутствует, формируем его из ID
                const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:8000';
                response.data.background_image_url = `${API_URL}/images/proxy/${response.data.background_image_id}`;
                console.log('Сформирован URL изображения:', response.data.background_image_url);
            }
        } else {
            console.log('Карта не имеет фонового изображения');
        }

        return response.data;
    } catch (error) {
        console.error('Ошибка при получении данных карты:', error);
        throw error;
    }
}

/**
 * Создать новую карту
 * @param {Object} mapData - Данные карты
 * @param {string} mapData.title - Название карты
 * @param {string} mapData.map_type - Тип карты ('osm' или 'custom_image')
 * @param {boolean} mapData.is_public - Является ли карта публичной
 * @param {string} [mapData.folder_id] - ID папки, в которую добавить карту (опционально)
 */
export const createMap = async (mapData) => {
    const response = await api.post('/maps/', mapData)
    return response.data
}

/**
 * Обновить существующую карту
 * @param {string} mapId - ID карты
 * @param {Object} mapData - Данные для обновления
 */
export const updateMap = async (mapId, mapData) => {
    const response = await api.put(`/maps/${mapId}`, mapData)
    return response.data
}

/**
 * Обновить фоновое изображение карты
 * @param {string} mapId - ID карты
 * @param {string} imageId - ID изображения
 */
export const updateMapBackground = async (mapId, imageId) => {
    console.log(`Вызов API для обновления фонового изображения карты ${mapId} с изображением ${imageId}`)
    const response = await api.put(`/maps/${mapId}/background-image`, {
        background_image_id: imageId
    })
    console.log('Ответ API при обновлении фона карты:', response.data)
    return response.data
}

/**
 * Переместить карту в другую папку
 * @param {string} mapId - ID карты
 * @param {string} folderId - ID новой папки
 */
export const moveMapToFolder = async (mapId, folderId) => {
    const response = await api.put(`/maps/${mapId}/move`, { folder_id: folderId })
    return response.data
}

/**
 * Удалить карту
 * @param {string} mapId - ID карты
 */
export const deleteMap = async (mapId) => {
    const response = await api.delete(`/maps/${mapId}`)
    return response.data
}

/**
 * Получить структуру папок и карт пользователя
 */
export const getFolderStructure = async () => {
    const response = await api.get('/folders/structure')
    return response.data
} 