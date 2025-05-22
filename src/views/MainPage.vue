<template>
  <div class="app-container">
    <AppHeader />

    <div class="main-page-container">
      <!-- Левая панель со списком папок/карт -->
      <left-sidebar
        ref="leftSidebar"
        :folderStructure="folderStructure"
        :expandedFolders="expandedFolders"
        @selectItem="handleSelectItem"
        @createNew="handleCreateNew"
        @moveItem="handleMoveItem"
        @renameItem="handleRenameItem"
        @deleteItem="confirmDeleteItem"
        @showRootContents="showRootDirectory"
        @folderToggled="handleFolderToggled"
        @updateExpandedFolders="updateExpandedFolders"
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
              @upload-image="handleImageUpload"
              @openMap="handleOpenMap"
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
          <label
            >Введите "{{ deleteConfirmation.itemName }}" для
            подтверждения:</label
          >
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
    <div
      v-if="cascadeDeleteConfirmation.show"
      class="cascade-confirmation-overlay"
    >
      <div class="cascade-confirmation-dialog">
        <h3>ВНИМАНИЕ!</h3>
        <p class="danger-text">
          Все содержимое папки и подпапок будет удалено!
        </p>
        <p>Это действие нельзя отменить. Продолжить?</p>
        <div class="confirmation-buttons">
          <button
            @click="executeDelete"
            :disabled="!cascadeDeleteConfirmation.buttonEnabled"
            class="danger-button"
          >
            {{ cascadeDeleteConfirmation.buttonText }}
          </button>
          <button @click="cancelCascadeDelete" class="cancel-button">
            Отмена
          </button>
        </div>
      </div>
    </div>

    <!-- Компонент загрузки изображения -->
    <image-uploader
      v-if="showImageUploader"
      :mapId="currentMapId"
      @close="closeImageUploader"
      @upload-success="handleImageUploadSuccess"
    />
  </div>
</template>

<script>
import LeftSidebar from "@/components/LeftSidebar.vue";
import CreatePanel from "@/components/CreatePanel.vue";
import SwitchView from "@/components/SwitchView.vue";
import FolderContentView from "@/components/FolderContentView.vue";
import AppHeader from "@/components/AppHeader.vue";
import MapPreview from "@/components/MapPreview.vue";
import ImageUploader from "@/components/ImageUploader.vue";
import {
  getFolderStructure,
  createMap,
  moveMapToFolder,
  deleteMap,
  updateMap,
  getMapById,
} from "@/services/maps";
import {
  createFolder,
  moveFolder,
  deleteFolder,
  renameFolder,
} from "@/services/folders";
import {
  saveExpandedFolders,
  getExpandedFolders,
  saveLastOpenedFolder,
  getLastOpenedFolder,
} from "@/services/folderState";

export default {
  name: "MainPage",
  components: {
    LeftSidebar,
    CreatePanel,
    SwitchView,
    FolderContentView,
    AppHeader,
    MapPreview,
    ImageUploader,
  },
  data() {
    return {
      folderStructure: [], // Начинаем с пустой структуры
      selectedItem: null,
      viewMode: "list",
      showCreatePanel: false, // Флаг для отображения панели создания
      showImageUploader: false, // Флаг для отображения загрузчика изображений
      currentMapId: null, // ID карты для загрузки изображения
      deleteConfirmation: {
        show: false,
        itemId: null,
        itemName: "",
        itemType: "",
        message: "",
        input: "",
      },
      cascadeDeleteConfirmation: {
        show: false,
        buttonEnabled: false,
        buttonText: "Подтвердить (2)",
      },
      loading: false,
      error: null,
      cascadeDeleteTimer: null,
      expandedFolders: [], // Новое поле для хранения списка раскрытых папок
    };
  },
  async created() {
    // Загружаем список раскрытых папок из cookie
    this.expandedFolders = getExpandedFolders();

    // Загружаем структуру папок и карт при создании компонента
    const loadSuccess = await this.loadFolderStructure();

    // Пытаемся восстановить последнюю выбранную папку
    if (loadSuccess) {
      await this.tryRestoreLastFolder();
    } else {
      // После загрузки структуры выбираем корневую папку
      this.selectRootFolder();
    }
  },
  methods: {
    // Пытаемся восстановить последнюю посещенную папку из cookies
    async tryRestoreLastFolder() {
      const lastFolder = getLastOpenedFolder();

      if (lastFolder && lastFolder.id) {
        // Проверяем, существует ли такая папка
        const folderExists = this.findItemById(
          lastFolder.id,
          this.folderStructure
        );

        if (folderExists) {
          // Если папка существует, выбираем ее
          this.selectedItem = folderExists;

          // И раскрываем путь к ней в левой панели
          this.$nextTick(() => {
            this.$refs.leftSidebar.expandPathToFolder(lastFolder.id);
          });
        } else {
          // Если папки нет, показываем сообщение и выбираем корневую
          this.$alert.error(
            "Не удалось открыть последнюю папку, так как она больше не существует"
          );
          this.selectRootFolder();
        }
      } else {
        // Если информации о последней папке нет, выбираем корневую
        this.selectRootFolder();
      }
    },

    // Обработчик события разворачивания/сворачивания папки
    handleFolderToggled(data) {
      const { folderId, isOpen } = data;

      // Обновляем список развернутых папок
      if (isOpen) {
        // Добавляем папку в список раскрытых, если ее там еще нет
        if (!this.expandedFolders.includes(folderId)) {
          this.expandedFolders = [...this.expandedFolders, folderId];
        }
      } else {
        // Удаляем папку из списка раскрытых
        this.expandedFolders = this.expandedFolders.filter(
          (id) => id !== folderId
        );
      }

      // Сохраняем обновленный список в cookie
      saveExpandedFolders(this.expandedFolders);
    },

    // Обновления списка раскрытых папок
    updateExpandedFolders(newExpandedFolders) {
      this.expandedFolders = newExpandedFolders;
      saveExpandedFolders(this.expandedFolders);
    },

    // Новый метод для обновления представлений
    refreshViews() {
      // Обновляем структуру папок
      this.loadFolderStructure();

      // Если текущий выбранный элемент - "Корневой каталог", обновляем его содержимое
      if (this.selectedItem && this.selectedItem.id === "root") {
        this.selectedItem.children = this.getRootItems();
      }
      // Если выбрана папка, обновляем её содержимое
      else if (this.selectedItem && this.selectedItem.type === "folder") {
        const updatedItem = this.findItemById(
          this.selectedItem.id,
          this.folderStructure
        );
        if (updatedItem) {
          this.selectedItem = updatedItem;
        }
      }
    },

    async loadFolderStructure() {
      this.loading = true;
      this.error = null;

      try {
        const data = await getFolderStructure();
        // Преобразуем структуру, полученную от API, в формат для компонентов
        this.folderStructure = this.transformFolderStructure(data);
        return true;
      } catch (err) {
        console.error("Ошибка загрузки структуры:", err);
        this.error = "Не удалось загрузить структуру папок и карт";
        return false;
      } finally {
        this.loading = false;
      }
    },

    // Преобразование структуры из API в формат для компонентов
    transformFolderStructure(data) {
      // Эта функция должна преобразовать данные из API в формат, подходящий
      // для компонентов FolderTreeItem и FolderContentView
      return data || [];
    },

    // Выбор корневой папки или корневого каталога, если папок нет
    selectRootFolder() {
      if (this.folderStructure.length > 0) {
        // Ищем первую папку в структуре
        const firstFolder = this.findFirstFolder(this.folderStructure);
        if (firstFolder) {
          this.selectedItem = firstFolder;

          // Сохраняем информацию о выбранной папке
          saveLastOpenedFolder({
            id: firstFolder.id,
            name: firstFolder.name,
            type: "folder",
          });
        } else {
          // Если папок нет, показываем корневой каталог
          this.showRootDirectory();
        }
      } else {
        // Если структура пустая, показываем корневой каталог
        this.showRootDirectory();
      }
    },

    // Рекурсивный поиск первой папки в структуре
    findFirstFolder(items) {
      for (const item of items) {
        if (item.type === "folder") {
          return item;
        }
      }
      return null;
    },

    // Обработчик выбора элемента (папки или карты)
    async handleSelectItem(item) {
      try {
        this.loading = true;
        this.error = null;

        // Если выбрана папка (folder), загружаем её содержимое
        if (item.type === "folder") {
          console.log("Выбрана папка:", item.name);
          this.selectedItem = item;
          this.currentFolderId = item.id;

          // Сохраняем папку в cookie (если это не корневая папка)
          if (item.id !== "root") {
            saveLastOpenedFolder({
              id: item.id,
              name: item.name,
              type: "folder",
            });

            // Раскрываем путь к папке в левой панели
            this.$nextTick(() => {
              if (this.$refs.leftSidebar) {
                this.$refs.leftSidebar.expandPathToFolder(item.id);
              }
            });
          }
        }
        // Если выбрана карта, обрабатываем её
        else if (item.type === "map") {
          console.log("Выбрана карта:", item.name || item.title);

          // Загружаем полные данные карты, чтобы получить информацию о фоновом изображении
          try {
            const mapData = await getMapById(item.id);
            console.log("Загружены полные данные карты:", mapData);

            // Объединяем данные карты с уже существующими (чтобы сохранить поля из структуры папок)
            this.selectedItem = {
              ...item,
              ...mapData,
              id: item.id, // Сохраняем оригинальный ID из структуры папок
              type: "map", // Убеждаемся, что тип остается 'map'
            };

            console.log("Данные для отображения карты:", this.selectedItem);
          } catch (error) {
            console.error("Ошибка при загрузке полных данных карты:", error);
            // Если не удалось загрузить полные данные, используем то, что есть
            this.selectedItem = item;
          }
        }

        // Закрываем панель создания, если она была открыта
        this.showCreatePanel = false;

        this.loading = false;
        this.error = null;
      } catch (error) {
        console.error("Ошибка при выборе элемента:", error);
        this.loading = false;
        this.error = "Ошибка при загрузке элемента. Попробуйте позже.";
      }
    },

    // Метод для навигации к карте
    navigateToMap(id) {
      // Находим карту по ID для определения её типа
      const mapItem = this.findItemById(id, this.folderStructure);

      if (!mapItem) {
        console.error("Карта не найдена:", id);
        return;
      }

      console.log("Данные карты для навигации:", mapItem);

      // Определяем маршрут в зависимости от типа карты
      // Учитываем оба возможных поля типа карты (map_type и mapType)
      const mapType = mapItem.map_type || mapItem.mapType;
      let route = "MapView"; // По умолчанию открываем как OSM карту

      if (mapType === "custom_image" || mapType === "custom") {
        route = "CustomMapView";
      }

      console.log(
        "Переход на маршрут:",
        route,
        "с ID:",
        id,
        "и названием:",
        mapItem.title || mapItem.name
      );

      this.$router.push({
        name: route,
        params: { id },
        query: { name: mapItem.title || mapItem.name },
      });
    },

    handleCreateNew() {
      // Показываем панель создания
      this.showCreatePanel = true;
    },

    closeCreatePanel() {
      this.showCreatePanel = false;
      // Если у нас ещё не выбран элемент, выбираем корневую папку
      if (!this.selectedItem) {
        this.selectRootFolder();
      }
    },

    async handleRenameItem({ id, newName }) {
      // Находим элемент по id
      const item = this.findItemById(id, this.folderStructure);
      if (!item) return;

      // Сохраняем текущее имя элемента для отката в случае ошибки
      const oldName = item.name;

      try {
        // Меняем имя локально для мгновенного отклика пользователю
        item.name = newName;

        if (item.type === "folder") {
          // Переименовываем папку через API
          await renameFolder(id, newName);
        } else if (item.type === "map") {
          // Переименовываем карту через API
          await updateMap(id, { title: newName });
        }

        // Обновляем структуру после переименования
        await this.loadFolderStructure();
      } catch (err) {
        console.error("Ошибка при переименовании:", err);

        // Откатываем локальное изменение имени в случае ошибки
        const updatedItem = this.findItemById(id, this.folderStructure);
        if (updatedItem) {
          updatedItem.name = oldName; // Возвращаем старое имя
        }

        // Показываем уведомление только если статус ответа указывает на ошибку
        if (err.response && err.response.status >= 400) {
          this.$alert.error(
            `Не удалось переименовать элемент: ${
              err.response.data?.detail || "Неизвестная ошибка"
            }`
          );
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
        if (
          sourceItem.type === "folder" &&
          targetId !== null &&
          checkCycle &&
          this.isDescendantFolder(sourceId, targetId)
        ) {
          this.$alert.error(
            "Нельзя переместить папку в одну из её подпапок. Это может создать циклическую зависимость."
          );
          return;
        }

        if (sourceItem.type === "map") {
          // Перемещаем карту через API
          // Если targetId = null, перемещаем в корневой каталог
          await moveMapToFolder(sourceId, targetId);
        } else if (sourceItem.type === "folder") {
          // Перемещаем папку через API
          // Если targetId = null, перемещаем в корневой каталог
          await moveFolder(sourceId, targetId);
        }

        // Обновляем структуру после перемещения
        await this.loadFolderStructure();

        // Если текущий выбранный элемент - "Корневой каталог", обновляем его содержимое
        if (this.selectedItem && this.selectedItem.id === "root") {
          this.selectedItem.children = this.getRootItems();
        }
      } catch (err) {
        console.error("Ошибка при перемещении:", err);
        // Показываем уведомление только если статус ответа указывает на ошибку
        if (err.response && err.response.status >= 400) {
          this.$alert.error(
            `Не удалось переместить элемент: ${
              err.response.data?.detail || "Неизвестная ошибка"
            }`
          );
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
      const targetFolder = this.findItemById(
        targetFolderId,
        this.folderStructure
      );
      if (!targetFolder || targetFolder.type !== "folder") return false;

      // Рекурсивная проверка - проходим по всем дочерним папкам исходной папки
      // и проверяем, нет ли среди них нашей целевой папки
      const checkChildren = (parentId) => {
        const parent = this.findItemById(parentId, this.folderStructure);
        if (!parent || !parent.children) return false;

        // Проверяем всех непосредственных детей
        for (const child of parent.children) {
          if (child.type === "folder") {
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
          return item;
        }
        if (item.type === "folder" && item.children) {
          const found = this.findItemById(id, item.children);
          if (found) return found;
        }
      }
      return null;
    },

    removeItemFromStructure(id, items) {
      // Удаляем элемент из массива или вложенных массивов
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === id) {
          // Нашли объект в текущем массиве
          const removed = items.splice(i, 1)[0];
          return removed;
        }

        if (items[i].type === "folder" && items[i].children) {
          // Проверяем в детях
          const removed = this.removeItemFromStructure(id, items[i].children);
          if (removed) return removed;
        }
      }
      return null;
    },

    async onCreateMap({ mapType, mapName }) {
      try {
        // Определяем тип карты для API
        const mapTypeForApi = mapType === "real" ? "osm" : "custom_image";

        // Подготавливаем данные для создания карты
        const mapData = {
          title: mapName,
          map_type: mapTypeForApi,
          is_public: false,
        };

        // Если выбрана папка (и это не виртуальный корневой каталог), добавляем ее ID в запрос
        if (
          this.selectedItem &&
          this.selectedItem.type === "folder" &&
          this.selectedItem.id !== "root"
        ) {
          mapData.folder_id = this.selectedItem.id;
          // Также используем ID текущей папки для более надежного добавления
          mapData.current_folder_id = this.selectedItem.id;
        }

        // Создаем карту через API
        await createMap(mapData);

        // Обновляем структуру после создания
        await this.loadFolderStructure();

        // Если текущий выбранный элемент - "Корневой каталог", обновляем его содержимое
        if (this.selectedItem && this.selectedItem.id === "root") {
          this.selectedItem.children = this.getRootItems();
        }

        // Закрываем панель создания
        this.showCreatePanel = false;

        // Показываем уведомление об успешном создании
        this.$alert.success(`Карта "${mapName}" успешно создана`);
      } catch (err) {
        console.error("Ошибка при создании карты:", err);
        // Показываем уведомление только если статус ответа указывает на ошибку
        if (err.response && err.response.status >= 400) {
          this.$alert.error(
            `Не удалось создать карту: ${
              err.response.data?.detail || "Неизвестная ошибка"
            }`
          );
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
          title: folderName,
        };

        // Если выбрана папка (и это не виртуальный корневой каталог), добавляем ее как родительскую
        if (
          this.selectedItem &&
          this.selectedItem.type === "folder" &&
          this.selectedItem.id !== "root"
        ) {
          folderData.parent_folder_id = this.selectedItem.id;
        }

        // Создаем папку через API
        await createFolder(folderData);

        // Обновляем структуру после создания
        await this.loadFolderStructure();

        // Если текущий выбранный элемент - "Корневой каталог", обновляем его содержимое
        if (this.selectedItem && this.selectedItem.id === "root") {
          this.selectedItem.children = this.getRootItems();
        }

        // Закрываем панель создания
        this.showCreatePanel = false;

        // Показываем уведомление об успешном создании
        this.$alert.success(`Папка "${folderName}" успешно создана`);
      } catch (err) {
        console.error("Ошибка при создании папки:", err);
        // Показываем уведомление только если статус ответа указывает на ошибку
        if (err.response && err.response.status >= 400) {
          this.$alert.error(
            `Не удалось создать папку: ${
              err.response.data?.detail || "Неизвестная ошибка"
            }`
          );
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
        message:
          item.type === "folder"
            ? "Внимание! Все содержимое папки будет удалено!"
            : "Вы уверены, что хотите удалить этот элемент?",
        input: "",
      };
    },

    initialConfirmDelete() {
      // Если это папка, показываем дополнительное предупреждение о каскадном удалении
      if (this.deleteConfirmation.itemType === "folder") {
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
      this.cascadeDeleteConfirmation.buttonText = "Подтвердить (2)";

      // Запускаем таймер, который будет обновлять текст и активировать кнопку через 2 секунды
      let countdown = 2;
      this.cascadeDeleteTimer = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          this.cascadeDeleteConfirmation.buttonEnabled = true;
          this.cascadeDeleteConfirmation.buttonText = "Подтвердить";
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

        if (itemType === "folder") {
          // Удаляем папку через API
          await deleteFolder(itemId);
        } else if (itemType === "map") {
          // Удаляем карту через API
          await deleteMap(itemId);
        }

        // Показываем уведомление об успешном удалении
        this.$alert.success(
          `${
            itemType === "folder" ? "Папка" : "Карта"
          } "${itemName}" успешно удалена`
        );

        // Обновляем структуру после удаления
        await this.loadFolderStructure();

        // Если текущий выбранный элемент - "Корневой каталог", обновляем его содержимое
        if (this.selectedItem && this.selectedItem.id === "root") {
          this.selectedItem.children = this.getRootItems();
        }

        // Если удаленный элемент был выбран, переключаемся на корневую папку
        if (this.selectedItem && this.selectedItem.id === itemId) {
          this.selectRootFolder();
        }
      } catch (err) {
        console.error("Ошибка при удалении:", err);
        // Показываем уведомление только если статус ответа указывает на ошибку
        if (err.response && err.response.status >= 400) {
          this.$alert.error(
            `Не удалось удалить элемент: ${
              err.response.data?.detail || "Неизвестная ошибка"
            }`
          );
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
        itemName: "",
        itemType: "",
        message: "",
        input: "",
      };
      // Также отменяем каскадное подтверждение, если оно было открыто
      this.cancelCascadeDelete();
    },

    // Показать корневой каталог (элементы без родительских папок)
    showRootDirectory() {
      // Создаем виртуальный элемент для представления корневого каталога
      const rootFolder = {
        id: "root", // Символический ID, не используется в запросах к API
        type: "folder",
        name: "Корневой каталог",
        children: this.getRootItems(),
      };

      // Выбираем этот виртуальный элемент для отображения
      this.selectedItem = rootFolder;

      // Сохраняем информацию о выбранной "папке"
      saveLastOpenedFolder({
        id: "root",
        name: "Корневой каталог",
        type: "folder",
      });

      // Закрываем панель создания, если она была открыта
      this.showCreatePanel = false;
    },

    // Получить элементы корневого каталога (без родительских папок)
    getRootItems() {
      return this.folderStructure.filter((item) => {
        if (item.type === "folder") {
          // Включаем только корневые папки (без родительской папки)
          return !item.parent_folder_id;
        } else {
          // Для карт проверяем, есть ли они в корневом каталоге
          return true; // Фильтрация карт выполняется на сервере
        }
      });
    },

    // Новый метод для открытия загрузчика изображений
    handleImageUpload(mapId) {
      this.currentMapId = mapId;
      this.showImageUploader = true;
    },

    // Закрытие загрузчика изображений
    closeImageUploader() {
      this.showImageUploader = false;
      // Не сбрасываем currentMapId сразу, так как он нужен для обработки результата загрузки
    },

    // Полный сброс состояния загрузчика изображений после обработки результата
    resetImageUploader() {
      this.showImageUploader = false;
      this.currentMapId = null;
    },

    // Обработка успешной загрузки изображения
    async handleImageUploadSuccess({ imageId, url, mapData }) {
      console.log("MainPage - Получен callback успешной загрузки изображения:");
      console.log("MainPage - imageId:", imageId);
      console.log("MainPage - url:", url);
      console.log("MainPage - mapData:", mapData);
      console.log("MainPage - currentMapId:", this.currentMapId);

      try {
        // Закрываем загрузчик после успешной загрузки, но сохраняем ID текущей карты
        this.closeImageUploader();

        // Получаем актуальную информацию о карте напрямую
        if (this.currentMapId) {
          try {
            console.log(
              "MainPage - Запрос актуальной информации о карте:",
              this.currentMapId
            );
            const updatedMapData = await getMapById(this.currentMapId);
            console.log(
              "MainPage - Получены актуальные данные карты:",
              updatedMapData
            );

            // Обновляем карту в структуре папок
            this.updateMapInStructure(updatedMapData);
          } catch (err) {
            console.error("MainPage - Ошибка получения данных карты:", err);
          }
        }

        // Обновляем структуру после загрузки изображения
        console.log(
          "MainPage - Запрос обновления структуры папок после загрузки изображения"
        );
        await this.loadFolderStructure();
        console.log("MainPage - Структура папок обновлена");

        // Обновляем текущий выбранный элемент, если это карта с загруженным изображением
        console.log("MainPage - Проверка текущего выбранного элемента");
        if (this.selectedItem) {
          console.log("MainPage - Текущий элемент:", this.selectedItem.type);
          console.log(
            "MainPage - ID выбранной карты:",
            this.selectedItem.id || this.selectedItem.map_id
          );
          console.log("MainPage - ID обновляемой карты:", this.currentMapId);
        }

        if (this.selectedItem && this.selectedItem.type === "map") {
          const selectedMapId =
            this.selectedItem.map_id || this.selectedItem.id;
          console.log(
            "MainPage - Сравнение ID карт:",
            selectedMapId,
            this.currentMapId
          );

          if (selectedMapId === this.currentMapId) {
            console.log(
              "MainPage - Найден выбранный элемент (карта) для обновления:",
              this.selectedItem.title || this.selectedItem.name
            );

            // Если у нас есть полные данные карты из API, используем их напрямую
            if (mapData) {
              console.log("MainPage - Используем данные карты из ответа API");

              // Создаем обновленный объект карты, сохраняя все существующие поля
              // и обновляя необходимые поля из mapData
              this.selectedItem = {
                ...this.selectedItem,
                background_image_id: mapData.background_image_id,
                background_image_url: mapData.background_image_url,
                is_custom: mapData.is_custom,
              };

              console.log(
                "MainPage - Обновленная карта:",
                JSON.stringify({
                  id: this.selectedItem.id,
                  title: this.selectedItem.title || this.selectedItem.name,
                  background_image_url: this.selectedItem.background_image_url,
                  background_image_id: this.selectedItem.background_image_id,
                })
              );

              // Сбрасываем currentMapId только после успешного обновления
              this.resetImageUploader();
              return; // Выходим из метода, т.к. мы уже обновили данные
            }

            // Находим обновленную версию карты в дереве (это запасной вариант)
            const updatedItem = this.findItemById(
              this.currentMapId,
              this.folderStructure
            );

            console.log(
              "MainPage - Результат поиска обновленной карты:",
              updatedItem ? "Найдена" : "Не найдена"
            );

            if (updatedItem) {
              console.log(
                "MainPage - Обновленная карта перед изменениями:",
                JSON.stringify({
                  id: updatedItem.id,
                  title: updatedItem.title || updatedItem.name,
                  background_image_url: updatedItem.background_image_url,
                  background_image_id: updatedItem.background_image_id,
                })
              );

              // Явно обновляем необходимые поля
              updatedItem.background_image_url = url;
              updatedItem.background_image_id = imageId;

              console.log("MainPage - Установлено background_image_url:", url);
              console.log(
                "MainPage - Установлено background_image_id:",
                imageId
              );

              // Обновляем выбранный элемент для реактивного обновления UI
              console.log("MainPage - Применяем обновленные данные карты к UI");
              this.selectedItem = { ...updatedItem };

              console.log(
                "MainPage - Обновленная карта после изменений:",
                JSON.stringify({
                  id: this.selectedItem.id,
                  title: this.selectedItem.title || this.selectedItem.name,
                  background_image_url: this.selectedItem.background_image_url,
                  background_image_id: this.selectedItem.background_image_id,
                })
              );
            } else {
              // Если по какой-то причине карта не найдена в структуре,
              // обновим напрямую текущий выбранный элемент
              console.log(
                "MainPage - Карта не найдена в структуре, обновляем напрямую"
              );
              this.selectedItem.background_image_url = url;
              this.selectedItem.background_image_id = imageId;

              // Принудительно вызываем обновление Vue через клонирование объекта
              this.selectedItem = { ...this.selectedItem };
            }
          } else {
            console.log(
              "MainPage - ID выбранной карты не соответствует обновляемой карте"
            );
          }
        } else {
          console.log(
            "MainPage - Выбранный элемент не соответствует обновляемой карте или не является картой"
          );
          if (this.selectedItem) {
            console.log(
              "MainPage - Текущий выбранный элемент:",
              this.selectedItem.type,
              this.selectedItem.id || this.selectedItem.map_id
            );
          }
        }

        // Показываем уведомление об успешной загрузке
        console.log("MainPage - Показываем уведомление об успешной загрузке");
        this.$alert?.success("Изображение успешно загружено");

        // Сбрасываем currentMapId только после всех операций
        this.resetImageUploader();
      } catch (err) {
        console.error(
          "MainPage - Ошибка при обновлении после загрузки изображения:",
          err
        );
        // В случае ошибки также сбрасываем состояние
        this.resetImageUploader();
      }
    },

    // Новый метод для обновления карты в структуре папок
    updateMapInStructure(mapData) {
      if (!mapData || !mapData.map_id) return;

      console.log(
        "MainPage - Обновление карты в структуре папок:",
        mapData.map_id
      );

      // Функция для рекурсивного обхода структуры
      const updateMapInItems = (items) => {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];

          // Проверяем, является ли элемент искомой картой
          if (
            item.type === "map" &&
            (item.id === mapData.map_id || item.map_id === mapData.map_id)
          ) {
            console.log("MainPage - Найдена карта для обновления в структуре");

            // Обновляем поля карты
            item.background_image_id = mapData.background_image_id;
            item.background_image_url = mapData.background_image_url;
            item.is_custom = mapData.is_custom;

            return true;
          }

          // Если это папка, проверяем ее содержимое
          if (item.type === "folder" && item.children) {
            if (updateMapInItems(item.children)) {
              return true;
            }
          }
        }

        return false;
      };

      // Запускаем поиск и обновление в структуре папок
      updateMapInItems(this.folderStructure);
    },

    // Обработчик события "open-map" от компонента MapPreview
    handleOpenMap(mapId) {
      console.log("MainPage - Запрос на открытие карты с ID:", mapId);
      this.navigateToMap(mapId);
    },
  },

  beforeUnmount() {
    // Очищаем таймер при уничтожении компонента
    if (this.cascadeDeleteTimer) {
      clearInterval(this.cascadeDeleteTimer);
    }
  },
};
</script>

<style scoped src="@/assets/css/views/MainPage.css"></style>