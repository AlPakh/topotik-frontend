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
        @showRootContents="showRootDirectory"
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
            <div class="folder-preview-container">
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
            @click="initialConfirmDelete" 
            :disabled="deleteConfirmation.input !== deleteConfirmation.itemName"
            class="delete-button"
          >
            Удалить
          </button>
          <button @click="cancelDelete" class="cancel-button">Отмена</button>
        </div>
      </div>
    </div>

    <!-- Дополнительное модальное окно для подтверждения каскадного удаления папки -->
    <div v-if="cascadeDeleteConfirmation.show" class="cascade-confirmation-overlay">
      <div class="cascade-confirmation-dialog">
        <h3>ВНИМАНИЕ!</h3>
        <p class="danger-text">Все содержимое папки и подпапок будет удалено!</p>
        <p>Это действие нельзя отменить. Продолжить?</p>
        <div class="confirmation-buttons">
          <button 
            @click="executeDelete" 
            :disabled="!cascadeDeleteConfirmation.buttonEnabled"
            class="danger-button"
          >
            {{ cascadeDeleteConfirmation.buttonText }}
          </button>
          <button @click="cancelCascadeDelete" class="cancel-button">Отмена</button>
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
      cascadeDeleteConfirmation: {
        show: false,
        buttonEnabled: false,
        buttonText: 'Подтвердить (2)'
      },
      loading: false,
      error: null,
      cascadeDeleteTimer: null
    }
  },
  async created() {
    // Загружаем структуру папок и карт при создании компонента
    await this.loadFolderStructure()
    
    // После загрузки структуры выбираем корневую папку
    this.selectRootFolder()
  },
  methods: {
    // Новый метод для обновления представлений
    refreshViews() {
      // Обновляем структуру папок
      this.loadFolderStructure();
      
      // Если текущий выбранный элемент - "Корневой каталог", обновляем его содержимое
      if (this.selectedItem && this.selectedItem.id === 'root') {
        this.selectedItem.children = this.getRootItems();
      }
      // Если выбрана папка, обновляем её содержимое
      else if (this.selectedItem && this.selectedItem.type === 'folder') {
        const updatedItem = this.findItemById(this.selectedItem.id, this.folderStructure);
        if (updatedItem) {
          this.selectedItem = updatedItem;
        }
      }
    },
    
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
    
    // Выбор корневой папки или корневого каталога, если папок нет
    selectRootFolder() {
      if (this.folderStructure.length > 0) {
        // Ищем первую папку в структуре
        const firstFolder = this.findFirstFolder(this.folderStructure)
        if (firstFolder) {
          this.selectedItem = firstFolder
        } else {
          // Если папок нет, показываем корневой каталог
          this.showRootDirectory()
        }
      } else {
        // Если структура пустая, показываем корневой каталог
        this.showRootDirectory()
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
          this.$alert.error(`Не удалось переименовать элемент: ${err.response.data?.detail || 'Неизвестная ошибка'}`)
        }
      } finally {
        // Обновляем представления независимо от результата операции
        this.refreshViews();
      }
    },
    
    async handleMoveItem({ sourceId, targetId, checkCycle }) {
      try {
        // Найдем исходный элемент
        const sourceItem = this.findItemById(sourceId, this.folderStructure);
        
        if (!sourceItem) return;
        
        // Проверка на перемещение папки в свою дочернюю папку, только если задан флаг checkCycle
        if (sourceItem.type === 'folder' && targetId !== null && checkCycle && this.isDescendantFolder(sourceId, targetId)) {
          this.$alert.error('Нельзя переместить папку в одну из её подпапок. Это может создать циклическую зависимость.');
          return;
        }
        
        if (sourceItem.type === 'map') {
          // Перемещаем карту через API
          // Если targetId = null, перемещаем в корневой каталог
          await moveMapToFolder(sourceId, targetId);
        } else if (sourceItem.type === 'folder') {
          // Перемещаем папку через API
          // Если targetId = null, перемещаем в корневой каталог
          await moveFolder(sourceId, targetId);
        }
        
        // Обновляем структуру после перемещения
        await this.loadFolderStructure();
        
        // Если текущий выбранный элемент - "Корневой каталог", обновляем его содержимое
        if (this.selectedItem && this.selectedItem.id === 'root') {
          this.selectedItem.children = this.getRootItems();
        }
      } catch (err) {
        console.error('Ошибка при перемещении:', err);
        // Показываем уведомление только если статус ответа указывает на ошибку
        if (err.response && err.response.status >= 400) {
          this.$alert.error(`Не удалось переместить элемент: ${err.response.data?.detail || 'Неизвестная ошибка'}`);
        }
      } finally {
        // Обновляем представления независимо от результата операции
        this.refreshViews();
      }
    },
    
    // Проверяет, является ли целевая папка дочерней (прямо или косвенно) для исходной папки
    isDescendantFolder(sourceFolderId, targetFolderId) {
      // Проверка простого случая - перемещение в ту же папку
      if (sourceFolderId === targetFolderId) return true;
      
      // Найдем целевую папку
      const targetFolder = this.findItemById(targetFolderId, this.folderStructure);
      if (!targetFolder || targetFolder.type !== 'folder') return false;
      
      // Рекурсивная проверка - проходим по всем дочерним папкам исходной папки
      // и проверяем, нет ли среди них нашей целевой папки
      const checkChildren = (parentId) => {
        const parent = this.findItemById(parentId, this.folderStructure);
        if (!parent || !parent.children) return false;
        
        // Проверяем всех непосредственных детей
        for (const child of parent.children) {
          if (child.type === 'folder') {
            // Если нашли совпадение по ID, значит целевая папка - потомок исходной
            if (child.id === targetFolderId) return true;
            // Иначе проверяем детей этого ребенка
            if (checkChildren(child.id)) return true;
          }
        }
        
        return false;
      };
      
      return checkChildren(sourceFolderId);
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
        
        // Если выбрана папка (и это не виртуальный корневой каталог), добавляем ее ID в запрос
        if (this.selectedItem && this.selectedItem.type === 'folder' && this.selectedItem.id !== 'root') {
          mapData.folder_id = this.selectedItem.id
          // Также используем ID текущей папки для более надежного добавления
          mapData.current_folder_id = this.selectedItem.id
        }
        
        // Создаем карту через API
        await createMap(mapData)
        
        // Обновляем структуру после создания
        await this.loadFolderStructure()
        
        // Если текущий выбранный элемент - "Корневой каталог", обновляем его содержимое
        if (this.selectedItem && this.selectedItem.id === 'root') {
          this.selectedItem.children = this.getRootItems();
        }
        
        // Закрываем панель создания
        this.showCreatePanel = false
        
        // Показываем уведомление об успешном создании
        this.$alert.success(`Карта "${mapName}" успешно создана`)
      } catch (err) {
        console.error('Ошибка при создании карты:', err)
        // Показываем уведомление только если статус ответа указывает на ошибку
        if (err.response && err.response.status >= 400) {
          this.$alert.error(`Не удалось создать карту: ${err.response.data?.detail || 'Неизвестная ошибка'}`)
        }
      } finally {
        // Обновляем представления независимо от результата операции
        this.refreshViews();
      }
    },
    
    async onCreateFolder(folderName) {
      try {
        // Подготавливаем данные для создания папки
        const folderData = {
          title: folderName
        }
        
        // Если выбрана папка (и это не виртуальный корневой каталог), добавляем ее как родительскую
        if (this.selectedItem && this.selectedItem.type === 'folder' && this.selectedItem.id !== 'root') {
          folderData.parent_folder_id = this.selectedItem.id
        }
        
        // Создаем папку через API
        await createFolder(folderData)
        
        // Обновляем структуру после создания
        await this.loadFolderStructure()
        
        // Если текущий выбранный элемент - "Корневой каталог", обновляем его содержимое
        if (this.selectedItem && this.selectedItem.id === 'root') {
          this.selectedItem.children = this.getRootItems();
        }
        
        // Закрываем панель создания
        this.showCreatePanel = false
        
        // Показываем уведомление об успешном создании
        this.$alert.success(`Папка "${folderName}" успешно создана`)
      } catch (err) {
        console.error('Ошибка при создании папки:', err)
        // Показываем уведомление только если статус ответа указывает на ошибку
        if (err.response && err.response.status >= 400) {
          this.$alert.error(`Не удалось создать папку: ${err.response.data?.detail || 'Неизвестная ошибка'}`)
        }
      } finally {
        // Обновляем представления независимо от результата операции
        this.refreshViews();
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
    
    initialConfirmDelete() {
      // Если это папка, показываем дополнительное предупреждение о каскадном удалении
      if (this.deleteConfirmation.itemType === 'folder') {
        this.showCascadeDeleteConfirmation();
      } else {
        // Если это не папка, сразу выполняем удаление
        this.executeDelete();
      }
    },
    
    showCascadeDeleteConfirmation() {
      // Показываем дополнительное окно подтверждения
      this.cascadeDeleteConfirmation.show = true;
      this.cascadeDeleteConfirmation.buttonEnabled = false;
      this.cascadeDeleteConfirmation.buttonText = 'Подтвердить (2)';
      
      // Запускаем таймер, который будет обновлять текст и активировать кнопку через 2 секунды
      let countdown = 2;
      this.cascadeDeleteTimer = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          this.cascadeDeleteConfirmation.buttonEnabled = true;
          this.cascadeDeleteConfirmation.buttonText = 'Подтвердить';
          clearInterval(this.cascadeDeleteTimer);
        } else {
          this.cascadeDeleteConfirmation.buttonText = `Подтвердить (${countdown})`;
        }
      }, 1000);
    },
    
    cancelCascadeDelete() {
      // Отменяем дополнительное подтверждение и очищаем таймер
      this.cascadeDeleteConfirmation.show = false;
      if (this.cascadeDeleteTimer) {
        clearInterval(this.cascadeDeleteTimer);
        this.cascadeDeleteTimer = null;
      }
    },
    
    async executeDelete() {
      try {
        const { itemId, itemType, itemName } = this.deleteConfirmation;
        
        if (itemType === 'folder') {
          // Удаляем папку через API
          await deleteFolder(itemId);
        } else if (itemType === 'map') {
          // Удаляем карту через API
          await deleteMap(itemId);
        }
        
        // Показываем уведомление об успешном удалении
        this.$alert.success(`${itemType === 'folder' ? 'Папка' : 'Карта'} "${itemName}" успешно удалена`);
        
        // Обновляем структуру после удаления
        await this.loadFolderStructure();
        
        // Если текущий выбранный элемент - "Корневой каталог", обновляем его содержимое
        if (this.selectedItem && this.selectedItem.id === 'root') {
          this.selectedItem.children = this.getRootItems();
        }
        
        // Если удаленный элемент был выбран, переключаемся на корневую папку
        if (this.selectedItem && this.selectedItem.id === itemId) {
          this.selectRootFolder();
        }
      } catch (err) {
        console.error('Ошибка при удалении:', err);
        // Показываем уведомление только если статус ответа указывает на ошибку
        if (err.response && err.response.status >= 400) {
          this.$alert.error(`Не удалось удалить элемент: ${err.response.data?.detail || 'Неизвестная ошибка'}`);
        }
      } finally {
        // Сбрасываем состояние диалогов подтверждения
        this.deleteConfirmation.show = false;
        this.cascadeDeleteConfirmation.show = false;
        
        // Очищаем таймер, если он был запущен
        if (this.cascadeDeleteTimer) {
          clearInterval(this.cascadeDeleteTimer);
          this.cascadeDeleteTimer = null;
        }
        
        // Обновляем представления независимо от результата операции
        this.refreshViews();
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
      };
      // Также отменяем каскадное подтверждение, если оно было открыто
      this.cancelCascadeDelete();
    },
    
    // Показать корневой каталог (элементы без родительских папок)
    showRootDirectory() {
      // Создаем виртуальный элемент для представления корневого каталога
      const rootFolder = {
        id: 'root', // Символический ID, не используется в запросах к API
        type: 'folder',
        name: 'Корневой каталог',
        children: this.getRootItems()
      };
      
      // Выбираем этот виртуальный элемент для отображения
      this.selectedItem = rootFolder;
      
      // Закрываем панель создания, если она была открыта
      this.showCreatePanel = false;
    },
    
    // Получить элементы корневого каталога (без родительских папок)
    getRootItems() {
      return this.folderStructure.filter(item => {
        if (item.type === 'folder') {
          // Включаем только корневые папки (без родительской папки)
          return !item.parent_folder_id;
        } else {
          // Для карт проверяем, есть ли они в корневом каталоге
          return true; // Фильтрация карт выполняется на сервере
        }
      });
    },
  },
  
  beforeUnmount() {
    // Очищаем таймер при уничтожении компонента
    if (this.cascadeDeleteTimer) {
      clearInterval(this.cascadeDeleteTimer);
    }
  }
}
</script>

<style scoped src="@/assets/css/views/MainPage.css"></style>

<style scoped>
/* Стили для дополнительного диалогового окна каскадного удаления */
.cascade-confirmation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1100; /* Выше чем обычное подтверждение */
}

.cascade-confirmation-dialog {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  padding: 24px;
  width: 90%;
  max-width: 500px;
  text-align: center;
}

.danger-text {
  color: #ff0000;
  font-weight: bold;
  font-size: 18px;
  margin: 16px 0;
}

.confirmation-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
}

.danger-button {
  background-color: #ff3b30;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.danger-button:hover:not(:disabled) {
  background-color: #ff5e54;
}

.danger-button:disabled {
  background-color: #ffccc9;
  cursor: not-allowed;
}

.cancel-button {
  background-color: #f1f1f1;
  color: #333;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.cancel-button:hover {
  background-color: #ddd;
}
</style>