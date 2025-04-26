<template>
  <v-app>
    <v-main>
      <v-container fluid>
        <v-row>
          <v-col cols="12">
            <v-sheet class="pa-4">
              <div v-if="activeTab === 'main-page'">
                <MainPage />
              </div>
              <div v-else-if="activeTab === 'api-settings'">
                <ApiSettings />
              </div>
              <div v-else-if="activeTab === 'prompt-manager'">
                <PromptManager />
              </div>
            </v-sheet>
          </v-col>
        </v-row>

        <!-- 边缘悬浮导航按钮 -->
        <div class="floating-nav">
          <v-tooltip left>
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" icon color="primary" class="mb-2" @click="activeTab = 'main-page'"
                :outlined="activeTab !== 'main-page'">
                <v-icon>mdi-view-grid</v-icon>
              </v-btn>
            </template>
            <span>图文识别与解答</span>
          </v-tooltip>

          <v-tooltip left>
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" icon color="primary" class="mb-2" @click="activeTab = 'api-settings'"
                :outlined="activeTab !== 'api-settings'">
                <v-icon>mdi-api</v-icon>
              </v-btn>
            </template>
            <span>API设置</span>
          </v-tooltip>

          <v-tooltip left>
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" icon color="primary" @click="activeTab = 'prompt-manager'"
                :outlined="activeTab !== 'prompt-manager'">
                <v-icon>mdi-format-text</v-icon>
              </v-btn>
            </template>
            <span>提示词</span>
          </v-tooltip>
        </div>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from 'vue';
import ApiSettings from '@/components/ApiSettings.vue';
import PromptManager from '@/components/PromptManager.vue';
import MainPage from '@/components/MainPage.vue';

const activeTab = ref('main-page');
</script>

<style scoped>
.floating-nav {
  position: fixed;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  z-index: 10;
}

.floating-nav .v-btn {
  margin-bottom: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
</style>
