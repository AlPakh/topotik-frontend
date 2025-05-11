<template>
  <div class="left-sidebar">
    <div class="sidebar-header" @click="showRootContents">
      <h3>Проекты</h3>
    </div>

    <!-- Дерево папок и карт -->
    <ul class="folder-tree"
        @dragover.prevent="handleDragOver"
        @dragleave="handleDragLeave"
        @drop.prevent="handleDrop"
        :class="{ 'drag-over': isDragOver }">
      <folder-tree-item
        v-for="item in folderStructure"
        :key="item.id"
        :item="item"
        @selectItem="$emit('selectItem', $event)"
        @moveItem="$emit('moveItem', $event)"
        @renameItem="$emit('renameItem', $event)"
        @deleteItem="$emit('deleteItem', $event)"
      />
    </ul>

    <!-- Кнопка создания нового элемента -->
    <div class="create-btn-container">
      <button class="create-btn" @click="$emit('createNew')">
        Создать
      </button>
    </div>
  </div>
</template>

<script>
import FolderTreeItem from './FolderTreeItem.vue'

export default {
  name: 'LeftSidebar',
  components: {
    FolderTreeItem
  },
  props: {
    folderStructure: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      isDragOver: false,
      dragOverTimer: null
    }
  },
  methods: {
    // Обработчик клика на заголовок "Проекты"
    showRootContents() {
      // Генерируем событие для отображения корневого каталога
      this.$emit('showRootContents')
    },
    
    // Обработка перетаскивания над корневым каталогом
    handleDragOver(event) {
      // Проверяем, что перетаскивание происходит над folder-tree, а не над вложенными элементами
      if (event.target.classList.contains('folder-tree')) {
        // Отменяем существующий таймер, если он есть
        if (this.dragOverTimer) {
          clearTimeout(this.dragOverTimer)
        }
        
        this.isDragOver = true
      }
    },
    
    handleDragLeave() {
      // Создаем небольшую задержку перед сбросом состояния,
      // чтобы избежать мерцания при перемещении мыши между элементами
      this.dragOverTimer = setTimeout(() => {
        this.isDragOver = false
      }, 100)
    },
    
    handleDrop(event) {
      // Сбрасываем состояние drag-over
      this.isDragOver = false
      
      // Убеждаемся, что drop произошел непосредственно на folder-tree
      if (event.target.classList.contains('folder-tree')) {
        try {
          // Получаем данные о перетаскиваемом элементе
          const itemData = JSON.parse(event.dataTransfer.getData('text/plain'))
          
          // Генерируем событие для перемещения в корневой каталог (null = корневой каталог)
          this.$emit('moveItem', { 
            sourceId: itemData.id, 
            targetId: null
          })
        } catch (e) {
          console.error('Ошибка при обработке перетаскивания:', e)
        }
      }
    }
  },
  beforeUnmount() {
    // Очищаем таймер при уничтожении компонента
    if (this.dragOverTimer) {
      clearTimeout(this.dragOverTimer)
    }
  }
}
</script>

<style scoped src="@/assets/css/components/LeftSidebar.css"></style>

<style scoped>
.sidebar-header {
  cursor: pointer;
  user-select: none;
}

.sidebar-header:hover h3 {
  color: #007bff;
}

.folder-tree.drag-over {
  background-color: rgba(0, 123, 255, 0.1);
  border: 2px dashed #007bff;
  border-radius: 4px;
}
</style>
