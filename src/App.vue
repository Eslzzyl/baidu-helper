<template>
  <v-app>
    <!-- 顶部导航栏 -->
    <v-app-bar app color="white" elevation="1" density="compact">
      <v-container class="d-flex align-center justify-center py-1">
        <v-btn-toggle v-model="activeTab" color="primary" mandatory density="comfortable">
          <v-btn value="main-page" class="text-body-2">
            <v-icon size="small">mdi-view-grid</v-icon>
            <span class="ml-1">图文识别与解答</span>
          </v-btn>

          <v-btn value="api-settings" class="text-body-2">
            <v-icon size="small">mdi-api</v-icon>
            <span class="ml-1">API设置</span>
          </v-btn>

          <v-btn value="prompt-manager" class="text-body-2">
            <v-icon size="small">mdi-format-text</v-icon>
            <span class="ml-1">提示词</span>
          </v-btn>
        </v-btn-toggle>
      </v-container>
    </v-app-bar>

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
.v-btn-toggle {
  border-radius: 4px;
}

.v-btn-toggle .v-btn {
  min-width: 110px;
  height: 36px;
}
</style>
