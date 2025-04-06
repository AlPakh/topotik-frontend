<template>
  <div class="create-panel">
    <div class="panel-header">
      <h2 class="panel-title">Создать новый элемент</h2>
      <button class="close-button" @click="$emit('close')">&times;</button>
    </div>
    
    <div class="input-group">
      <label for="new-name">Название:</label>
      <input 
        id="new-name"
        v-model="newName" 
        placeholder="Введите название..." 
        class="name-input"
      />
    </div>
    
    <div class="card-container">
      <div class="create-card" @click="createMap('real')">
        <div class="card-icon">
          <img src="@/assets/img/city.png" alt="Карта местности" />
        </div>
        <div class="card-title">Карта местности</div>
        <div class="card-description">
          Создать карту на основе реального мира
        </div>
      </div>
      
      <div class="create-card" @click="createMap('custom')">
        <div class="card-icon">
          <img src="@/assets/img/custom.png" alt="Пользовательская карта" />
        </div>
        <div class="card-title">Пользовательская карта</div>
        <div class="card-description">
          Создать собственную пользовательскую карту
        </div>
      </div>
      
      <div class="create-card" @click="createFolder">
        <div class="card-icon">
          <img src="@/assets/img/folder.png" alt="Папка" />
        </div>
        <div class="card-title">Папка</div>
        <div class="card-description">
          Создать новую папку для организации карт
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CreatePanel',
  emits: ['createMap', 'createFolder', 'close'],
  data() {
    return {
      newName: ''
    }
  },
  methods: {
    createMap(type) {
      if (!this.newName.trim()) {
        alert('Введите название карты!')
        return
      }
      this.$emit('createMap', {
        mapType: type,
        mapName: this.newName
      })
      this.newName = ''
    },
    createFolder() {
      if (!this.newName.trim()) {
        alert('Введите название папки!')
        return
      }
      this.$emit('createFolder', this.newName)
      this.newName = ''
    }
  }
}
</script>

<style scoped src="@/assets/css/components/CreatePanel.css"></style>
