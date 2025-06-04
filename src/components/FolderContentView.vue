<template>
  <div :class="['folder-content', viewMode]">
    <div
      v-for="item in itemsWithStates"
      :key="item.id"
      class="item-card"
      @click="onSelect(item)"
      @contextmenu.prevent="onContextMenu($event, item)"
      @mouseover="updateItemState(item, { hovered: true })"
      @mouseleave="handleMouseLeave(item)"
      draggable="true"
      @dragstart="onDragStart($event, item)"
      @dragover.prevent
      @drop.prevent="onDrop($event, item)"
      @dragenter.prevent="highlightItem($event, item)"
      @dragleave="unhighlightItem($event)"
      :class="{ 'has-menu-open': item.showMenu, 'shared-item': item.is_shared }"
    >
      <!-- Иконка и название -->
      <div v-if="item.type === 'folder'" class="item-content folder">
        <span class="item-icon">📁</span>
        <span class="item-name" :title="item.name">{{ item.name }}</span>
      </div>
      <div v-else-if="item.type === 'map'" class="item-content">
        <span
          v-if="item.is_shared"
          class="item-icon"
          :title="getSharedTitle(item)"
          >🌏︎</span
        >
        <span v-else-if="item.mapType === 'real'" class="item-icon">🗺️</span>
        <span v-else class="item-icon">🗒️</span>
        <span class="item-name" :title="item.name">{{ item.name }}</span>

        <!-- Показываем владельца для общих карт -->
        <span v-if="item.is_shared" class="shared-by"
          >от {{ item.shared_by || "Неизвестного пользователя" }}</span
        >
      </div>

      <!-- Кнопка с тремя точками (только для не-общих элементов) -->
      <button
        v-if="!item.is_shared"
        class="dots-button"
        @click.stop="toggleMenu(item)"
      >
        ⋮
      </button>

      <!-- Контекстное меню (только для не-общих элементов) -->
      <div
        v-if="item.showMenu && !item.is_shared"
        class="context-menu"
        @mouseover="updateItemState(item, { menuHovered: true })"
        @mouseleave="updateItemState(item, { menuHovered: false })"
      >
        <button @click="renameItem(item)">Переименовать</button>
        <button v-if="item.type === 'map'" @click="shareItem(item)">
          Поделиться
        </button>
        <button @click="deleteItem(item)" class="delete-button">Удалить</button>
      </div>
    </div>

    <!-- Сообщение, если папка пуста -->
    <div v-if="items.length === 0" class="empty-folder">
      <p>Папка пуста</p>
      <p class="hint">
        Создайте новую карту или папку, либо перетащите существующие элементы
        сюда
      </p>
      <button class="create-btn" @click="onCreateNew">Создать</button>
    </div>
  </div>
</template>

<script>
export default {
  name: "FolderContentView",
  props: {
    items: {
      type: Array,
      default: () => [],
    },
    viewMode: {
      type: String,
      default: "list",
    },
  },
  data() {
    return {
      closeMenuTimers: {}, // Таймеры для закрытия меню по id элемента
      itemStates: {}, // Состояния элементов (hovered, showMenu, menuHovered)
    };
  },
  computed: {
    // Добавляем состояние к каждому элементу
    itemsWithStates() {
      return this.items.map((item) => {
        const state = this.itemStates[item.id] || {
          hovered: false,
          showMenu: false,
          menuHovered: false,
        };
        return { ...item, ...state };
      });
    },
  },
  methods: {
    // Получить заголовок для общей карты
    getSharedTitle(item) {
      return `Общая карта от: ${item.shared_by || "Неизвестного пользователя"}`;
    },
    // Обновление состояния элемента
    updateItemState(item, newState) {
      this.itemStates[item.id] = {
        ...(this.itemStates[item.id] || {
          hovered: false,
          showMenu: false,
          menuHovered: false,
        }),
        ...newState,
      };
      // Вызываем обновление Vue
      this.$forceUpdate();
    },
    onSelect(item) {
      this.$emit("selectItem", item);
    },
    onContextMenu(event, item) {
      // Показываем меню при правом клике только для не-общих элементов
      if (!item.is_shared) {
        this.updateItemState(item, { showMenu: true });

        // Эмитим событие contextMenu с данными элемента и координатами клика
        this.$emit("contextMenu", {
          item,
          x: event.clientX,
          y: event.clientY,
        });
      }
    },
    toggleMenu(item) {
      // Показываем меню только для не-общих элементов
      if (!item.is_shared) {
        this.updateItemState(item, {
          showMenu: !item.showMenu,
        });
      }
    },
    handleMouseLeave(item) {
      this.updateItemState(item, { hovered: false });

      // Закрываем меню с задержкой, чтобы можно было навести курсор на меню
      clearTimeout(this.closeMenuTimers[item.id]);
      this.closeMenuTimers[item.id] = setTimeout(() => {
        if (!item.menuHovered) {
          this.updateItemState(item, { showMenu: false });
        }
      }, 300);
    },
    renameItem(item) {
      this.updateItemState(item, { showMenu: false });
      const newName = prompt("Новое имя?", item.name);
      if (newName) {
        this.$emit("renameItem", {
          id: item.id,
          newName: newName,
        });
      }
    },
    shareItem(item) {
      this.updateItemState(item, { showMenu: false });
      this.$emit("shareItem", {
        id: item.id,
        type: item.type,
        name: item.name,
      });
    },
    deleteItem(item) {
      this.updateItemState(item, { showMenu: false });
      this.$emit("deleteItem", {
        id: item.id,
        name: item.name,
        type: item.type,
      });
    },
    onCreateNew() {
      // Генерируем такое же событие, как и кнопка в LeftSidebar
      this.$emit("createNew");
    },
    onDragStart(event, item) {
      // Добавляем информацию о том, является ли элемент общей картой
      event.dataTransfer.setData(
        "text/plain",
        JSON.stringify({
          id: item.id,
          type: item.type,
          name: item.name,
          mapType: item.mapType,
          is_shared: !!item.is_shared,
        })
      );
      event.dataTransfer.effectAllowed = "move";
    },
    onDrop(event, targetItem) {
      // Сбрасываем подсветку
      event.currentTarget.classList.remove("drag-over");

      const sourceItemData = JSON.parse(
        event.dataTransfer.getData("text/plain")
      );

      // Если целевой элемент - папка, переместить внутрь
      if (targetItem.type === "folder") {
        // Проверяем, является ли перемещаемый элемент общей картой
        if (sourceItemData.is_shared) {
          this.$emit("moveSharedItem", {
            mapId: sourceItemData.id,
            targetFolderId: targetItem.id,
          });
        } else if (sourceItemData.type === "folder") {
          // Если источник - обычная папка, добавляем флаг проверки на циклическую зависимость
          this.$emit("moveItem", {
            sourceId: sourceItemData.id,
            targetId: targetItem.id,
            checkCycle: true,
          });
        } else {
          // Для обычных карт просто перемещаем
          this.$emit("moveItem", {
            sourceId: sourceItemData.id,
            targetId: targetItem.id,
          });
        }
      }
    },
    highlightItem(event, item) {
      // Подсвечиваем только папки при перетаскивании
      if (item.type === "folder") {
        event.currentTarget.classList.add("drag-over");
      }
    },
    unhighlightItem(event) {
      event.currentTarget.classList.remove("drag-over");
    },
  },
  beforeUnmount() {
    // Очищаем все таймеры при уничтожении компонента
    Object.values(this.closeMenuTimers).forEach((timer) => {
      clearTimeout(timer);
    });
  },
};
</script>

<style scoped src="@/assets/css/components/FolderContentView.css"></style>

<style scoped>
/* Стиль для общих карт */
.shared-item {
  border-left: 2px solid #4a90e2;
}

.shared-by {
  font-size: 0.8em;
  color: #666;
  margin-left: 5px;
}
</style>
