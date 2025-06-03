<template>
  <div id="app">
    <router-view />
    <app-alert />
    <share-modal
      v-if="showShareModal"
      :resourceType="shareModalData.resourceType"
      :resourceId="shareModalData.resourceId"
      :owner="shareModalData.owner"
      @close="closeShareModal"
    />
  </div>
</template>

<script>
import AppAlert from "@/components/AppAlert.vue";
import ShareModal from "@/components/ShareModal.vue";
import { EventBus } from "@/services/eventBus";

export default {
  name: "App",
  components: {
    AppAlert,
    ShareModal,
  },
  data() {
    return {
      showShareModal: false,
      shareModalData: {
        resourceType: "map",
        resourceId: "",
        owner: null,
      },
    };
  },
  mounted() {
    // Добавляем слушатель события для открытия модального окна шеринга
    EventBus.$on("open-share-modal", this.openShareModal);
  },
  unmounted() {
    // Удаляем слушатель при уничтожении компонента
    EventBus.$off("open-share-modal", this.openShareModal);
  },
  methods: {
    openShareModal(data) {
      console.log("Открытие модального окна шеринга:", data);
      this.shareModalData = data;
      this.showShareModal = true;
    },
    closeShareModal() {
      this.showShareModal = false;
    },
  },
};
</script>

<style src="@/assets/css/app.css"></style>
