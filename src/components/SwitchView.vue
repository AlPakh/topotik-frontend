<template>
  <div class="view-switcher">
    <button 
      @click="$emit('switchView', 'list')" 
      :class="{ active: activeView === 'list' }"
      class="view-button list-button"
    >
      <span class="icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
      </span>
      List
    </button>
    <button 
      @click="$emit('switchView', 'grid')" 
      :class="{ active: activeView === 'grid' }"
      class="view-button grid-button"
    >
      <span class="icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      </span>
      Grid
    </button>
  </div>
</template>

<script>
export default {
  name: 'SwitchView',
  props: {
    activeView: {
      type: String,
      default: 'list'
    }
  }
}
</script>

<style scoped src="@/assets/css/components/SwitchView.css"></style>
