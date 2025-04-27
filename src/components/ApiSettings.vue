<template>
  <v-row>
    <!-- 视觉模型设置 -->
    <v-col cols="12" md="6">
      <div class="text-h6 mb-4 text-center">视觉模型</div>
      <v-form>
        <v-text-field v-model="visionConfig.baseUrl" label="基础URL (Base URL)" outlined dense
          placeholder="https://api.openai.com/v1"></v-text-field>

        <v-text-field v-model="visionConfig.apiKey" label="API Key" outlined dense placeholder="sk-..." type="password"
          autocomplete="off"></v-text-field>

        <v-text-field v-model="visionConfig.model" label="模型名称" outlined dense
          placeholder="gpt-4-vision-preview"></v-text-field>

        <v-slider v-model="visionConfig.temperature" label="温度" min="0" max="2" step="0.1" thumb-label ticks>
          <template v-slot:append>
            <span class="ml-2">{{ visionConfig.temperature.toFixed(1) }}</span>
          </template>
        </v-slider>

        <v-btn color="primary" block class="mt-4" @click="saveVisionConfig">
          保存视觉模型设置
        </v-btn>
      </v-form>
    </v-col>

    <!-- 文本模型设置 -->
    <v-col cols="12" md="6">
      <div class="text-h6 mb-4 text-center">文本模型</div>
      <v-form>
        <v-text-field v-model="textConfig.baseUrl" label="基础URL (Base URL)" outlined dense
          placeholder="https://api.openai.com/v1"></v-text-field>

        <v-text-field v-model="textConfig.apiKey" label="API Key" outlined dense placeholder="sk-..." type="password"
          autocomplete="off"></v-text-field>

        <v-text-field v-model="textConfig.model" label="模型名称" outlined dense placeholder="gpt-3.5-turbo"></v-text-field>

        <v-slider v-model="textConfig.temperature" label="温度" min="0" max="2" step="0.1" thumb-label ticks>
          <template v-slot:append>
            <span class="ml-2">{{ textConfig.temperature.toFixed(1) }}</span>
          </template>
        </v-slider>

        <v-btn color="primary" block class="mt-4" @click="saveTextConfig">
          保存文本模型设置
        </v-btn>
      </v-form>
    </v-col>
  </v-row>

  <v-snackbar v-model="snackbar" :timeout="2000" :color="snackbarColor">
    {{ snackbarText }}
  </v-snackbar>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import openAIService from '@/services/llm';

const textConfig = ref({
  baseUrl: '',
  apiKey: '',
  model: '',
  temperature: 0.7
});
const visionConfig = ref({
  baseUrl: '',
  apiKey: '',
  model: '',
  temperature: 0.7
});

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('success');

onMounted(() => {
  textConfig.value = openAIService.getTextConfig();
  visionConfig.value = openAIService.getVisionConfig();
});

const saveTextConfig = () => {
  try {
    openAIService.updateTextClient(textConfig.value);
    showSnackbar('文本模型设置已保存', 'success');
  } catch (error) {
    console.error('Error saving text config:', error);
    showSnackbar('保存失败: ' + error.message, 'error');
  }
};

const saveVisionConfig = () => {
  try {
    openAIService.updateVisionClient(visionConfig.value);
    showSnackbar('视觉模型设置已保存', 'success');
  } catch (error) {
    console.error('Error saving vision config:', error);
    showSnackbar('保存失败: ' + error.message, 'error');
  }
};

const showSnackbar = (text, color = 'success') => {
  snackbarText.value = text;
  snackbarColor.value = color;
  snackbar.value = true;
};
</script>

<style scoped>
.h-100 {
  height: 100%;
}

.scrollable-window {
  overflow-y: auto;
  max-height: calc(100vh - 200px);
}
</style>
