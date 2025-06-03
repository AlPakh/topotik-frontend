<template>
  <div class="left-sidebar">
    <div class="create-btn-container">
      <!-- Кнопка создания нового элемента -->
      <button class="create-btn" @click="$emit('createNew')">Создать</button>
    </div>

    <!-- Дерево папок и карт -->
    <ul
      class="folder-tree"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDrop"
      :class="{ 'drag-over': isDragOver }"
    >
      <folder-tree-item
        v-for="item in folderStructure"
        :key="item.id"
        :item="item"
        :expanded-folders="expandedFolders"
        @selectItem="$emit('selectItem', $event)"
        @moveItem="$emit('moveItem', $event)"
        @renameItem="$emit('renameItem', $event)"
        @deleteItem="$emit('deleteItem', $event)"
        @shareItem="$emit('shareItem', $event)"
        @contextMenu="$emit('contextMenu', $event)"
        @folderToggled="handleFolderToggled"
        :ref="
          (el) => {
            if (el) folderRefs[item.id] = el;
          }
        "
      />
    </ul>
  </div>
</template>

<script>
import FolderTreeItem from "./FolderTreeItem.vue";

export default {
  name: "LeftSidebar",
  components: {
    FolderTreeItem,
  },
  props: {
    folderStructure: {
      type: Array,
      default: () => [],
    },
    expandedFolders: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      isDragOver: false,
      dragOverTimer: null,
      folderRefs: {}, // Хранит ссылки на компоненты папок
    };
  },
  methods: {
    // Обработчик события разворачивания/сворачивания папки
    handleFolderToggled(data) {
      // Передаем событие наверх
      this.$emit("folderToggled", data);
    },

    // Найти папку с указанным ID (рекурсивно)
    findFolderComponent(id) {
      // Если у нас есть прямая ссылка
      if (this.folderRefs[id]) {
        return this.folderRefs[id];
      }

      // Рекурсивно ищем в дочерних элементах
      return null;
    },

    // Публичный метод для раскрытия папки по ID извне
    expandFolder(folderId) {
      // Попробуем найти папку в прямых ссылках
      const folderComponent = this.findFolderComponent(folderId);
      if (folderComponent) {
        folderComponent.expandFolder();
        return true;
      }

      // Если не нашли, добавим ID в expandedFolders,
      // чтобы папка раскрылась при ближайшем рендеринге
      if (!this.expandedFolders.includes(folderId)) {
        this.$emit("updateExpandedFolders", [
          ...this.expandedFolders,
          folderId,
        ]);
      }

      return false;
    },

    // Раскрыть родительские папки для указанной папки
    expandPathToFolder(folderId) {
      // Получаем путь к папке от корня
      const path = this.getFolderPath(folderId);

      // Раскрываем каждую папку в пути
      path.forEach((id) => {
        this.expandFolder(id);
      });
    },

    // Получает путь от корня до указанной папки
    getFolderPath(folderId, items = this.folderStructure, currentPath = []) {
      for (const item of items) {
        if (item.id === folderId && item.type === "folder") {
          return [...currentPath];
        }

        if (item.type === "folder" && item.children) {
          const path = this.getFolderPath(folderId, item.children, [
            ...currentPath,
            item.id,
          ]);
          if (path.length > 0) {
            return path;
          }
        }
      }

      return [];
    },

    // Обработка перетаскивания над корневым каталогом
    handleDragOver(event) {
      // Проверяем, что перетаскивание происходит над folder-tree, а не над вложенными элементами
      if (event.target.classList.contains("folder-tree")) {
        // Отменяем существующий таймер, если он есть
        if (this.dragOverTimer) {
          clearTimeout(this.dragOverTimer);
        }

        this.isDragOver = true;
      }
    },

    handleDragLeave() {
      // Создаем небольшую задержку перед сбросом состояния,
      // чтобы избежать мерцания при перемещении мыши между элементами
      this.dragOverTimer = setTimeout(() => {
        this.isDragOver = false;
      }, 100);
    },

    handleDrop(event) {
      // Сбрасываем состояние drag-over
      this.isDragOver = false;

      // Убеждаемся, что drop произошел непосредственно на folder-tree
      if (event.target.classList.contains("folder-tree")) {
        try {
          // Получаем данные о перетаскиваемом элементе
          const itemData = JSON.parse(event.dataTransfer.getData("text/plain"));

          // Генерируем событие для перемещения в корневой каталог (null = корневой каталог)
          this.$emit("moveItem", {
            sourceId: itemData.id,
            targetId: null,
          });
        } catch (e) {
          console.error("Ошибка при обработке перетаскивания:", e);
        }
      }
    },
  },
  beforeUnmount() {
    // Очищаем таймер при уничтожении компонента
    if (this.dragOverTimer) {
      clearTimeout(this.dragOverTimer);
    }
  },
};
</script>

<style scoped src="@/assets/css/components/LeftSidebar.css"></style>