<template>
  <div class="app-container">
    <AppHeader />
    
    <div class="main-page-container">
      <!-- Левая панель со списком папок/карт -->
      <left-sidebar
        :folderStructure="folderStructure"
        @selectItem="handleSelectItem"
        @createNew="handleCreateNew"
        @moveItem="handleMoveItem"
        @renameItem="handleRenameItem"
        @deleteItem="confirmDeleteItem"
      />

      <!-- Правая панель -->
      <div class="right-content">
        <!-- Основной контент -->
        <div class="content-area">
          <!-- Панель создания отображается только когда её явно выбирают -->
          <create-panel
            v-if="showCreatePanel"
            @createMap="onCreateMap"
            @createFolder="onCreateFolder"
            @close="closeCreatePanel"
          />

          <!-- Если выбрали папку (folder), показываем её содержимое + переключатель вида -->
          <div v-else-if="selectedItem && selectedItem.type === 'folder'">
            <div class="view-controls">
              <h2>{{ selectedItem.name }}</h2>
              <switch-view @switchView="viewMode = $event" />
            </div>
            <folder-content-view
              :items="selectedItem.children"
              :viewMode="viewMode"
              @selectItem="handleSelectItem"
              @moveItem="handleMoveItem"
            />
          </div>

          <!-- Если выбрали карту -->
          <div v-else-if="selectedItem && selectedItem.type === 'map'">
            <map-preview 
              :map="selectedItem"
              @openMap="navigateToMap"
            />
          </div>

          <!-- Загрузка и сообщения об ошибках -->
          <div v-else-if="loading" class="loading-indicator">
            Загрузка содержимого...
          </div>
          <div v-else-if="error" class="error-message">
            {{ error }}
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно подтверждения удаления -->
    <div v-if="deleteConfirmation.show" class="delete-confirmation-overlay">
      <div class="delete-confirmation-dialog">
        <h3>Подтверждение удаления</h3>
        <p>{{ deleteConfirmation.message }}</p>
        <div class="confirmation-input">
          <label>Введите "{{ deleteConfirmation.itemName }}" для подтверждения:</label>
          <input v-model="deleteConfirmation.input" type="text" />
        </div>
        <div class="confirmation-buttons">
          <button 
            @click="executeDelete" 
            :disabled="deleteConfirmation.input !== deleteConfirmation.itemName"
            class="delete-button"
          >
            Удалить
          </button>
          <button @click="cancelDelete" class="cancel-button">Отмена</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import LeftSidebar from '@/components/LeftSidebar.vue'
import CreatePanel from '@/components/CreatePanel.vue'
import SwitchView from '@/components/SwitchView.vue'
import FolderContentView from '@/components/FolderContentView.vue'
import AppHeader from '@/components/AppHeader.vue'
import MapPreview from '@/components/MapPreview.vue'
import { getFolderStructure, createMap, moveMapToFolder, deleteMap, updateMap } from '@/services/maps'
import { createFolder, moveFolder, deleteFolder, renameFolder } from '@/services/folders'

export default {
  name: 'MainPage',
  components: {
    LeftSidebar,
    CreatePanel,
    SwitchView,
    FolderContentView,
    AppHeader,
    MapPreview
  },
  data() {
    return {
      folderStructure: [], // Начинаем с пустой структуры
      selectedItem: null,
      viewMode: 'list',
      showCreatePanel: false, // Флаг для отображения панели создания
      deleteConfirmation: {
        show: false,
        itemId: null,
        itemName: '',
        itemType: '',
        message: '',
        input: ''
      },
      loading: false,
      error: null
    }
  },
  async created() {
    // Загружаем структуру папок и карт при создании компонента
    await this.loadFolderStructure()
    
    // После загрузки структуры выбираем корневую папку
    this.selectRootFolder()
  },
  methods: {
    async loadFolderStructure() {
      this.loading = true
      this.error = null
      
      try {
        const data = await getFolderStructure()
        // Преобразуем структуру, полученную от API, в формат для компонентов
        this.folderStructure = this.transformFolderStructure(data)
        return true
      } catch (err) {
        console.error('Ошибка загрузки структуры:', err)
        this.error = 'Не удалось загрузить структуру папок и карт'
        return false
      } finally {
        this.loading = false
      }
    },
    
    // Преобразование структуры из API в формат для компонентов
    transformFolderStructure(data) {
      // Эта функция должна преобразовать данные из API в формат, подходящий
      // для компонентов FolderTreeItem и FolderContentView
      return data || []
    },
    
    // Выбор корневой папки
    selectRootFolder() {
      if (this.folderStructure.length > 0) {
        // Ищем первую папку в структуре
        const firstFolder = this.findFirstFolder(this.folderStructure)
        if (firstFolder) {
          this.selectedItem = firstFolder
        } else {
          // Если папок нет, берем первый элемент
          this.selectedItem = this.folderStructure[0]
        }
      }
    },
    
    // Рекурсивный поиск первой папки в структуре
    findFirstFolder(items) {
      for (const item of items) {
        if (item.type === 'folder') {
          return item
        }
      }
      return null
    },
    
    handleSelectItem(item) {
      // Для всех типов элементов просто выбираем их для отображения
      this.selectedItem = item;
      // Закрываем панель создания, если она была открыта
      this.showCreatePanel = false;
    },
    
    // Новый метод для навигации к карте
    navigateToMap(id, name) {
      this.$router.push({
        name: 'MapView',
        params: { id },
        query: { name }
      });
    },
    
    handleCreateNew() {
      // Показываем панель создания
      this.showCreatePanel = true
    },
    
    closeCreatePanel() {
      this.showCreatePanel = false
      // Если у нас ещё не выбран элемент, выбираем корневую папку
      if (!this.selectedItem) {
        this.selectRootFolder()
      }
    },
    
    async handleRenameItem({ id, newName }) {
      // Находим элемент по id
      const item = this.findItemById(id, this.folderStructure)
      if (!item) return
      
      // Сохраняем текущее имя элемента для отката в случае ошибки
      const oldName = item.name
      
      try {
        // Меняем имя локально для мгновенного отклика пользователю
        item.name = newName
        
        if (item.type === 'folder') {
          // Переименовываем папку через API
          await renameFolder(id, newName)
        } else if (item.type === 'map') {
          // Переименовываем карту через API
          await updateMap(id, { title: newName })
        }
        
        // Обновляем структуру после переименования
        await this.loadFolderStructure()
      } catch (err) {
        console.error('Ошибка при переименовании:', err)
        
        // Откатываем локальное изменение имени в случае ошибки
        const updatedItem = this.findItemById(id, this.folderStructure)
        if (updatedItem) {
          updatedItem.name = oldName // Возвращаем старое имя
        }
        
        // Показываем уведомление только если статус ответа указывает на ошибку
        if (err.response && err.response.status >= 400) {
          alert(`Не удалось переименовать элемент: ${err.response.data?.detail || 'Неизвестная ошибка'}`)
        }
      }
    },
    
    async handleMoveItem({ sourceId, targetId }) {
      try {
        // Найдем исходный элемент и целевую папку
        const sourceItem = this.findItemById(sourceId, this.folderStructure)
        
        if (!sourceItem) return
        
        if (sourceItem.type === 'map') {
          // Перемещаем карту через API
          await moveMapToFolder(sourceId, targetId)
        } else if (sourceItem.type === 'folder') {
          // Перемещаем папку через API
          await moveFolder(sourceId, targetId)
        }
        
        // Обновляем структуру после перемещения
        await this.loadFolderStructure()
      } catch (err) {
        console.error('Ошибка при перемещении:', err)
        // Показываем уведомление только если статус ответа указывает на ошибку
        if (err.response && err.response.status >= 400) {
          alert(`Не удалось переместить элемент: ${err.response.data?.detail || 'Неизвестная ошибка'}`)
        }
      }
    },
    
    findItemById(id, items) {
      // Рекурсивный поиск элемента по id
      for (const item of items) {
        if (item.id === id) {
          return item
        }
        if (item.type === 'folder' && item.children) {
          const found = this.findItemById(id, item.children)
          if (found) return found
        }
      }
      return null
    },
    
    removeItemFromStructure(id, items) {
      // Удаляем элемент из массива или вложенных массивов
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === id) {
          // Нашли объект в текущем массиве
          const removed = items.splice(i, 1)[0]
          return removed
        }
        
        if (items[i].type === 'folder' && items[i].children) {
          // Проверяем в детях
          const removed = this.removeItemFromStructure(id, items[i].children)
          if (removed) return removed
        }
      }
      return null
    },
    
    async onCreateMap({ mapType, mapName }) {
      try {
        // Определяем тип карты для API
        const mapTypeForApi = mapType === 'real' ? 'osm' : 'custom_image'
        
        // Подготавливаем данные для создания карты
        const mapData = {
          title: mapName,
          map_type: mapTypeForApi,
          is_public: false
        }
        
        // Если выбрана папка, добавляем ее ID в запрос
        if (this.selectedItem && this.selectedItem.type === 'folder') {
          mapData.folder_id = this.selectedItem.id
          // Также используем ID текущей папки для более надежного добавления
          mapData.current_folder_id = this.selectedItem.id
        }
        
        // Создаем карту через API
        await createMap(mapData)
        
        // Обновляем структуру после создания
        await this.loadFolderStructure()
        
        // Закрываем панель создания
        this.showCreatePanel = false
      } catch (err) {
        console.error('Ошибка при создании карты:', err)
        // Показываем уведомление только если статус ответа указывает на ошибку
        if (err.response && err.response.status >= 400) {
          alert(`Не удалось создать карту: ${err.response.data?.detail || 'Неизвестная ошибка'}`)
        }
      }
    },
    
    async onCreateFolder(folderName) {
      try {
        // Подготавливаем данные для создания папки
        const folderData = {
          title: folderName
        }
        
        // Если выбрана папка, добавляем ее как родительскую
        if (this.selectedItem && this.selectedItem.type === 'folder') {
          folderData.parent_folder_id = this.selectedItem.id
        }
        
        // Создаем папку через API
        await createFolder(folderData)
        
        // Обновляем структуру после создания
        await this.loadFolderStructure()
        
        // Закрываем панель создания
        this.showCreatePanel = false
      } catch (err) {
        console.error('Ошибка при создании папки:', err)
        // Показываем уведомление только если статус ответа указывает на ошибку
        if (err.response && err.response.status >= 400) {
          alert(`Не удалось создать папку: ${err.response.data?.detail || 'Неизвестная ошибка'}`)
        }
      }
    },
    
    confirmDeleteItem(item) {
      this.deleteConfirmation = {
        show: true,
        itemId: item.id,
        itemName: item.name,
        itemType: item.type,
        message: item.type === 'folder' 
          ? 'Внимание! Все содержимое папки будет удалено!' 
          : 'Вы уверены, что хотите удалить этот элемент?',
        input: ''
      }
    },
    
    async executeDelete() {
      if (this.deleteConfirmation.input !== this.deleteConfirmation.itemName) {
        return
      }
      
      try {
        if (this.deleteConfirmation.itemType === 'folder') {
          // Удаляем папку через API
          await deleteFolder(this.deleteConfirmation.itemId)
        } else {
          // Удаляем карту через API
          await deleteMap(this.deleteConfirmation.itemId)
        }
        
        // Обновляем структуру после удаления
        await this.loadFolderStructure()
        
        // Если удаляемый элемент был выбран, сбрасываем выбор и выбираем корневую папку
        if (this.selectedItem && this.selectedItem.id === this.deleteConfirmation.itemId) {
          this.selectRootFolder()
        }
        
        // Закрываем диалог подтверждения
        this.cancelDelete()
      } catch (err) {
        console.error('Ошибка при удалении:', err)
        // Показываем уведомление только если статус ответа указывает на ошибку
        if (err.response && err.response.status >= 400) {
          alert(`Не удалось удалить элемент: ${err.response.data?.detail || 'Неизвестная ошибка'}`)
        } else {
          // Закрываем диалог даже при ошибке, если она не от сервера
          this.cancelDelete()
        }
      }
    },
    cancelDelete() {
      this.deleteConfirmation = {
        show: false,
        itemId: null,
        itemName: '',
        itemType: '',
        message: '',
        input: ''
      }
    }
  }
}
</script>

<style scoped src="@/assets/css/views/MainPage.css"></style>