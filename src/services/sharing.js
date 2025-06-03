import { api } from '@/api';

export const sharingService = {
    /**
     * Получить список всех шерингов для ресурса
     * @param {string} resourceType - Тип ресурса ('map' или 'collection')
     * @param {string} resourceId - ID ресурса
     * @returns {Promise<Array>} - Список шерингов
     */
    async getResourceSharing(resourceType, resourceId) {
        const response = await api.get(`/sharing/resource/${resourceType}/${resourceId}`);
        return response.data;
    },

    /**
     * Создать новую запись шеринга
     * @param {string} resourceType - Тип ресурса ('map' или 'collection')
     * @param {string} resourceId - ID ресурса
     * @param {Object} options - Опции шеринга
     * @param {string} [options.email] - Email пользователя для шеринга
     * @param {string} [options.accessLevel='view'] - Уровень доступа ('view' или 'edit')
     * @param {boolean} [options.isPublic=false] - Публичный доступ
     * @param {boolean} [options.isActive=true] - Активен ли шеринг
     * @param {boolean} [options.generateSlug=false] - Сгенерировать slug для ссылки
     * @param {boolean} [options.is_embed=false] - Является ли виджетом для встраивания
     * @returns {Promise<Object>} - Созданная запись шеринга
     */
    async createSharing(resourceType, resourceId, options = {}) {
        const data = {
            resource_type: resourceType,
            resource_id: resourceId,
            access_level: options.accessLevel || 'view',
            is_public: options.isPublic || false,
            is_active: options.isActive !== undefined ? options.isActive : true,
        };

        // Если указан email, добавляем в запрос
        if (options.email) {
            data.user_email = options.email;
        }

        // Если указан user_email, добавляем в запрос
        if (options.user_email) {
            data.user_email = options.user_email;
        }

        // Если указан slug, добавляем в запрос
        if (options.generateSlug) {
            data.generate_slug = true;
        }

        // Если указан флаг is_embed, добавляем в запрос
        if (options.is_embed) {
            data.is_embed = true;
        }

        const response = await api.post(`/sharing/create`, data);
        return response.data;
    },

    /**
     * Обновить запись шеринга
     * @param {string} sharingId - ID записи шеринга
     * @param {Object} updateData - Данные для обновления
     * @returns {Promise<Object>} - Обновленная запись шеринга
     */
    async updateSharing(sharingId, updateData) {
        const response = await api.put(`/sharing/${sharingId}`, updateData);
        return response.data;
    },

    /**
     * Отозвать доступ к ресурсу (деактивировать запись шеринга)
     * @param {string} sharingId - ID записи шеринга
     * @returns {Promise<Object>} - Результат операции
     */
    async revokeSharing(sharingId) {
        const response = await api.post(`/sharing/${sharingId}/revoke`);
        return response.data;
    },

    /**
     * Удалить запись шеринга
     * @param {string} sharingId - ID записи шеринга
     * @returns {Promise<Object>} - Результат операции
     */
    async deleteSharing(sharingId) {
        const response = await api.delete(`/sharing/${sharingId}`);
        return response.data;
    },

    /**
     * Получить HTML-код для встраивания виджета
     * @param {string} sharingId - ID записи шеринга
     * @returns {Promise<Object>} - Данные с HTML-кодом для встраивания
     */
    async getEmbedCode(sharingId) {
        const response = await api.get(`/sharing/embed/${sharingId}/code`);
        return response.data;
    },

    /**
     * Создать новый виджет для встраивания
     * @param {string} resourceType - Тип ресурса ('map' или 'collection')
     * @param {string} resourceId - ID ресурса
     * @returns {Promise<Object>} - Данные с HTML-кодом для встраивания
     */
    async createEmbedWidget(resourceType, resourceId) {
        const response = await api.post(`/sharing/embed/${resourceType}/${resourceId}`);
        return response.data;
    }
}; 