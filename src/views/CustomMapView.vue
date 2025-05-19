<template>
  <div class="app-container">
    <AppHeader />

    <div class="map-container">
      <!-- Боковая панель с категориями и маркерами - аналогично MapView -->
      <div class="map-sidebar">
        <div class="sidebar-header">
          <h3>{{ mapName }}</h3>
        </div>

        <div class="marker-categories">
          <div
            v-for="category in categories"
            :key="category.id"
            class="category"
          >
            <div class="category-header" :style="{ color: category.color }">
              <span class="toggle-icon" @click="toggleCategory(category)">
                <div
                  class="arrow-icon"
                  :class="{ 'arrow-down': category.expanded }"
                >
                  <img src="@/assets/svg/arrow.svg" alt="Arrow" />
                </div>
              </span>
              <span class="category-name">{{ category.name }}</span>
              <span
                class="visibility-toggle"
                @click="toggleCategoryVisibility(category)"
              >
                <span v-if="category.visible">👁️</span>
                <span v-else>👁️‍🗨️</span>
              </span>
              <button
                class="dots-button"
                @click="showCategoryMenu(category, $event)"
              >
                ⋮
              </button>
            </div>

            <!-- Список маркеров категории -->
            <div v-if="category.expanded" class="markers-list">
              <!-- Код маркеров аналогичен MapView.vue -->
            </div>
          </div>
        </div>

        <div class="create-btn-container">
          <button class="create-btn" @click="showCreatePanel = true">
            Создать
          </button>
        </div>
      </div>

      <div class="map-view">
        <!-- Контейнер карты с пользовательским изображением -->
        <div id="map" class="map-container" ref="mapContainer"></div>

        <!-- Заглушки для диалогов и панелей - будут добавлены позже -->
      </div>
    </div>
  </div>
</template>

<script>
// Импорт необходимых компонентов и библиотек
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import AppHeader from "@/components/AppHeader.vue";
// Компоненты, необходимые для будущей реализации
// import MarkerEditor from "@/components/MarkerEditor.vue";
// import ContextMenu from "@/components/ContextMenu.vue";
// import EditCollectionColor from "@/components/EditCollectionColor.vue";
import { mapOperationsMixin } from "@/mixins/mapOperations";
import { markerOperationsMixin } from "@/mixins/markerOperations";
import Cookies from "js-cookie";

// Определение URL API сервера из переменных окружения
const API_URL = process.env.VUE_APP_API_URL || "http://localhost:8000";

export default {
  name: "CustomMapView",
  components: {
    AppHeader,
    // MarkerEditor,
    // ContextMenu,
    // EditCollectionColor,
  },
  // Подключаем миксины для переиспользования логики
  mixins: [mapOperationsMixin, markerOperationsMixin],

  data() {
    return {
      // Основные данные карты
      map: null,
      mapName: "",
      imageOverlay: null,
      imageBounds: null,
      imageLoaded: false,

      // Данные для работы с категориями и маркерами
      categories: [],
      leafletMarkers: {},

      // Состояние интерфейса
      showCreatePanel: false,
      showContextMenu: false,
      showMarkerEditor: false,
      showDeleteConfirmation: false,
      showColorEditor: false,
      showCategoryDialog: false,

      // Данные для работы с меню и метками
      menuPosition: { x: 0, y: 0 },
      contextMenuItems: [],
      currentMarker: null,
      currentCategory: null,
      itemToDelete: null,
      confirmationMessage: "",
      confirmationInput: "",

      // Данные для drag-n-drop
      dragEnterCategory: null,
      dragEnterMarker: null,
      pendingMarkerCategory: null,
      selectedCategoryId: null,
    };
  },

  created() {
    // Получаем название карты из параметров маршрута
    if (this.$route.query.name) {
      this.mapName = this.$route.query.name;
    } else {
      this.mapName = "Карта #" + this.$route.params.id;
    }
  },

  mounted() {
    this.initCustomMap();
    this.loadMapData();

    // Обработчик клика вне контекстного меню
    document.addEventListener("click", this.handleOutsideClick);
  },

  beforeUnmount() {
    try {
      // Закрываем все тултипы
      this.closeAllTooltips();

      // Удаляем все маркеры
      Object.values(this.leafletMarkers).forEach((marker) => {
        if (marker && marker.getTooltip) {
          try {
            if (marker.getTooltip()) {
              marker.closeTooltip();
              marker.unbindTooltip();
            }
            this.map.removeLayer(marker);
          } catch (e) {
            console.warn("Ошибка при удалении маркера:", e);
          }
        }
      });

      // Удаляем обработчики событий
      if (this.map) {
        this.map.off();
        document.removeEventListener("click", this.handleOutsideClick);

        // Уничтожаем карту
        this.map.remove();
      }
    } catch (e) {
      console.error("Ошибка при уничтожении карты:", e);
    }
  },

  methods: {
    // ====== Методы для инициализации и настройки карты ======

    /**
     * Инициализация карты с пользовательским изображением
     */
    async initCustomMap() {
      try {
        // Создаем карту с базовыми настройками
        const mapElement = this.$refs.mapContainer;
        if (!mapElement) {
          console.error("Контейнер для карты не найден");
          return;
        }

        // Удаляем предыдущую карту, если она существует
        if (this.map) {
          this.map.remove();
        }

        // Создаем новую карту с преднастроенной системой координат
        // Используем нестандартную систему координат, где 0,0 - левый верхний угол
        // а 1000,1000 - правый нижний угол изображения
        const crs = L.CRS.Simple;
        this.map = L.map(mapElement, {
          crs: crs,
          minZoom: -2,
          maxZoom: 2,
          zoomControl: true,
          attributionControl: false,
          center: [500, 500], // Центрируем по умолчанию
          zoom: 0,
        });

        // Добавляем обработчик клика по карте для создания меток
        this.map.on("click", this.onMapClick);

        // Настраиваем элементы управления
        L.control.zoom({ position: "topleft" }).addTo(this.map);

        // Загружаем данные карты (фоновое изображение и метки)
        await this.loadMapData();
      } catch (error) {
        console.error("Ошибка при инициализации карты:", error);
      }
    },

    /**
     * Загрузка данных о карте, коллекциях и маркерах
     */
    async loadMapData() {
      try {
        const mapId = this.$route.params.id;

        // Получаем данные карты с сервера
        const mapData = await this.getMapById(mapId);

        if (!mapData) {
          console.error("Не удалось загрузить данные карты");
          return;
        }

        // Устанавливаем название карты с проверкой на разные форматы данных
        this.mapName =
          mapData.title || mapData.name || "Пользовательская карта";
        console.log(
          "Установлено название пользовательской карты:",
          this.mapName
        );

        // Загружаем фоновое изображение, если оно есть
        if (mapData.background_image_url) {
          this.loadMapImage(mapData.background_image_url);
        } else {
          console.warn("У карты нет фонового изображения");
        }

        // Загружаем категории и маркеры
        const response = await fetch(`${API_URL}/maps/${mapId}/categories`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Cookies.get("access_token")}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Ошибка при загрузке категорий: ${response.status}`);
        }

        const categoriesData = await response.json();

        // Настраиваем категории для отображения
        this.categories = categoriesData.map((category) => ({
          ...category,
          expanded: true, // По умолчанию раскрыты
          visible: true, // По умолчанию видимы
          markers: category.markers.map((marker) => ({
            ...marker,
            visible: true, // По умолчанию видимы
          })),
        }));

        // Отрисовываем маркеры на карте
        this.renderMarkers();
      } catch (error) {
        console.error("Ошибка при загрузке данных:", error);
      }
    },

    /**
     * Загрузка и отображение фонового изображения карты
     * @param {string} imageUrl - URL изображения
     */
    loadMapImage(imageUrl) {
      try {
        if (!this.map) {
          console.error("Карта не инициализирована");
          return;
        }

        // Удаляем предыдущее изображение, если оно есть
        if (this.imageOverlay) {
          this.map.removeLayer(this.imageOverlay);
        }

        // Создаем новое изображение
        const img = new Image();
        img.onload = () => {
          // Определяем размеры и границы изображения
          // Размеры не используются, так как мы всегда используем фиксированное виртуальное пространство 1000x1000
          // const imgWidth = img.width;
          // const imgHeight = img.height;

          // Создаем границы изображения в координатах карты
          this.imageBounds = [
            [0, 0],
            [1000, 1000],
          ];

          // Добавляем изображение на карту
          this.imageOverlay = L.imageOverlay(imageUrl, this.imageBounds);
          this.imageOverlay.addTo(this.map);

          // Центрируем карту на изображении и приближаем для его полного отображения
          this.map.fitBounds(this.imageBounds);
          this.imageLoaded = true;
        };

        // Загружаем изображение
        img.src = imageUrl;
      } catch (error) {
        console.error("Ошибка при загрузке изображения:", error);
      }
    },

    /**
     * Преобразование внутренних координат в координаты Leaflet
     * @param {number} x - координата X (0-1000)
     * @param {number} y - координата Y (0-1000)
     * @return {Array} - координаты в формате Leaflet [lat, lng]
     */
    transformCoordinates(x, y) {
      // Преобразуем координаты из внутренней системы (0-1000) в систему Leaflet
      // y соответствует lat, x соответствует lng
      return [y, x];
    },

    /**
     * Преобразование координат Leaflet во внутренние координаты
     * @param {number} lat - широта
     * @param {number} lng - долгота
     * @return {Array} - координаты в формате [x, y]
     */
    reverseTransformCoordinates(lat, lng) {
      // Преобразуем координаты из системы Leaflet во внутреннюю систему (0-1000)
      return [lng, lat]; // x, y
    },

    // ====== Методы для работы с маркерами ======

    /**
     * Отрисовка маркеров на карте
     */
    renderMarkers() {
      try {
        if (!this.map) {
          console.error("Карта не инициализирована");
          return;
        }

        // Удаляем все существующие маркеры
        Object.values(this.leafletMarkers).forEach((marker) => {
          if (marker) {
            this.map.removeLayer(marker);
          }
        });

        this.leafletMarkers = {};

        // Для каждой категории отрисовываем маркеры
        this.categories.forEach((category) => {
          if (!category.visible) return; // Пропускаем невидимые категории

          category.markers.forEach((marker) => {
            if (!marker.visible) return; // Пропускаем невидимые маркеры

            // Получаем координаты маркера
            const { latitude, longitude } = marker;
            const [lat, lng] = this.transformCoordinates(longitude, latitude);

            // Создаем иконку маркера
            const icon = L.divIcon({
              className: "custom-marker",
              html: `<div class="marker-icon" style="background-color: ${category.color};"></div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            });

            // Создаем маркер Leaflet
            const leafletMarker = L.marker([lat, lng], { icon });

            // Добавляем тултип с названием
            leafletMarker.bindTooltip(marker.title, {
              permanent: false,
              direction: "top",
              offset: [0, -10],
              opacity: 0.9,
              className: "marker-tooltip",
            });

            // Добавляем обработчик клика
            leafletMarker.on("click", () => {
              this.openMarkerDetails(marker, category);
            });

            // Добавляем маркер на карту
            leafletMarker.addTo(this.map);

            // Сохраняем ссылку на маркер
            this.leafletMarkers[marker.id] = leafletMarker;
          });
        });
      } catch (error) {
        console.error("Ошибка при отрисовке маркеров:", error);
      }
    },

    /**
     * Обработчик клика по карте для создания маркера
     * @param {Object} e - событие клика
     */
    onMapClick(e) {
      // Проверяем, находимся ли мы в режиме создания маркера
      if (!this.showCreatePanel) return;

      // Если у нас нет выбранной категории, предлагаем выбрать
      if (!this.pendingMarkerCategory) {
        // Показываем диалог выбора категории
        this.showCategoryDialog = true;

        // Сохраняем координаты для последующего создания маркера
        const { lat, lng } = e.latlng;
        const [x, y] = this.reverseTransformCoordinates(lat, lng);

        // Сохраняем координаты во временные переменные
        this.pendingMarkerCoordinates = {
          latitude: y,
          longitude: x,
        };

        return;
      }

      // Создаем маркер в выбранной категории
      const { lat, lng } = e.latlng;
      const [x, y] = this.reverseTransformCoordinates(lat, lng);

      this.createMarkerInCategory(
        y,
        x,
        this.pendingMarkerCategory,
        "Новая метка"
      )
        .then(() => {
          // Отключаем режим создания маркера
          this.showCreatePanel = false;
          this.pendingMarkerCategory = null;

          // Перезагружаем данные карты
          this.loadMapData();
        })
        .catch((error) => {
          console.error("Ошибка при создании маркера:", error);
        });
    },

    /**
     * Перемещение карты к выбранному маркеру
     * @param {Object} marker - маркер
     */
    centerMapOnMarker(marker) {
      try {
        if (!this.map) return;

        // Получаем координаты маркера
        const { latitude, longitude } = marker;
        const [lat, lng] = this.transformCoordinates(longitude, latitude);

        // Центрируем карту на маркере
        this.map.setView([lat, lng], 1);

        // Открываем тултип маркера, если он есть
        const leafletMarker = this.leafletMarkers[marker.id];
        if (leafletMarker) {
          leafletMarker.openTooltip();
        }
      } catch (error) {
        console.error("Ошибка при центрировании карты:", error);
      }
    },

    /**
     * Отображение редактора для маркера
     * @param {Object} marker - маркер
     * @param {Object} category - категория
     */
    openMarkerDetails(marker, category) {
      // Закрываем все открытые тултипы
      this.closeAllTooltips();

      // Центрируем карту на выбранном маркере
      this.centerMapOnMarker(marker);

      // Устанавливаем текущий маркер и категорию
      this.currentMarker = marker;
      this.currentCategory = category;

      // Показываем редактор маркера
      this.showMarkerEditor = true;
    },

    /**
     * Закрытие всех тултипов на карте
     */
    closeAllTooltips() {
      if (!this.map) return;

      // Закрываем все тултипы маркеров
      Object.values(this.leafletMarkers).forEach((marker) => {
        if (marker && marker.getTooltip) {
          try {
            if (marker.getTooltip()) {
              marker.closeTooltip();
            }
          } catch (e) {
            console.warn("Ошибка при закрытии тултипа:", e);
          }
        }
      });
    },

    // ====== Методы для работы с категориями ======

    /**
     * Переключение свернутости/развернутости категории
     * @param {Object} category - категория
     */
    toggleCategory(category) {
      category.expanded = !category.expanded;
    },

    /**
     * Переключение видимости категории
     * @param {Object} category - категория
     */
    toggleCategoryVisibility(category) {
      category.visible = !category.visible;

      // Обновляем видимость всех маркеров категории
      category.markers.forEach((marker) => {
        marker.visible = category.visible;
      });

      // Перерисовываем маркеры на карте
      this.renderMarkers();
    },

    /**
     * Переключение видимости маркера
     * @param {Object} marker - маркер
     */
    toggleMarkerVisibility(marker) {
      marker.visible = !marker.visible;

      // Перерисовываем маркеры на карте
      this.renderMarkers();
    },

    /**
     * Создание новой категории
     */
    async createCategory() {
      try {
        const mapId = this.$route.params.id;

        // Запрашиваем у пользователя название категории
        const categoryName = prompt("Введите название категории:");
        if (!categoryName) return;

        // Создаем категорию на сервере
        const response = await fetch(`${API_URL}/maps/${mapId}/categories`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Cookies.get("access_token")}`,
          },
          body: JSON.stringify({
            name: categoryName,
            color:
              "#" +
              Math.floor(Math.random() * 16777215)
                .toString(16)
                .padStart(6, "0"), // Случайный цвет
          }),
        });

        if (!response.ok) {
          throw new Error(`Ошибка при создании категории: ${response.status}`);
        }

        // Перезагружаем данные карты
        await this.loadMapData();
      } catch (error) {
        console.error("Ошибка при создании категории:", error);
      }
    },

    /**
     * Инициирование процесса создания маркера
     */
    createMarker() {
      this.showCreatePanel = true;

      // Предупреждаем пользователя
      alert("Нажмите на карту, чтобы создать маркер.");
    },

    /**
     * Обработчик выбора категории в диалоге
     */
    onCategorySelected() {
      if (!this.selectedCategoryId) {
        alert("Выберите категорию!");
        return;
      }

      // Сохраняем выбранную категорию
      this.pendingMarkerCategory = this.selectedCategoryId;

      // Закрываем диалог
      this.showCategoryDialog = false;

      // Используем сохраненные координаты для создания маркера
      if (this.pendingMarkerCoordinates) {
        const { latitude, longitude } = this.pendingMarkerCoordinates;

        this.createMarkerInCategory(
          latitude,
          longitude,
          this.pendingMarkerCategory,
          "Новая метка"
        )
          .then(() => {
            // Отключаем режим создания маркера
            this.showCreatePanel = false;
            this.pendingMarkerCategory = null;
            this.pendingMarkerCoordinates = null;

            // Перезагружаем данные карты
            this.loadMapData();
          })
          .catch((error) => {
            console.error("Ошибка при создании маркера:", error);
          });
      }
    },

    /**
     * Закрытие диалога выбора категории
     */
    closeCategoryDialog() {
      this.showCategoryDialog = false;
      this.selectedCategoryId = null;
      this.pendingMarkerCoordinates = null;
    },

    /**
     * Отмена создания маркера
     * @param {Event} event - событие
     */
    cancelMarkerCreation(event) {
      if (event) {
        event.preventDefault();
      }

      this.showCreatePanel = false;
      this.pendingMarkerCategory = null;
      this.pendingMarkerCoordinates = null;
    },

    // ====== Методы для работы с контекстным меню ======

    /**
     * Показывает контекстное меню для категории
     * @param {Object} category - категория
     * @param {Event} event - событие
     */
    showCategoryMenu(category, event) {
      // Предотвращаем всплытие события
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      // Сохраняем текущую категорию
      this.currentCategory = category;

      // Устанавливаем позицию меню
      this.menuPosition = {
        x: event.clientX,
        y: event.clientY,
      };

      // Определяем пункты меню
      this.contextMenuItems = [
        { id: "rename", label: "Переименовать" },
        { id: "color", label: "Изменить цвет" },
        { id: "delete", label: "Удалить" },
      ];

      // Показываем меню
      this.showContextMenu = true;
    },

    /**
     * Показывает контекстное меню для маркера
     * @param {Object} marker - маркер
     * @param {Object} category - категория
     * @param {Event} event - событие
     */
    showMarkerMenu(marker, category, event) {
      // Предотвращаем всплытие события
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      // Сохраняем текущий маркер и категорию
      this.currentMarker = marker;
      this.currentCategory = category;

      // Устанавливаем позицию меню
      this.menuPosition = {
        x: event.clientX,
        y: event.clientY,
      };

      // Определяем пункты меню
      this.contextMenuItems = [
        { id: "edit", label: "Редактировать" },
        { id: "center", label: "Центрировать" },
        { id: "delete", label: "Удалить" },
      ];

      // Получаем другие категории для возможности перемещения
      const otherCategories = this.categories.filter(
        (cat) => cat.id !== category.id
      );

      if (otherCategories.length > 0) {
        this.contextMenuItems.push({
          id: "move",
          label: "Переместить",
          submenu: otherCategories.map((cat) => ({
            id: `move-${cat.id}`,
            label: cat.name,
          })),
        });
      }

      // Показываем меню
      this.showContextMenu = true;
    },

    /**
     * Обработчик клика вне контекстного меню
     * @param {Event} event - событие
     */
    handleOutsideClick(event) {
      // Закрываем контекстное меню при клике вне его
      if (this.showContextMenu) {
        const contextMenu = document.querySelector(".context-menu");
        if (contextMenu && !contextMenu.contains(event.target)) {
          this.showContextMenu = false;
        }
      }
    },

    /**
     * Обработчик выбора действия в контекстном меню
     * @param {string} action - выбранное действие
     */
    handleMenuAction(action) {
      // Закрываем меню
      this.showContextMenu = false;

      switch (action) {
        // Действия с категориями
        case "rename":
          this.renameCategory(this.currentCategory);
          break;
        case "color":
          this.changeColor(this.currentCategory);
          break;
        case "delete":
          if (this.currentMarker) {
            this.confirmDelete(this.currentMarker, "marker");
          } else if (this.currentCategory) {
            this.confirmDelete(this.currentCategory, "category");
          }
          break;

        // Действия с маркерами
        case "edit":
          this.openMarkerDetails(this.currentMarker, this.currentCategory);
          break;
        case "center":
          this.centerMapOnMarker(this.currentMarker);
          break;
        default:
          // Проверяем, является ли действие перемещением маркера
          if (action.startsWith("move-")) {
            const targetCategoryId = action.substr(5);
            this.moveMarkerToCategory(
              this.currentMarker,
              this.currentCategory.id,
              targetCategoryId
            );
          }
          break;
      }
    },

    // ====== Методы для изменения данных ======

    /**
     * Сохранение изменений в маркере
     * @param {Object} updatedMarkerData - обновленные данные маркера
     * @return {boolean} - успешность операции
     */
    async saveMarkerChanges(updatedMarkerData) {
      try {
        // Отправляем запрос на сервер для обновления маркера
        const response = await fetch(
          `${API_URL}/markers/${updatedMarkerData.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Cookies.get("access_token")}`,
            },
            body: JSON.stringify(updatedMarkerData),
          }
        );

        if (!response.ok) {
          throw new Error(`Ошибка при обновлении маркера: ${response.status}`);
        }

        const updatedMarker = await response.json();

        // Обновляем локальные данные
        const categoryIndex = this.categories.findIndex(
          (c) => c.id === this.currentCategory.id
        );

        if (categoryIndex !== -1) {
          const markerIndex = this.categories[categoryIndex].markers.findIndex(
            (m) => m.id === updatedMarker.id
          );

          if (markerIndex !== -1) {
            // Обновляем данные маркера
            this.categories[categoryIndex].markers[markerIndex] = {
              ...updatedMarker,
              visible: true, // Сохраняем видимость
            };

            // Обновляем маркер на карте
            if (this.leafletMarkers[updatedMarker.id]) {
              // Удаляем старый маркер
              this.map.removeLayer(this.leafletMarkers[updatedMarker.id]);
              delete this.leafletMarkers[updatedMarker.id];

              // Создаем новый маркер с обновленными данными
              const { latitude, longitude } = updatedMarker;
              const [lat, lng] = this.transformCoordinates(longitude, latitude);

              // Создаем иконку маркера
              const icon = L.divIcon({
                className: "custom-marker",
                html: `<div class="marker-icon" style="background-color: ${this.categories[categoryIndex].color};"></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              });

              // Создаем маркер Leaflet
              const leafletMarker = L.marker([lat, lng], { icon });

              // Добавляем тултип с названием
              leafletMarker.bindTooltip(updatedMarker.title, {
                permanent: false,
                direction: "top",
                offset: [0, -10],
                opacity: 0.9,
                className: "marker-tooltip",
              });

              // Добавляем обработчик клика
              leafletMarker.on("click", () => {
                this.openMarkerDetails(
                  updatedMarker,
                  this.categories[categoryIndex]
                );
              });

              // Добавляем маркер на карту
              leafletMarker.addTo(this.map);

              // Сохраняем ссылку на маркер
              this.leafletMarkers[updatedMarker.id] = leafletMarker;
            }
          }
        }

        // Закрываем редактор маркера
        this.showMarkerEditor = false;

        return true;
      } catch (error) {
        console.error("Ошибка при обновлении маркера:", error);
        return false;
      }
    },

    /**
     * Сохранение всех данных карты
     */
    async saveMapData() {
      try {
        const mapId = this.$route.params.id;

        // Формируем данные для сохранения
        const mapData = {
          categories: this.categories.map((category) => ({
            id: category.id,
            name: category.name,
            color: category.color,
            markers: category.markers.map((marker) => ({
              id: marker.id,
              title: marker.title,
              latitude: marker.latitude,
              longitude: marker.longitude,
              description: marker.description || "",
            })),
          })),
        };

        // Отправляем запрос на сервер
        const response = await fetch(`${API_URL}/maps/${mapId}/bulk-update`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Cookies.get("access_token")}`,
          },
          body: JSON.stringify(mapData),
        });

        if (!response.ok) {
          throw new Error(
            `Ошибка при сохранении данных карты: ${response.status}`
          );
        }

        // Перезагружаем данные карты
        await this.loadMapData();

        return true;
      } catch (error) {
        console.error("Ошибка при сохранении данных карты:", error);
        return false;
      }
    },

    /**
     * Обработчик обновления цвета коллекции
     * @param {Object} updateData - данные обновления
     */
    onCollectionColorUpdated(updateData) {
      if (!updateData || !updateData.categoryId || !updateData.newColor) {
        return;
      }

      const mapId = this.$route.params.id;

      // Обновляем цвет категории на сервере
      fetch(`${API_URL}/maps/${mapId}/categories/${updateData.categoryId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Cookies.get("access_token")}`,
        },
        body: JSON.stringify({
          color: updateData.newColor,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Ошибка при обновлении цвета: ${response.status}`);
          }
          return response.json();
        })
        .then((updatedCategory) => {
          // Обновляем цвет в локальных данных
          const categoryIndex = this.categories.findIndex(
            (c) => c.id === updatedCategory.id
          );

          if (categoryIndex !== -1) {
            this.categories[categoryIndex].color = updatedCategory.color;

            // Перерисовываем маркеры с новым цветом
            this.renderMarkers();
          }

          // Закрываем редактор цвета
          this.showColorEditor = false;
        })
        .catch((error) => {
          console.error("Ошибка при обновлении цвета категории:", error);
        });
    },

    // ====== Методы для работы с перетаскиванием ======

    /**
     * Начало перетаскивания маркера
     * @param {Event} event - событие
     * @param {Object} marker - маркер
     * @param {Object} category - категория
     */
    onMarkerDragStart(event, marker, category) {
      if (event) {
        // Сохраняем данные маркера в dataTransfer
        event.dataTransfer.setData(
          "text/plain",
          JSON.stringify({
            type: "marker",
            markerId: marker.id,
            categoryId: category.id,
          })
        );

        // Добавляем визуальный эффект
        event.target.classList.add("dragging");
      }
    },

    /**
     * Конец перетаскивания маркера
     */
    onMarkerDragEnd() {
      // Удаляем визуальный эффект со всех элементов
      document.querySelectorAll(".dragging").forEach((el) => {
        el.classList.remove("dragging");
      });

      // Сбрасываем состояния перетаскивания
      this.dragEnterCategory = null;
      this.dragEnterMarker = null;
    },

    /**
     * Обработчик сброса маркера на другой маркер
     * @param {Event} event - событие
     * @param {Object} targetMarker - целевой маркер
     * @param {Object} targetCategory - целевая категория
     */
    onMarkerDrop(event, targetMarker, targetCategory) {
      if (event) {
        event.preventDefault();

        try {
          // Получаем данные перетаскиваемого маркера
          const data = JSON.parse(event.dataTransfer.getData("text/plain"));

          if (data.type === "marker") {
            // Если это не тот же самый маркер
            if (data.markerId !== targetMarker.id) {
              // Если это маркер из другой категории - перемещаем в новую категорию
              if (data.categoryId !== targetCategory.id) {
                this.moveMarkerToCategory(
                  this.findMarkerById(data.markerId, data.categoryId),
                  data.categoryId,
                  targetCategory.id
                );
              }
            }
          }
        } catch (error) {
          console.error("Ошибка при обработке drop маркера:", error);
        }
      }
    },

    /**
     * Обработчик сброса маркера на категорию
     * @param {Event} event - событие
     * @param {Object} targetCategory - целевая категория
     */
    onCategoryDrop(event, targetCategory) {
      if (event) {
        event.preventDefault();

        try {
          // Получаем данные перетаскиваемого объекта
          const data = JSON.parse(event.dataTransfer.getData("text/plain"));

          if (data.type === "marker") {
            // Если это маркер из другой категории
            if (data.categoryId !== targetCategory.id) {
              this.moveMarkerToCategory(
                this.findMarkerById(data.markerId, data.categoryId),
                data.categoryId,
                targetCategory.id
              );
            }
          }
        } catch (error) {
          console.error("Ошибка при обработке drop на категорию:", error);
        }
      }
    },

    /**
     * Перемещение маркера между категориями
     * @param {Object} marker - маркер
     * @param {string} sourceCategoryId - ID исходной категории
     * @param {string} targetCategoryId - ID целевой категории
     */
    async moveMarkerToCategory(marker, sourceCategoryId, targetCategoryId) {
      if (!marker || sourceCategoryId === targetCategoryId) {
        return;
      }

      try {
        // Отправляем запрос на сервер для обновления категории маркера
        const response = await fetch(`${API_URL}/markers/${marker.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Cookies.get("access_token")}`,
          },
          body: JSON.stringify({
            ...marker,
            category_id: targetCategoryId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Ошибка при перемещении маркера: ${response.status}`);
        }

        // Обновляем локальные данные
        const sourceCategory = this.categories.find(
          (c) => c.id === sourceCategoryId
        );
        const targetCategory = this.categories.find(
          (c) => c.id === targetCategoryId
        );

        if (sourceCategory && targetCategory) {
          // Находим маркер в исходной категории
          const markerIndex = sourceCategory.markers.findIndex(
            (m) => m.id === marker.id
          );

          if (markerIndex !== -1) {
            // Удаляем маркер из исходной категории
            const [movedMarker] = sourceCategory.markers.splice(markerIndex, 1);

            // Добавляем маркер в целевую категорию
            targetCategory.markers.push(movedMarker);

            // Перерисовываем маркеры на карте
            this.renderMarkers();
          }
        }
      } catch (error) {
        console.error("Ошибка при перемещении маркера:", error);
      }
    },

    /**
     * Поиск маркера по ID
     * @param {string} markerId - ID маркера
     * @param {string} categoryId - ID категории
     * @return {Object|null} - найденный маркер или null
     */
    findMarkerById(markerId, categoryId) {
      const category = this.categories.find((c) => c.id === categoryId);
      if (!category) return null;

      return category.markers.find((m) => m.id === markerId) || null;
    },

    // ====== Методы для управления диалогами ======

    /**
     * Переименование категории
     * @param {Object} category - категория
     */
    renameCategory(category) {
      const newName = prompt(
        "Введите новое название категории:",
        category.name
      );

      if (newName && newName !== category.name) {
        const mapId = this.$route.params.id;

        fetch(`${API_URL}/maps/${mapId}/categories/${category.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Cookies.get("access_token")}`,
          },
          body: JSON.stringify({
            name: newName,
            color: category.color,
          }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(
                `Ошибка при обновлении категории: ${response.status}`
              );
            }
            return response.json();
          })
          .then(() => {
            // Обновляем название категории в локальных данных
            category.name = newName;
          })
          .catch((error) => {
            console.error("Ошибка при переименовании категории:", error);
          });
      }
    },

    /**
     * Изменение цвета категории
     * @param {Object} category - категория
     */
    changeColor(category) {
      // Показываем редактор цвета
      this.currentCategory = category;
      this.showColorEditor = true;
    },

    /**
     * Подготовка диалога подтверждения удаления
     * @param {Object} item - удаляемый элемент
     * @param {string} type - тип элемента ('marker' или 'category')
     */
    confirmDelete(item, type) {
      this.itemToDelete = item;

      // Настраиваем сообщение в зависимости от типа элемента
      if (type === "marker") {
        this.confirmationMessage = `Вы действительно хотите удалить метку "${item.title}"?`;
        this.confirmationInput = "";
      } else if (type === "category") {
        this.confirmationMessage = `Вы действительно хотите удалить категорию "${item.name}" и все её метки?
        Это действие необратимо. Для подтверждения введите название категории.`;
        this.confirmationInput = "";
      }

      // Показываем диалог подтверждения
      this.showDeleteConfirmation = true;
    },

    /**
     * Отмена удаления
     */
    cancelDelete() {
      this.showDeleteConfirmation = false;
      this.itemToDelete = null;
      this.confirmationMessage = "";
      this.confirmationInput = "";
    },

    /**
     * Подтверждение удаления
     */
    confirmDeleteAction() {
      const item = this.itemToDelete;

      if (!item) {
        this.cancelDelete();
        return;
      }

      const mapId = this.$route.params.id;

      // Проверяем тип элемента
      if (item.title !== undefined) {
        // Это маркер
        const categoryId = this.currentCategory.id;

        // Удаляем маркер
        fetch(`${API_URL}/markers/${item.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${Cookies.get("access_token")}`,
          },
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(
                `Ошибка при удалении маркера: ${response.status}`
              );
            }

            // Обновляем локальные данные
            const categoryIndex = this.categories.findIndex(
              (c) => c.id === categoryId
            );

            if (categoryIndex !== -1) {
              const markerIndex = this.categories[
                categoryIndex
              ].markers.findIndex((m) => m.id === item.id);

              if (markerIndex !== -1) {
                this.categories[categoryIndex].markers.splice(markerIndex, 1);

                // Удаляем маркер с карты
                if (this.leafletMarkers[item.id]) {
                  this.map.removeLayer(this.leafletMarkers[item.id]);
                  delete this.leafletMarkers[item.id];
                }
              }
            }
          })
          .catch((error) => {
            console.error("Ошибка при удалении маркера:", error);
          })
          .finally(() => {
            this.cancelDelete();
          });
      } else {
        // Это категория
        // Проверяем правильность ввода для подтверждения
        if (this.confirmationInput !== item.name) {
          alert("Название категории введено неверно. Удаление отменено.");
          this.cancelDelete();
          return;
        }

        // Удаляем категорию
        fetch(`${API_URL}/maps/${mapId}/categories/${item.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${Cookies.get("access_token")}`,
          },
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(
                `Ошибка при удалении категории: ${response.status}`
              );
            }

            // Обновляем локальные данные
            const categoryIndex = this.categories.findIndex(
              (c) => c.id === item.id
            );

            if (categoryIndex !== -1) {
              // Удаляем маркеры с карты
              this.categories[categoryIndex].markers.forEach((marker) => {
                if (this.leafletMarkers[marker.id]) {
                  this.map.removeLayer(this.leafletMarkers[marker.id]);
                  delete this.leafletMarkers[marker.id];
                }
              });

              // Удаляем категорию из списка
              this.categories.splice(categoryIndex, 1);
            }
          })
          .catch((error) => {
            console.error("Ошибка при удалении категории:", error);
          })
          .finally(() => {
            this.cancelDelete();
          });
      }
    },
  },
};
</script>

<style scoped src="@/assets/css/views/MapView.css"></style> 