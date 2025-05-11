import { api } from '@/api'

/**
 * Создать новую папку
 * @param {Object} folderData - Данные папки
 * @param {string} folderData.title - Название папки
 * @param {string} [folderData.parent_folder_id] - ID родительской папки (опционально)
 */
export const createFolder = async (folderData) => {
    const response = await api.post('/folders/', folderData)
    return response.data
}

/**
 * Получить список папок пользователя
 */
export const getUserFolders = async () => {
    const response = await api.get('/folders/user')
    return response.data
}

/**
 * Получить содержимое папки
 * @param {string} folderId - ID папки
 */
export const getFolderContent = async (folderId) => {
    const response = await api.get(`/folders/${folderId}/content`)
    return response.data
}

/**
 * Переместить папку
 * @param {string} folderId - ID папки
 * @param {string} newParentId - ID новой родительской папки
 */
export const moveFolder = async (folderId, newParentId) => {
    const response = await api.put(`/folders/${folderId}/move`, {
        new_parent_id: newParentId
    })
    return response.data
}

/**
 * Переименовать папку
 * @param {string} folderId - ID папки
 * @param {string} newTitle - Новое название
 */
export const renameFolder = async (folderId, newTitle) => {
    const response = await api.put(`/folders/${folderId}`, {
        title: newTitle
    })
    return response.data
}

/**
 * Удалить папку
 * @param {string} folderId - ID папки
 */
export const deleteFolder = async (folderId) => {
    const response = await api.delete(`/folders/${folderId}`)
    return response.data
} 