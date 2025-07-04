<template>
  <li class="tree-item">
    <div
      class="item-line"
      @click="onSelectItem"
      @contextmenu.prevent="onContextMenu"
      @mouseover="hovered = true"
      @mouseleave="handleMouseLeave"
      draggable="true"
      @dragstart="onDragStart"
      @dragover.prevent="onDragOver"
      @drop.prevent="onDrop"
      @dragenter.prevent="dragEnter = true"
      @dragleave="dragEnter = false"
      :class="{
        'drag-over': dragEnter,
        'shared-item': item.isShared || item.is_shared,
      }"
    >
      <!-- Иконка в зависимости от типа -->
      <div
        v-if="item.type === 'folder'"
        class="folder-icon"
        :class="{ hovered: hovered }"
      >
        <div v-if="!hovered">
          <div v-if="localIsOpen">📂</div>
          <div v-else>📁</div>
        </div>
        <div
          v-else
          class="arrow-icon"
          :class="{ 'arrow-down': localIsOpen }"
          @click.stop="toggleFolder"
        >
          <img src="../assets/svg/arrow.svg" alt="Arrow" />
        </div>
      </div>
      <!-- Карта с индикатором общего доступа -->
      <div class="icon-container" v-else>
        <!-- Основная иконка карты -->
        <div v-if="item.mapType === 'real'" class="icon">🗺️</div>
        <div v-else class="icon">📔</div>

        <!-- Индикатор, если карта общая -->
        <div
          v-if="isSharedMap"
          class="shared-overlay-icon"
          :title="getSharedTitle"
        >
          🌐
        </div>
      </div>

      <span class="item-name" :title="item.name">
        {{ displayName }}
        <span v-if="isSharedMap" class="shared-owner-label">
          (от {{ sharedOwner }})
        </span>
      </span>

      <!-- Кнопка с тремя точками (только для неshared элементов) -->
      <button v-if="!isSharedMap" class="dots-button" @click.stop="toggleMenu">
        ⋮
      </button>

      <!-- Контекстное меню (только для неshared элементов) -->
      <div
        v-if="showMenu && !isSharedMap"
        class="context-menu"
        @mouseover="menuHovered = true"
        @mouseleave="menuHovered = false"
      >
        <button @click="renameItem">Переименовать</button>
        <button v-if="item.type === 'map'" @click="shareItem">
          Поделиться
        </button>
        <button @click="deleteItem" class="delete-button">Удалить</button>
      </div>
    </div>

    <!-- Список дочерних элементов (если это папка) -->
    <ul v-if="item.type === 'folder' && localIsOpen" class="child-list">
      <folder-tree-item
        v-for="child in item.children"
        :key="child.id"
        :item="child"
        :expanded-folders="expandedFolders"
        @selectItem="$emit('selectItem', $event)"
        @moveItem="handleMoveItem"
        @moveSharedItem="$emit('moveSharedItem', $event)"
        @renameItem="$emit('renameItem', $event)"
        @deleteItem="$emit('deleteItem', $event)"
        @shareItem="$emit('shareItem', $event)"
        @contextMenu="$emit('contextMenu', $event)"
        @folderToggled="handleFolderToggled"
      />
    </ul>
  </li>
</template>

<script>
import FolderTreeItem from "./FolderTreeItem.vue";

export default {
  name: "FolderTreeItem",
  components: {
    FolderTreeItem,
  },
  props: {
    item: {
      type: Object,
      required: true,
    },
    expandedFolders: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      hovered: false,
      menuHovered: false,
      showMenu: false,
      localIsOpen: false,
      dragEnter: false,
      closeMenuTimer: null,
    };
  },
  computed: {
    // Определяем, является ли карта расшаренной
    isSharedMap() {
      return this.item.isShared === true || this.item.is_shared === true;
    },

    // Имя владельца расшаренной карты
    sharedOwner() {
      return (
        this.item.ownerName ||
        this.item.shared_by ||
        (this.item.owner && this.item.owner.username) ||
        "Неизвестный"
      );
    },

    displayName() {
      // Форматируем имя для отображения
      if (!this.item.name) return "";

      // Если имя длиннее 20 символов, сокращаем его
      if (this.item.name.length > 20) {
        // Проверяем, есть ли в имени символы разделителя, чтобы сократить по ним
        if (this.item.name.includes("/") || this.item.name.includes("\\")) {
          // Получаем последнюю часть пути (имя файла/папки)
          const parts = this.item.name.split(/[/\\]/);
          const lastPart = parts.pop();

          // Если даже последняя часть длинная, сокращаем её
          if (lastPart.length > 20) {
            return lastPart.substring(0, 17) + "...";
          }

          // Возвращаем ".../<последняя часть>"
          return ".../" + lastPart;
        }

        // Обычное сокращение для длинных имен
        return this.item.name.substring(0, 17) + "...";
      }

      return this.item.name;
    },

    // Заголовок для общей карты
    getSharedTitle() {
      return `Карта от: ${this.sharedOwner}`;
    },
  },
  watch: {
    // Следим за изменением списка развернутых папок
    expandedFolders: {
      immediate: true,
      handler(newExpandedFolders) {
        // Если наша папка в списке открытых, но локальное состояние закрыто
        if (
          this.item.type === "folder" &&
          newExpandedFolders.includes(this.item.id) &&
          !this.localIsOpen
        ) {
          this.localIsOpen = true;
        }
        // Если нашей папки нет в списке открытых, но локальное состояние открыто
        else if (
          this.item.type === "folder" &&
          !newExpandedFolders.includes(this.item.id) &&
          this.localIsOpen
        ) {
          this.localIsOpen = false;
        }
      },
    },
  },
  created() {
    // При создании компонента проверяем, должна ли папка быть открыта
    if (
      this.item.type === "folder" &&
      this.expandedFolders.includes(this.item.id)
    ) {
      this.localIsOpen = true;
    }
  },
  methods: {
    onSelectItem() {
      this.$emit("selectItem", this.item);
    },
    onContextMenu(event) {
      // Открываем контекстное меню только для не-общих элементов
      if (!this.isSharedMap) {
        this.showMenu = true;

        // Эмитим событие для родительского компонента с координатами и элементом
        this.$emit("contextMenu", {
          item: this.item,
          x: event.clientX,
          y: event.clientY,
        });
      }

      // Предотвращаем стандартное контекстное меню
      event.preventDefault();
    },
    toggleFolder() {
      this.localIsOpen = !this.localIsOpen;

      // Оповещаем родителя об изменении состояния папки
      this.$emit("folderToggled", {
        folderId: this.item.id,
        isOpen: this.localIsOpen,
      });
    },
    toggleMenu() {
      // Только для не-общих элементов
      if (!this.isSharedMap) {
        this.showMenu = !this.showMenu;
      }
    },
    handleMouseLeave() {
      this.hovered = false;

      // Закрываем меню с задержкой, чтобы можно было навести курсор на само меню
      clearTimeout(this.closeMenuTimer);
      this.closeMenuTimer = setTimeout(() => {
        if (!this.menuHovered) {
          this.showMenu = false;
        }
      }, 300);
    },
    renameItem() {
      this.showMenu = false;
      // Удаляем проверку типа карты

      const newName = prompt("Новое имя?", this.item.name);
      if (newName) {
        // Вместо прямого изменения свойства item.name, генерируем событие
        this.$emit("renameItem", {
          id: this.item.id,
          newName: newName,
        });
      }
    },
    deleteItem() {
      this.showMenu = false;
      // Удаляем проверку типа карты

      this.$emit("deleteItem", {
        id: this.item.id,
        name: this.item.name,
        type: this.item.type,
      });
    },
    onDragStart(event) {
      // Передаем информацию о перетаскиваемом элементе
      const dragData = {
        id: this.item.id,
        type: this.item.type,
        name: this.item.name,
        mapType: this.item.mapType,
        is_shared: !!this.item.is_shared,
      };

      event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
      event.dataTransfer.effectAllowed = "move";
    },
    onDragOver(event) {
      // Разрешаем перетаскивание только для папок
      if (this.item.type === "folder") {
        event.preventDefault();
        this.dragEnter = true;
      }
    },
    onDrop(event) {
      this.dragEnter = false;

      // Только для папок
      if (this.item.type !== "folder") return;

      try {
        const sourceData = JSON.parse(event.dataTransfer.getData("text/plain"));

        // Не позволяем перетаскивать элемент сам в себя
        if (sourceData.id === this.item.id) return;

        // Если это общая карта - используем специальный обработчик
        if (sourceData.is_shared) {
          this.$emit("moveSharedItem", {
            mapId: sourceData.id,
            targetFolderId: this.item.id,
          });

          // Автоматически раскрываем папку
          if (!this.localIsOpen) {
            this.expandFolder();
          }
        }
        // Если источник - папка, добавляем проверку на циклическую зависимость
        else if (sourceData.type === "folder") {
          this.$emit("moveItem", {
            sourceId: sourceData.id,
            targetId: this.item.id,
            sourceItem: sourceData,
            checkCycle: true,
          });
        } else {
          // Для карт просто перемещаем
          this.$emit("moveItem", {
            sourceId: sourceData.id,
            targetId: this.item.id,
            sourceItem: sourceData,
          });

          // Автоматически раскрываем папку
          if (!this.localIsOpen) {
            this.expandFolder();
          }
        }
      } catch (e) {
        console.error("Ошибка при обработке перетаскивания:", e);
      }
    },
    handleMoveItem(moveData) {
      // Проверяем, является ли элемент общей картой
      if (moveData.sourceItem && moveData.sourceItem.is_shared) {
        // Используем специальный обработчик для общих карт
        this.$emit("moveSharedItem", {
          mapId: moveData.sourceId,
          targetFolderId: moveData.targetId,
        });
      } else {
        // Обычное перемещение элементов
        this.$emit("moveItem", moveData);
      }
    },
    // Новый метод для обработки событий от дочерних папок
    handleFolderToggled(data) {
      // Просто передаем событие выше по иерархии
      this.$emit("folderToggled", data);
    },
    // Публичный метод для открытия папки извне
    expandFolder() {
      if (this.item.type === "folder" && !this.localIsOpen) {
        this.localIsOpen = true;
        this.$emit("folderToggled", {
          folderId: this.item.id,
          isOpen: true,
        });
      }
    },
    shareItem() {
      this.showMenu = false;
      // Эмитим событие для шаринга
      this.$emit("shareItem", {
        id: this.item.id,
        type: this.item.type,
        name: this.item.name,
      });
    },
  },
  beforeUnmount() {
    // Очищаем таймер при уничтожении компонента
    clearTimeout(this.closeMenuTimer);
  },
};
</script>

<style scoped src="@/assets/css/components/FolderTreeItem.css"></style>

<style scoped>
/* Стиль для общих карт */
.shared-item {
  border-left: 2px solid #4a90e2;
  background-color: rgba(74, 144, 226, 0.05);
}

.icon-container {
  position: relative;
  display: inline-block;
}

.shared-overlay-icon {
  position: absolute;
  bottom: -5px;
  right: -5px;
  font-size: 12px;
  background-color: white;
  border-radius: 50%;
  padding: 0px;
  line-height: 1;
  border: 1px solid #4a90e2;
  color: #4a90e2;
  height: 16px;
  width: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.shared-owner-label {
  font-size: 0.8em;
  color: #666;
  margin-left: 3px;
  font-style: italic;
}
</style>