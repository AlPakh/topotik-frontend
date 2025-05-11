<template>
  <div class="create-panel">
    <div class="panel-header">
      <h2 class="panel-title">Создать новый элемент</h2>
      <button class="close-button" @click="$emit('close')">&times;</button>
    </div>
    
    <div class="card-container">
      <div class="create-card" @click="showDialog('map-real')">
        <div class="card-icon">
          <img src="@/assets/img/city.png" alt="Карта местности" />
        </div>
        <div class="card-title">Карта местности</div>
        <div class="card-description">
          Создать карту на основе реального мира
        </div>
      </div>
      
      <div class="create-card" @click="showDialog('map-custom')">
        <div class="card-icon">
          <img src="@/assets/img/custom.png" alt="Пользовательская карта" />
        </div>
        <div class="card-title">Пользовательская карта</div>
        <div class="card-description">
          Создать собственную пользовательскую карту
        </div>
      </div>
      
      <div class="create-card" @click="showDialog('folder')">
        <div class="card-icon">
          <img src="@/assets/img/folder.png" alt="Папка" />
        </div>
        <div class="card-title">Папка</div>
        <div class="card-description">
          Создать новую папку для организации карт
        </div>
      </div>
    </div>

    <!-- Диалоговое окно для создания элементов -->
    <create-item-dialog
      :show="showItemDialog"
      :item-type="selectedItemType"
      @create="handleCreateItem"
      @cancel="cancelDialog"
    />
  </div>
</template>

<script>
import CreateItemDialog from './CreateItemDialog.vue'

export default {
  name: 'CreatePanel',
  components: {
    CreateItemDialog
  },
  emits: ['createMap', 'createFolder', 'close'],
  data() {
    return {
      showItemDialog: false,
      selectedItemType: null
    }
  },
  methods: {
    showDialog(itemType) {
      this.selectedItemType = itemType
      this.showItemDialog = true
    },
    cancelDialog() {
      this.showItemDialog = false
    },
    handleCreateItem(item) {
      if (item.type === 'map') {
        this.$emit('createMap', {
          mapType: item.mapType,
          mapName: item.name
        })
      } else if (item.type === 'folder') {
        this.$emit('createFolder', item.name)
      }
      this.showItemDialog = false
    }
  }
}
</script>

<style scoped src="@/assets/css/components/CreatePanel.css"></style>
