<template>
  <div class="left-sidebar">
    <div class="sidebar-header">
      <h3>Проекты</h3>
    </div>

    <!-- Дерево папок и карт -->
    <ul class="folder-tree">
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
  }
}
</script>

<style scoped src="@/assets/css/components/LeftSidebar.css"></style>
