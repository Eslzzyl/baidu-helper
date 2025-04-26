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

        <v-row>
          <v-col cols="12">
            <v-bottom-navigation v-model="activeTab" color="primary" grow>
              <v-btn value="main-page">
                <v-icon>mdi-view-grid</v-icon>
                <span>图文识别与解答</span>
              </v-btn>

              <v-btn value="api-settings">
                <v-icon>mdi-api</v-icon>
                <span>API设置</span>
              </v-btn>

              <v-btn value="prompt-manager">
                <v-icon>mdi-format-text</v-icon>
                <span>提示词</span>
              </v-btn>
            </v-bottom-navigation>
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
