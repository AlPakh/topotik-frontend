<template>
  <div class="app-container">
    <AppHeader />
    
    <div class="map-container">
      <div class="map-sidebar">
        <div class="sidebar-header">
          <h3>{{ mapName }}</h3>
        </div>
        
        <div class="marker-categories">
          <div v-for="category in categories" :key="category.id" class="category">
            <div class="category-header" :style="{ color: category.color }">
              <span class="toggle-icon" @click="toggleCategory(category)">
                {{ category.expanded ? '▾' : '▸' }}
              </span>
              <span class="category-name">{{ category.name }}</span>
              <span class="visibility-toggle" @click="toggleCategoryVisibility(category)">
                <span v-if="category.visible">👁️</span>
                <span v-else>👁️‍🗨️</span>
              </span>
              <button class="dots-button" @click="showCategoryMenu(category)">⋮</button>
            </div>
            
            <div v-if="category.expanded" class="markers-list">
              <div 
                v-for="marker in category.markers" 
                :key="marker.id" 
                class="marker-item"
                :style="{ borderLeftColor: category.color }"
              >
                <span class="marker-name">{{ marker.name }}</span>
                <span class="visibility-toggle" @click="toggleMarkerVisibility(marker)">
                  <span v-if="marker.visible">👁️</span>
                  <span v-else>👁️‍🗨️</span>
                </span>
                <button class="dots-button" @click="showMarkerMenu(marker)">⋮</button>
              </div>
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
        <div id="map"></div>
        
        <!-- Панель создания элементов -->
        <div v-if="showCreatePanel" class="create-overlay">
          <div class="create-panel-wrapper">
            <div class="panel-header">
              <h3>Создать элемент на карте</h3>
              <button class="close-button" @click="showCreatePanel = false">&times;</button>
            </div>
            
            <div class="create-options">
              <div class="create-option" @click="createCategory">
                <div class="option-icon">📁</div>
                <div class="option-title">Категория меток</div>
                <div class="option-description">Создать новую группу меток</div>
              </div>
              
              <div class="create-option" @click="createMarker">
                <div class="option-icon">📍</div>
                <div class="option-title">Метка на карте</div>
                <div class="option-description">Создать метку в выбранной категории</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Редактор метки -->
        <marker-editor
          v-if="showMarkerEditor"
          :marker="currentMarker"
          :category="currentCategory"
          @save="saveMarkerChanges"
          @close="showMarkerEditor = false"
        />
        
        <!-- Контекстные меню и диалоги -->
        <div v-if="showContextMenu" class="context-menu" :style="menuPosition">
          <button 
            v-for="(action, index) in contextActions" 
            :key="index" 
            @click="executeAction(action.action)"
            :class="{ 'danger': action.danger }"
          >
            {{ action.label }}
          </button>
        </div>
        
        <!-- Диалог подтверждения удаления -->
        <div v-if="showDeleteConfirmation" class="confirmation-dialog-overlay">
          <div class="confirmation-dialog">
            <h3>Подтверждение удаления</h3>
            <p>{{ confirmationMessage }}</p>
            <div class="confirmation-input">
              <label>Для подтверждения введите "{{ itemToDelete.name }}":</label>
              <input v-model="confirmationInput" type="text" />
            </div>
            <div class="dialog-actions">
              <button 
                @click="confirmDeleteAction" 
                :disabled="confirmationInput !== itemToDelete.name"
                class="danger-button"
              >
                Удалить
              </button>
              <button @click="cancelDelete" class="cancel-button">Отмена</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import MarkerEditor from '@/components/MarkerEditor.vue'
import AppHeader from '@/components/AppHeader.vue'

export default {
  name: 'MapView',
  components: {
    MarkerEditor,
    AppHeader
  },
  data() {
    return {
      map: null,
      mapName: this.$route.query.name || 'Карта без названия',
      categories: [],
      leafletMarkers: {},
      showCreatePanel: false,
      showContextMenu: false,
      showDeleteConfirmation: false,
      menuPosition: { top: '0px', left: '0px' },
      contextActions: [],
      activeItem: null,
      activeItemIndex: null,
      itemToDelete: null,
      confirmationMessage: '',
      confirmationInput: '',
      pendingMarkerCategory: null,
      currentMarker: null,
      currentCategory: null,
      showMarkerEditor: false,
      hoveredBlockIndex: null,
      dragOverIndex: null,
      draggingBlockIndex: null,
      showBlockTypeMenu: false,
      blockTypeMenuIndex: null,
      blockTypeMenuPosition: { top: '0px', left: '0px' }
    }
  },
  created() {
    // Получаем название карты из параметров маршрута
    if (this.$route.query.name) {
      this.mapName = this.$route.query.name;
    } else {
      this.mapName = 'Карта #' + this.$route.params.id;
    }
  },
  mounted() {
    this.initMap();
    this.loadMapData();
    
    // Обработчик клика вне контекстного меню
    document.addEventListener('click', this.handleOutsideClick);
  },
  beforeUnmount() {
    try {
      // Закрываем все тултипы
      this.closeAllTooltips();
      
      // Удаляем все маркеры
      Object.values(this.leafletMarkers).forEach(marker => {
        if (marker && marker.getTooltip) {
          try {
            if (marker.getTooltip()) {
              marker.closeTooltip();
              marker.unbindTooltip();
            }
            this.map.removeLayer(marker);
          } catch (e) {
            console.warn('Ошибка при удалении маркера:', e);
          }
        }
      });
      
      // Удаляем обработчики событий
      if (this.map) {
        this.map.off('click', this.onMapClick);
        this.map.off('zoomstart', this.closeAllTooltips);
        this.map.off('moveend', this.closeAllTooltips);
        document.removeEventListener('click', this.handleOutsideClick);
        
        // Уничтожаем карту
        this.map.remove();
      }
    } catch (e) {
      console.error('Ошибка при уничтожении карты:', e);
    }
  },
  methods: {
    initMap() {
      try {
        // Инициализация карты Leaflet с полностью отключенной анимацией
        this.map = L.map('map', {
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
          preferCanvas: true,
          doubleClickZoom: false,
          // Разрешаем масштабирование колесиком мыши
          scrollWheelZoom: true,
          // Настраиваем, чтобы события колесика мыши работали корректно
          wheelPxPerZoomLevel: 120,
          wheelDebounceTime: 40,
          // Разрешаем масштабирование даже если body имеет overflow: hidden
          inertia: true,
          inertiaDeceleration: 3000
        }).setView([55.7558, 37.6173], 13);
        
        // Добавляем тайловый слой без привязки к событию load
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        // Обработчик клика для создания меток
        this.map.on('click', this.onMapClick);
        
        // Добавляем кнопки масштабирования руками
        const zoomControl = new L.Control.Zoom({
          position: 'topleft',
          zoomInTitle: 'Увеличить',
          zoomOutTitle: 'Уменьшить'
        });
        zoomControl.addTo(this.map);
        
        // Настраиваем предварительное закрытие всех тултипов перед масштабированием
        this.map.on('zoomstart', () => {
          try {
            this.closeAllTooltips();
          } catch (e) {
            console.warn('Ошибка при обработке события zoomstart:', e);
          }
        });
        
        // Обработчик окончания масштабирования для перерисовки маркеров
        this.map.on('zoomend', () => {
          try {
            // Перерисовываем маркеры с небольшой задержкой
            setTimeout(() => this.renderMarkers(), 100);
          } catch (e) {
            console.warn('Ошибка при обработке события zoomend:', e);
          }
        });
        
        // Ставим таймер для перерисовки маркеров при полной инициализации
        setTimeout(() => {
          try {
            this.renderMarkers();
          } catch (e) {
            console.error('Ошибка при отрисовке маркеров:', e);
          }
        }, 1000);
      } catch (e) {
        console.error('Ошибка при инициализации карты:', e);
      }
    },
    
    handleMouseMove() {
      // Добавляем дебаунс для предотвращения частых вызовов
      clearTimeout(this._mouseMoveTimeout);
      this._mouseMoveTimeout = setTimeout(() => {
        try {
          if (this.map) {
            // Ничего не делаем - просто оставляем для обработки движения мыши
          }
        } catch (e) {
          console.warn('Ошибка при обработке движения мыши:', e);
        }
      }, 50);
    },
    
    closeAllTooltips() {
      // Закрываем все тултипы перед масштабированием
      if (!this.map) return;
      
      try {
        Object.values(this.leafletMarkers).forEach(marker => {
          if (marker && marker.getTooltip) {
            try {
              if (marker.getTooltip()) {
                marker.closeTooltip();
              }
            } catch (e) {
              console.warn('Ошибка при закрытии тултипа:', e);
            }
          }
        });
      } catch (e) {
        console.warn('Ошибка в closeAllTooltips:', e);
      }
    },
    
    loadMapData() {
      try {
        // Проверяем наличие сохраненных данных в localStorage
        const savedData = localStorage.getItem('mapData_' + this.$route.params.id);
        
        if (savedData) {
          // Если данные есть, загружаем их
          const parsedData = JSON.parse(savedData);
          
          // Обновляем название карты
          if (parsedData.mapName) {
            this.mapName = parsedData.mapName;
          }
          
          // Загружаем категории и метки
          if (parsedData.categories) {
            this.categories = parsedData.categories;
          }
        } else {
          // Если данных нет, создаем демо-категории для примера
          this.createDemoData();
        }
        
        // Отображаем маркеры на карте
        this.renderMarkers();
      } catch (e) {
        console.error('Ошибка при загрузке данных карты:', e);
        
        // В случае ошибки создаем демо-данные
        this.createDemoData();
        this.renderMarkers();
      }
    },
    
    createDemoData() {
      this.categories = [
        {
          id: 1,
          name: 'Достопримечательности',
          color: '#DC143C',
          expanded: true,
          visible: true,
          markers: [
            {
              id: 101,
              name: 'Пример метки',
              visible: true,
              position: [55.7558, 37.6173],
              blocks: [
                { type: 'heading1', content: 'Пример метки' },
                { type: 'text', content: 'Это пример описания метки. Вы можете редактировать содержимое, добавляя различные блоки.' },
                { type: 'text', content: '' }
              ]
            }
          ]
        }
      ];
    },
    
    // Сохранение всех данных карты
    saveMapData() {
      try {
        // Подготавливаем данные для сохранения
        const dataToSave = {
          mapName: this.mapName,
          categories: this.categories
        };
        
        // Преобразуем каждую метку, добавляя markdown-контент
        dataToSave.categories.forEach(category => {
          category.markers.forEach(marker => {
            // Конвертируем блоки в markdown, если у метки нет markdown-контента
            if (!marker.markdownContent) {
              marker.markdownContent = this.blocksToMarkdown(marker.blocks);
            }
          });
        });
        
        // Сохраняем в localStorage
        localStorage.setItem('mapData_' + this.$route.params.id, JSON.stringify(dataToSave));
        
        console.log('Данные карты сохранены');
      } catch (e) {
        console.error('Ошибка при сохранении данных карты:', e);
      }
    },
    
    // Конвертер блоков в markdown (дублирует функцию из MarkerEditor для независимой работы)
    blocksToMarkdown(blocks) {
      if (!blocks || !blocks.length) return '';
      
      return blocks.map(block => {
        switch (block.type) {
          case 'text':
            return block.content;
          case 'heading1':
            return `# ${block.content}`;
          case 'heading2':
            return `## ${block.content}`;
          case 'heading3':
            return `### ${block.content}`;
          case 'quote':
            return `> ${block.content}`;
          case 'list':
            if (block.items && block.items.length) {
              return block.items.map(item => `* ${item}`).join('\n');
            }
            return '';
          case 'divider':
            return '---';
          default:
            return '';
        }
      }).filter(content => content !== '').join('\n\n');
    },
    
    // Конвертер markdown в блоки (дублирует функцию из MarkerEditor для независимой работы)
    markdownToBlocks(markdown) {
      if (!markdown) return [{ type: 'text', content: '' }];
      
      const lines = markdown.split('\n');
      const blocks = [];
      let currentBlock = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Пропускаем пустые строки между блоками
        if (line.trim() === '' && currentBlock) {
          currentBlock = null;
          continue;
        }
        
        // Заголовок 1
        if (line.startsWith('# ')) {
          blocks.push({
            type: 'heading1',
            content: line.substring(2).trim()
          });
          currentBlock = null;
        } 
        // Заголовок 2
        else if (line.startsWith('## ')) {
          blocks.push({
            type: 'heading2',
            content: line.substring(3).trim()
          });
          currentBlock = null;
        }
        // Заголовок 3
        else if (line.startsWith('### ')) {
          blocks.push({
            type: 'heading3',
            content: line.substring(4).trim()
          });
          currentBlock = null;
        }
        // Цитата
        else if (line.startsWith('> ')) {
          blocks.push({
            type: 'quote',
            content: line.substring(2).trim()
          });
          currentBlock = null;
        }
        // Разделитель
        else if (line.trim() === '---') {
          blocks.push({ type: 'divider' });
          currentBlock = null;
        }
        // Элемент списка
        else if (line.startsWith('* ') || line.startsWith('- ')) {
          const content = line.substring(2).trim();
          
          // Если предыдущий блок был списком, добавляем новый элемент к нему
          if (currentBlock && currentBlock.type === 'list') {
            currentBlock.items.push(content);
          } else {
            currentBlock = {
              type: 'list',
              items: [content]
            };
            blocks.push(currentBlock);
          }
        }
        // Обычный текст
        else {
          // Если предыдущий блок был текстом, добавляем строку к нему
          if (currentBlock && currentBlock.type === 'text') {
            currentBlock.content += '\n' + line;
          } else {
            currentBlock = {
              type: 'text',
              content: line
            };
            blocks.push(currentBlock);
          }
        }
      }
      
      // Добавляем пустой текстовый блок в конце, если его нет
      if (blocks.length === 0 || 
          !((blocks[blocks.length - 1].type === 'text') && 
           (blocks[blocks.length - 1].content.trim() === ''))) {
        blocks.push({ type: 'text', content: '' });
      }
      
      return blocks;
    },
    
    renderMarkers() {
      if (!this.map) return;
      
      try {
        // Удаляем все текущие маркеры с карты
        Object.values(this.leafletMarkers).forEach(marker => {
          if (marker && marker.getTooltip) {
            try {
              if (marker.getTooltip()) {
                marker.closeTooltip();
                marker.unbindTooltip();
              }
              this.map.removeLayer(marker);
            } catch (e) {
              console.warn('Ошибка при удалении маркера:', e);
            }
          }
        });
        
        this.leafletMarkers = {};
        
        // Добавляем видимые маркеры из видимых категорий
        this.categories.forEach(category => {
          if (category.visible) {
            category.markers.forEach(markerData => {
              if (markerData.visible) {
                try {
                  // Создаем SVG-маркер с подстановкой цвета категории
                  const markerSvg = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
                      <path fill="${category.color}" d="M16 0C7.2 0 0 7.2 0 16c0 8.8 16 32 16 32s16-23.2 16-32C32 7.2 24.8 0 16 0z"/>
                      <circle fill="white" cx="16" cy="16" r="8"/>
                    </svg>
                  `;
                  
                  // Создаем собственный класс иконки с отключенной анимацией
                  const customIcon = L.divIcon({
                    className: 'custom-map-marker',
                    html: markerSvg,
                    iconSize: [32, 48],
                    iconAnchor: [16, 48]
                  });
                  
                  // Создаем маркер с нашей иконкой
                  const marker = L.marker(markerData.position, {
                    icon: customIcon,
                    interactive: true,
                    // Отключаем анимацию на уровне маркера
                    zIndexOffset: markerData.position[0] * 10,
                    riseOnHover: false,
                    riseOffset: 0
                  });
                  
                  // Добавляем маркер на карту
                  marker.addTo(this.map);
                  
                  // Используем событие mouseover вместо tooltip
                  marker.on('mouseover', (e) => {
                    try {
                      // Создаем попап вместо тултипа
                      const popup = L.popup({
                        className: 'marker-tooltip',
                        offset: [0, -48],
                        closeButton: false,
                        autoClose: true,
                        closeOnEscapeKey: false,
                        closeOnClick: false
                      })
                      .setLatLng(e.target.getLatLng())
                      .setContent(markerData.name)
                      .openOn(this.map);
                      
                      // Сохраняем ссылку на попап
                      marker.bindPopup(popup);
                    } catch (err) {
                      console.warn('Ошибка при создании попапа:', err);
                    }
                  });
                  
                  // Закрываем попап при уходе мыши
                  marker.on('mouseout', () => {
                    try {
                      this.map.closePopup();
                    } catch (err) {
                      console.warn('Ошибка при закрытии попапа:', err);
                    }
                  });
                  
                  // Обработчик клика
                  marker.on('click', () => {
                    try {
                      this.map.closePopup();
                      this.openMarkerDetails(markerData, category);
                    } catch (err) {
                      console.warn('Ошибка при обработке клика на маркер:', err);
                    }
                  });
                  
                  // Сохраняем маркер
                  this.leafletMarkers[markerData.id] = marker;
                } catch (err) {
                  console.error('Ошибка при создании маркера:', err);
                }
              }
            });
          }
        });
      } catch (err) {
        console.error('Ошибка в renderMarkers:', err);
      }
    },
    
    toggleCategory(category) {
      category.expanded = !category.expanded;
    },
    
    toggleCategoryVisibility(category) {
      category.visible = !category.visible;
      this.renderMarkers();
    },
    
    toggleMarkerVisibility(marker) {
      marker.visible = !marker.visible;
      this.renderMarkers();
    },
    
    showCategoryMenu(category) {
      this.showContextMenu = true;
      this.currentCategory = category;
      this.contextActions = [
        { label: 'Переименовать', action: 'renameCategory' },
        { label: 'Изменить цвет', action: 'changeColor' },
        { label: 'Удалить', action: 'deleteCategory', danger: true }
      ];
    },
    
    showMarkerMenu(marker) {
      this.showContextMenu = true;
      this.currentMarker = marker;
      this.contextActions = [
        { label: 'Редактировать', action: 'editMarker' },
        { label: 'Удалить', action: 'deleteMarker', danger: true }
      ];
    },
    
    executeAction(action) {
      this.showContextMenu = false;
      
      switch (action) {
        case 'editMarker':
          this.showMarkerEditor = true;
          break;
        case 'deleteMarker':
          this.confirmDelete(this.currentMarker, 'marker');
          break;
        case 'renameCategory':
          this.renameCategory(this.currentCategory);
          break;
        case 'changeColor':
          this.changeColor(this.currentCategory);
          break;
        case 'deleteCategory':
          this.confirmDelete(this.currentCategory, 'category');
          break;
      }
    },
    
    renameCategory(category) {
      const newName = prompt('Введите новое название категории:', category.name);
      if (newName && newName.trim()) {
        category.name = newName.trim();
        
        // Сохраняем изменения
        this.saveMapData();
      }
    },
    
    changeColor(category) {
      const colors = ['#8A2BE2', '#DC143C', '#FF8C00', '#2E8B57', '#4682B4', '#800080'];
      const currentIndex = colors.indexOf(category.color);
      const nextIndex = (currentIndex + 1) % colors.length;
      
      category.color = colors[nextIndex];
      this.renderMarkers();
      
      // Сохраняем изменения
      this.saveMapData();
    },
    
    confirmDelete(item, type) {
      this.showDeleteConfirmation = true;
      this.itemToDelete = item;
      this.confirmationMessage = type === 'category' 
        ? 'Внимание! Все метки в категории будут удалены!' 
        : 'Вы уверены, что хотите удалить эту метку?';
    },
    
    cancelDelete() {
      this.showDeleteConfirmation = false;
      this.itemToDelete = null;
      this.confirmationInput = '';
    },
    
    // Подтверждение удаления с сохранением данных
    confirmDeleteAction() {
      if (this.itemToDelete && this.confirmationInput === this.itemToDelete.name) {
        if (this.itemToDelete === this.currentMarker) {
          // Удаление метки
          const index = this.currentCategory.markers.findIndex(m => m.id === this.currentMarker.id);
          if (index !== -1) {
            this.currentCategory.markers.splice(index, 1);
          }
        } else if (this.itemToDelete === this.currentCategory) {
          // Удаление категории
          const index = this.categories.findIndex(c => c.id === this.currentCategory.id);
          if (index !== -1) {
            this.categories.splice(index, 1);
          }
        }
        
        // Сохраняем данные после удаления
        this.saveMapData();
        
        // Обновляем отображение маркеров на карте
        this.renderMarkers();
      }
      
      // Закрываем диалог подтверждения
      this.showDeleteConfirmation = false;
      this.itemToDelete = null;
      this.confirmationInput = '';
    },
    
    createCategory() {
      const name = prompt('Введите название категории:');
      if (name && name.trim()) {
        // Генерируем случайный цвет
        const colors = ['#8A2BE2', '#DC143C', '#FF8C00', '#2E8B57', '#4682B4', '#800080'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Создаем новую категорию
        const newCategory = {
          id: Date.now(),
          name: name.trim(),
          color: randomColor,
          expanded: true,
          visible: true,
          markers: []
        };
        
        this.categories.push(newCategory);
        this.showCreatePanel = false;
        
        // Сохраняем данные после создания категории
        this.saveMapData();
      }
    },
    
    createMarker() {
      if (this.categories.length === 0) {
        this.$alert.error('Сначала создайте категорию для меток');
        return;
      }
      
      let categoryId;
      if (this.categories.length === 1) {
        categoryId = this.categories[0].id;
      } else {
        const options = this.categories.map(c => c.id + ': ' + c.name).join('\n');
        const selection = prompt(`Выберите категорию (введите ID):\n${options}`);
        
        if (!selection) return;
        
        const id = parseInt(selection.split(':')[0]);
        const category = this.categories.find(c => c.id === id);
        
        if (!category) {
          this.$alert.error('Категория не найдена');
          return;
        }
        
        categoryId = id;
      }
      
      const name = prompt('Введите название метки:');
      if (name && name.trim()) {
        // Запоминаем категорию для следующего клика на карту
        this.pendingMarkerCategory = categoryId;
        this.$alert.show('Кликните на карту, чтобы разместить метку');
        this.showCreatePanel = false;
      }
    },
    
    onMapClick(e) {
      if (this.pendingMarkerCategory) {
        const category = this.categories.find(c => c.id === this.pendingMarkerCategory);
        
        if (category) {
          // Создаем новую метку
          const newMarker = {
            id: Date.now(),
            name: 'Метка ' + (category.markers.length + 1),
            visible: true,
            position: [e.latlng.lat, e.latlng.lng],
            blocks: [{ type: 'text', content: 'Описание метки' }]
          };
          
          // Добавляем markdown-представление
          newMarker.markdownContent = this.blocksToMarkdown(newMarker.blocks);
          
          category.markers.push(newMarker);
          this.renderMarkers();
          
          // Сохраняем данные после создания метки
          this.saveMapData();
        }
        
        this.pendingMarkerCategory = null;
      }
    },
    
    openMarkerDetails(marker, category) {
      this.currentMarker = marker;
      this.currentCategory = category;
      this.showMarkerEditor = true;
    },
    
    saveMarkerChanges(updatedMarker) {
      if (this.currentCategory && this.currentMarker) {
        const index = this.currentCategory.markers.findIndex(m => m.id === this.currentMarker.id);
        if (index !== -1) {
          this.currentCategory.markers[index] = updatedMarker;
          
          // Сохраняем данные после изменения метки
          this.saveMapData();
        }
      }
      this.showMarkerEditor = false;
    },
    
    showAddBlockMenu(index, event) {
      if (event) {
        const rect = event.target.getBoundingClientRect();
        this.blockTypeMenuPosition = {
          top: `${rect.top}px`,
          left: `${rect.left - 150}px`
        };
      }
      
      this.blockTypeMenuIndex = index;
      this.showBlockTypeMenu = true;
      
      // Закрываем меню при клике в другое место
      setTimeout(() => {
        document.addEventListener('click', this.hideBlockTypeMenu, { once: true });
      }, 0);
    },
    
    hideBlockTypeMenu() {
      this.showBlockTypeMenu = false;
    },
    
    onDragStart(event, index) {
      this.draggingBlockIndex = index;
      this.dragOverIndex = null;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
      
      // Добавляем обработчики для всего документа
      document.addEventListener('dragover', this.onDocumentDragOver);
      document.addEventListener('drop', this.onDocumentDrop);
    },
    
    onDragEnd() {
      this.draggingBlockIndex = null;
      this.dragOverIndex = null;
      
      // Удаляем обработчики
      document.removeEventListener('dragover', this.onDocumentDragOver);
      document.removeEventListener('drop', this.onDocumentDrop);
    },
    
    onDocumentDragOver(event) {
      event.preventDefault();
      
      // Находим блок, над которым находится курсор
      const blocks = document.querySelectorAll('.content-block');
      let targetIndex = null;
      
      blocks.forEach((block, index) => {
        const rect = block.getBoundingClientRect();
        const mouseY = event.clientY;
        
        // Если курсор находится в верхней половине блока, показываем индикатор перед блоком
        // Если в нижней - после блока
        if (mouseY >= rect.top && mouseY <= rect.bottom) {
          const isTop = mouseY < rect.top + rect.height / 2;
          targetIndex = isTop ? index : index + 1;
        }
      });
      
      // Не позволяем перетаскивать блок на самого себя
      if (targetIndex !== null && targetIndex !== this.draggingBlockIndex && targetIndex !== this.draggingBlockIndex + 1) {
        this.dragOverIndex = targetIndex;
      } else {
        this.dragOverIndex = null;
      }
    },
    
    onDocumentDrop(event) {
      event.preventDefault();
      
      if (this.draggingBlockIndex !== null && this.dragOverIndex !== null) {
        // Извлекаем блок, который перетаскиваем
        const blockToMove = this.currentMarker.blocks[this.draggingBlockIndex];
        
        // Удаляем его из текущей позиции
        this.currentMarker.blocks.splice(this.draggingBlockIndex, 1);
        
        // Корректируем индекс вставки, если он больше индекса удаленного элемента
        let insertIndex = this.dragOverIndex;
        if (this.dragOverIndex > this.draggingBlockIndex) {
          insertIndex--;
        }
        
        // Вставляем блок в новую позицию
        this.currentMarker.blocks.splice(insertIndex, 0, blockToMove);
        
        // Обеспечиваем наличие пустого блока в конце
        this.ensureEmptyBlockAtEnd();
      }
      
      this.draggingBlockIndex = null;
      this.dragOverIndex = null;
    },
    
    checkEmptyBlock(index) {
      // Если это последний блок и его содержимое не пустое, добавляем новый пустой блок
      if (index === this.currentMarker.blocks.length - 1) {
        const block = this.currentMarker.blocks[index];
        
        if (block.type === 'text' && block.content.trim() !== '') {
          this.addNewBlock('text', index + 1);
        } else if (block.type === 'heading1' && block.content.trim() !== '') {
          this.addNewBlock('text', index + 1);
        } else if (block.type === 'heading2' && block.content.trim() !== '') {
          this.addNewBlock('text', index + 1);
        } else if (block.type === 'heading3' && block.content.trim() !== '') {
          this.addNewBlock('text', index + 1);
        } else if (block.type === 'quote' && block.content.trim() !== '') {
          this.addNewBlock('text', index + 1);
        }
      }
    },
    
    onBlockFocus(index) {
      this.hoveredBlockIndex = index;
    },
    
    addNewBlock(type, index) {
      if (!this.currentMarker) return;
      
      let newBlock;
      
      switch (type) {
        case 'text':
          newBlock = { type: 'text', content: '' };
          break;
        case 'heading1':
          newBlock = { type: 'heading1', content: '' };
          break;
        case 'heading2':
          newBlock = { type: 'heading2', content: '' };
          break;
        case 'heading3':
          newBlock = { type: 'heading3', content: '' };
          break;
        case 'list':
          newBlock = { type: 'list', items: [''] };
          break;
        case 'quote':
          newBlock = { type: 'quote', content: '' };
          break;
        case 'divider':
          newBlock = { type: 'divider' };
          break;
        default:
          newBlock = { type: 'text', content: '' };
      }
      
      // Проверяем, является ли текущий блок пустым текстовым блоком
      const currentBlock = this.currentMarker.blocks[index];
      if (currentBlock && 
          currentBlock.type === 'text' && 
          currentBlock.content.trim() === '') {
        // Заменяем текущий блок
        this.currentMarker.blocks.splice(index, 1, newBlock);
        this.hoveredBlockIndex = index;
      } else {
        // Вставляем новый блок после текущего
        this.currentMarker.blocks.splice(index + 1, 0, newBlock);
        this.hoveredBlockIndex = index + 1;
      }
      
      this.showBlockTypeMenu = false;
      
      // После добавления нового блока фокусируемся на нём
      this.$nextTick(() => {
        const blocksWithInputs = document.querySelectorAll('.content-block textarea, .content-block input');
        if (blocksWithInputs[this.hoveredBlockIndex]) {
          blocksWithInputs[this.hoveredBlockIndex].focus();
        }
      });
      
      // Проверяем, есть ли пустой блок в конце
      this.ensureEmptyBlockAtEnd();
    },
    
    removeListItem(block, index) {
      block.items.splice(index, 1);
    },
    
    addListItem(block) {
      block.items.push('');
    },
    
    handleOutsideClick(event) {
      // Скрываем контекстное меню при клике вне него
      if (this.showContextMenu) {
        const menu = document.querySelector('.context-menu');
        if (menu && !menu.contains(event.target)) {
          this.showContextMenu = false;
        }
      }
    },
    
    handleKeyDown(event, index) {
      // Обработка нажатия Backspace в пустом блоке
      if (event.key === 'Backspace' && 
          this.currentMarker.blocks[index].content.trim() === '') {
        
        // Не удаляем блок, если он единственный
        if (this.currentMarker.blocks.length <= 1) {
          return;
        }
        
        // Запоминаем предыдущий индекс для переноса фокуса
        const prevIndex = Math.max(0, index - 1);
        
        // Удаляем текущий блок
        this.currentMarker.blocks.splice(index, 1);
        
        // В следующем цикле переносим фокус на предыдущий блок
        this.$nextTick(() => {
          const textareas = document.querySelectorAll('.content-block textarea');
          const input = textareas[prevIndex];
          
          if (input) {
            input.focus();
            
            // Устанавливаем курсор в конец текста
            const len = input.value.length;
            input.setSelectionRange(len, len);
          }
        });
        
        event.preventDefault();
      }
      
      // Обработка нажатия Enter для создания нового блока
      else if (event.key === 'Enter' && !event.shiftKey) {
        // Получаем текущий блок и его тип
        const currentBlock = this.currentMarker.blocks[index];
        let newBlockType = 'text'; // По умолчанию создаем текстовый блок
        
        // Сохраняем тип блока для некоторых типов блоков
        if (['text', 'heading1', 'heading2', 'heading3', 'quote'].includes(currentBlock.type)) {
          // Определяем позицию курсора
          const textarea = event.target;
          const cursorPosition = textarea.selectionStart;
          const textBeforeCursor = currentBlock.content.substring(0, cursorPosition);
          const textAfterCursor = currentBlock.content.substring(cursorPosition);
          
          // Обновляем текст текущего блока (оставляем только текст до курсора)
          currentBlock.content = textBeforeCursor;
          
          // Создаем новый блок с текстом после курсора
          this.currentMarker.blocks.splice(index + 1, 0, {
            type: newBlockType,
            content: textAfterCursor
          });
          
          // В следующем цикле переносим фокус на новый блок
          this.$nextTick(() => {
            const textareas = document.querySelectorAll('.content-block textarea');
            const newInput = textareas[index + 1];
            
            if (newInput) {
              newInput.focus();
              // Устанавливаем курсор в начало текста нового блока
              newInput.setSelectionRange(0, 0);
            }
          });
          
          // Проверяем, есть ли пустой блок в конце
          this.ensureEmptyBlockAtEnd();
          
          event.preventDefault();
        }
      }
    },
    
    ensureEmptyBlockAtEnd() {
      // Проверяем, есть ли пустой блок в конце
      const lastBlockIndex = this.currentMarker.blocks.length - 1;
      if (lastBlockIndex >= 0) {
        const lastBlock = this.currentMarker.blocks[lastBlockIndex];
        
        // Если последний блок не является пустым текстовым блоком,
        // добавляем пустой текстовый блок в конец
        if (!(lastBlock.type === 'text' && lastBlock.content.trim() === '')) {
          this.currentMarker.blocks.push({ type: 'text', content: '' });
        }
      } else {
        // Если блоков нет вообще, добавляем первый пустой блок
        this.currentMarker.blocks.push({ type: 'text', content: '' });
      }
    },
    
    showBlockMenu(event, index) {
      // Предотвращаем всплытие события, чтобы не вызвать drag-and-drop
      event.stopPropagation();
      
      // Скрываем текущее меню если оно открыто
      this.showContextMenu = false;
      
      // Устанавливаем позицию меню относительно курсора
      this.menuPosition = {
        top: `${event.clientY}px`,
        left: `${event.clientX}px`
      };
      
      this.contextActions = [
        { label: 'Дублировать', action: 'duplicateBlock' },
        { label: 'Удалить', action: 'deleteBlock', danger: true }
      ];
      
      this.activeItem = this.currentMarker.blocks[index];
      this.activeItemIndex = index; // Запоминаем индекс для использования в методах
      
      // Показываем меню
      this.showContextMenu = true;
      
      // Отменяем поведение по умолчанию, чтобы не начать drag-and-drop
      event.preventDefault();
    },
    
    duplicateBlock() {
      if (this.activeItem && this.activeItemIndex !== null) {
        // Создаем глубокую копию блока
        const blockCopy = JSON.parse(JSON.stringify(this.activeItem));
        
        // Вставляем копию после оригинала
        this.currentMarker.blocks.splice(this.activeItemIndex + 1, 0, blockCopy);
        
        // Обеспечиваем наличие пустого блока в конце
        this.ensureEmptyBlockAtEnd();
      }
    },
    
    deleteBlock() {
      if (this.activeItem && this.activeItemIndex !== null) {
        // Не удаляем, если это единственный блок
        if (this.currentMarker.blocks.length <= 1) {
          return;
        }
        
        // Удаляем блок
        this.currentMarker.blocks.splice(this.activeItemIndex, 1);
        
        // Обеспечиваем наличие пустого блока в конце
        this.ensureEmptyBlockAtEnd();
      }
    },
    
    handleListItemKeyDown(event, blockIndex, itemIndex) {
      // Если нажат Backspace в пустом элементе списка
      if (event.key === 'Backspace' && 
          this.currentMarker.blocks[blockIndex].items[itemIndex].trim() === '') {
        
        // Не удаляем элемент, если он единственный
        if (this.currentMarker.blocks[blockIndex].items.length <= 1) {
          // Если это единственный элемент и пустой, меняем тип блока на текстовый
          //const block = this.currentMarker.blocks[blockIndex];
          this.currentMarker.blocks.splice(blockIndex, 1, {
            type: 'text',
            content: ''
          });
          
          // Фокусируемся на новом текстовом блоке
          this.$nextTick(() => {
            const textareas = document.querySelectorAll('.content-block textarea');
            if (textareas[blockIndex]) {
              textareas[blockIndex].focus();
            }
          });
          
          event.preventDefault();
          return;
        }
        
        // Запоминаем предыдущий индекс для переноса фокуса
        const prevIndex = Math.max(0, itemIndex - 1);
        
        // Удаляем элемент
        this.currentMarker.blocks[blockIndex].items.splice(itemIndex, 1);
        
        // В следующем цикле переносим фокус на предыдущий элемент
        this.$nextTick(() => {
          const inputs = Array.from(document.querySelectorAll('.list-block'));
          if (inputs[blockIndex]) {
            const listItems = inputs[blockIndex].querySelectorAll('.list-item-input');
            if (listItems[prevIndex]) {
              listItems[prevIndex].focus();
              
              // Устанавливаем курсор в конец текста
              const len = listItems[prevIndex].value.length;
              if (listItems[prevIndex].setSelectionRange) {
                listItems[prevIndex].setSelectionRange(len, len);
              }
            }
          }
        });
        
        event.preventDefault();
      }
    }
  }
}
</script>

<style scoped src="@/assets/css/components/MapView.css"></style>