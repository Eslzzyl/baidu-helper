<template>
  <v-app>
    <!-- 顶部导航栏 -->
    <v-app-bar app elevation="1" density="compact">
      <v-container class="px-1 py-1">
        <v-row no-gutters align="center">
          <!-- 主题切换按钮 - 靠左 -->
          <v-col cols="1" class="d-flex justify-start">
            <v-btn icon @click="toggleTheme">
              <v-icon>{{ isDarkTheme ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
            </v-btn>
          </v-col>

          <v-spacer></v-spacer>

          <!-- 标签页居中 -->
          <v-col cols="8" class="d-flex justify-center">
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
          </v-col>

          <!-- 占位 - 右侧 -->
          <v-col cols="2"></v-col>
        </v-row>
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
import { ref, computed } from 'vue';
import { useTheme } from 'vuetify';
import ApiSettings from '@/components/ApiSettings.vue';
import PromptManager from '@/components/PromptManager.vue';
import MainPage from '@/components/MainPage.vue';

const activeTab = ref('main-page');
const theme = useTheme();

const isDarkTheme = computed(() => theme.global.current.value.dark);

function toggleTheme() {
  theme.global.name.value = isDarkTheme.value ? 'light' : 'dark';
}
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
