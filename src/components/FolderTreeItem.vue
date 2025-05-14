<template>
  <li class="tree-item">
    <div
      class="item-line"
      @click="onSelectItem"
      @mouseover="hovered = true"
      @mouseleave="handleMouseLeave"
      draggable="true"
      @dragstart="onDragStart"
      @dragover.prevent="onDragOver"
      @drop.prevent="onDrop"
      @dragenter.prevent="dragEnter = true"
      @dragleave="dragEnter = false"
      :class="{ 'drag-over': dragEnter }"
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
      <div v-else-if="item.mapType === 'real'" class="icon">🗺️</div>
      <div v-else class="icon">📔</div>

      <span class="item-name" :title="item.name">{{ displayName }}</span>

      <!-- Кнопка с тремя точками (всегда в разметке) -->
      <button class="dots-button" @click.stop="toggleMenu">⋮</button>

      <!-- Контекстное меню -->
      <div
        v-if="showMenu"
        class="context-menu"
        @mouseover="menuHovered = true"
        @mouseleave="menuHovered = false"
      >
        <button @click="renameItem">Переименовать</button>
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
        @renameItem="$emit('renameItem', $event)"
        @deleteItem="$emit('deleteItem', $event)"
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
    displayName() {
      // Для примера: если имя слишком длинное, обрезаем визуально,
      // а при наведении можно title отобразить
      return this.item.name;
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
    toggleFolder() {
      this.localIsOpen = !this.localIsOpen;

      // Оповещаем родителя об изменении состояния папки
      this.$emit("folderToggled", {
        folderId: this.item.id,
        isOpen: this.localIsOpen,
      });
    },
    toggleMenu() {
      this.showMenu = !this.showMenu;
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
      event.dataTransfer.setData(
        "text/plain",
        JSON.stringify({
          id: this.item.id,
          type: this.item.type,
          name: this.item.name,
          mapType: this.item.mapType,
        })
      );
      event.dataTransfer.effectAllowed = "move";
    },
    onDragOver(event) {
      // Разрешаем перетаскивание (по умолчанию браузеры блокируют)
      event.preventDefault();
      this.dragEnter = true;
    },
    onDrop(event) {
      this.dragEnter = false;
      const sourceItemData = JSON.parse(
        event.dataTransfer.getData("text/plain")
      );

      // Не позволяем перетаскивать элемент сам в себя
      if (sourceItemData.id === this.item.id) {
        return;
      }

      // Только папки могут быть целью для перетаскивания
      if (this.item.type === "folder") {
        // Если пытаемся переместить папку, проверяем, что не создаем циклическую зависимость
        if (sourceItemData.type === "folder") {
          // Генерируем событие moveItem с дополнительным полем для проверки на циклическую зависимость
          this.$emit("moveItem", {
            sourceId: sourceItemData.id,
            targetId: this.item.id,
            checkCycle: true, // Добавляем флаг для проверки на циклическую зависимость
          });
        } else {
          // Для карт просто перемещаем
          this.$emit("moveItem", {
            sourceId: sourceItemData.id,
            targetId: this.item.id,
          });

          // Автоматически раскрываем папку при перетаскивании в нее
          if (!this.localIsOpen) {
            this.localIsOpen = true;
            this.$emit("folderToggled", {
              folderId: this.item.id,
              isOpen: true,
            });
          }
        }
      }
    },
    handleMoveItem(moveData) {
      // Прокидываем событие дальше наверх
      this.$emit("moveItem", moveData);
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
  },
  beforeUnmount() {
    // Очищаем таймер при уничтожении компонента
    clearTimeout(this.closeMenuTimer);
  },
};
</script>

<style scoped src="@/assets/css/components/FolderTreeItem.css"></style>