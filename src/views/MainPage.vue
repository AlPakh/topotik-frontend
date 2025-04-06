<template>
  <div class="app-container">
    <!-- Шапка страницы -->
    <div class="header">
      <h1 class="app-title">ΤοποΤικ</h1>
      <div class="user-info">
        <span class="user-name">Имя пользователя <span class="user-icon">И</span></span>
      </div>
    </div>
    
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
          <!-- Название выбранного элемента -->
          <h2 v-if="selectedItem">{{ selectedItem.name }}</h2>

          <!-- Если ничего не выбрано, пусть по умолчанию будет панель создания -->
          <create-panel
            v-if="!selectedItem"
            @createMap="onCreateMap"
            @createFolder="onCreateFolder"
            @close="selectedItem = folderStructure.length > 0 ? folderStructure[0] : null"
          />

          <!-- Если выбрали папку (folder), показываем её содержимое + переключатель вида -->
          <div v-else-if="selectedItem.type === 'folder'">
            <div class="view-controls">
              <h3>{{ selectedItem.name }}</h3>
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
          <div v-else-if="selectedItem.type === 'map'">
            <p>Карта: {{ selectedItem.name }}</p>
            <p>Тип карты: {{ selectedItem.mapType === 'real' ? 'Карта местности' : 'Пользовательская карта' }}</p>
            <div class="map-preview">
              <p>Превью карты</p>
            </div>
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

export default {
  name: 'MainPage',
  components: {
    LeftSidebar,
    CreatePanel,
    SwitchView,
    FolderContentView
  },
  data() {
    return {
      folderStructure: [], // Начинаем с пустой структуры
      selectedItem: null,
      viewMode: 'list',
      deleteConfirmation: {
        show: false,
        itemId: null,
        itemName: '',
        itemType: '',
        message: '',
        input: ''
      }
    }
  },
  created() {
    // Это место для подключения к API в будущем
    // Пока используем локальные данные для тестирования
    this.folderStructure = []
  },
  methods: {
    handleSelectItem(item) {
      if (item.type === 'map' && item.mapType === 'real') {
        // Перейти на страницу карты при выборе карты реального мира
        this.$router.push({
          name: 'MapView',
          params: { id: item.id },
          query: { name: item.name }
        });
      } else {
        // Для папок и пользовательских карт просто выбираем их
        this.selectedItem = item;
      }
    },
    handleCreateNew() {
      // Нажали «Создать новый проект (карту/папку)» в левой панели
      this.selectedItem = null
    },
    handleRenameItem({ id, newName }) {
      // Находим элемент по id и обновляем его имя
      const item = this.findItemById(id, this.folderStructure)
      if (item) {
        item.name = newName
      }
    },
    handleMoveItem({ sourceId, targetId }) {
      // Найдем исходный элемент и целевую папку
      const sourceItem = this.findItemById(sourceId, this.folderStructure)
      const targetFolder = this.findItemById(targetId, this.folderStructure)
      
      if (!sourceItem || !targetFolder || targetFolder.type !== 'folder') {
        return
      }
      
      // Удаляем элемент из текущего местоположения
      this.removeItemFromStructure(sourceId, this.folderStructure)
      
      // Добавляем в новую папку
      targetFolder.children.push(sourceItem)
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
    onCreateMap({ mapType, mapName }) {
      const newMap = {
        id: Date.now(),
        name: mapName,
        type: 'map',
        mapType
      }
      
      // Если выбрана папка, то добавляем в нее, иначе в корень
      if (this.selectedItem && this.selectedItem.type === 'folder') {
        this.selectedItem.children.push(newMap)
      } else {
        this.folderStructure.push(newMap)
      }
      
      this.selectedItem = newMap
    },
    onCreateFolder(folderName) {
      const newFolder = {
        id: Date.now(),
        name: folderName,
        type: 'folder',
        children: []
      }
      
      // Если выбрана папка, то добавляем в нее, иначе в корень
      if (this.selectedItem && this.selectedItem.type === 'folder') {
        this.selectedItem.children.push(newFolder)
      } else {
        this.folderStructure.push(newFolder)
      }
      
      this.selectedItem = newFolder
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
    executeDelete() {
      if (this.deleteConfirmation.input === this.deleteConfirmation.itemName) {
        if (this.deleteConfirmation.itemType === 'folder') {
          this.removeItemFromStructure(this.deleteConfirmation.itemId, this.folderStructure)
        } else {
          // Для карт или других типов элементов
          this.removeItemFromStructure(this.deleteConfirmation.itemId, this.folderStructure)
        }
        
        // Если удаляемый элемент был выбран, сбрасываем выбор
        if (this.selectedItem && this.selectedItem.id === this.deleteConfirmation.itemId) {
          this.selectedItem = null
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
