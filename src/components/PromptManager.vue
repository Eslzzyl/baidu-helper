<template>
  <v-card class="pa-4 h-100" flat>
    <v-card-title class="text-center pb-4">提示词管理</v-card-title>
    
    <v-card-text>
      <v-row>
        <!-- 视觉模型提示词 -->
        <v-col cols="12" md="6">
          <div class="text-h6 mb-4 text-center">视觉模型</div>
          <div class="mb-2 d-flex justify-space-between align-center">
            <div class="text-subtitle-1">系统提示词</div>
            <v-btn
              icon
              @click="copyToClipboard(visionSystemPrompt)"
              title="复制到剪贴板"
            >
              <v-icon>mdi-content-copy</v-icon>
            </v-btn>
          </div>
          
          <v-textarea
            v-model="visionSystemPrompt"
            outlined
            rows="8"
            auto-grow
            hide-details
            placeholder="输入视觉模型的系统提示词"
            class="scrollable-textarea"
          ></v-textarea>
          
          <v-btn
            color="primary"
            block
            class="mt-4"
            @click="saveVisionPrompt"
          >
            保存视觉模型提示词
          </v-btn>
        </v-col>
        
        <!-- 文本模型提示词 -->
        <v-col cols="12" md="6">
          <div class="text-h6 mb-4 text-center">文本模型</div>
          <div class="mb-2 d-flex justify-space-between align-center">
            <div class="text-subtitle-1">系统提示词</div>
            <v-btn
              icon
              @click="copyToClipboard(textSystemPrompt)"
              title="复制到剪贴板"
            >
              <v-icon>mdi-content-copy</v-icon>
            </v-btn>
          </div>
          
          <v-textarea
            v-model="textSystemPrompt"
            outlined
            rows="8"
            auto-grow
            hide-details
            placeholder="输入文本模型的系统提示词"
            class="scrollable-textarea"
          ></v-textarea>
          
          <v-btn
            color="primary"
            block
            class="mt-4"
            @click="saveTextPrompt"
          >
            保存文本模型提示词
          </v-btn>
        </v-col>
      </v-row>
      
      <v-snackbar v-model="snackbar" :timeout="2000" :color="snackbarColor">
        {{ snackbarText }}
      </v-snackbar>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import openAIService from '@/services/llm';

const textSystemPrompt = ref('');
const visionSystemPrompt = ref('');

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('success');

onMounted(() => {
  const textConfig = openAIService.getTextConfig();
  const visionConfig = openAIService.getVisionConfig();
  
  textSystemPrompt.value = textConfig.systemPrompt || '';
  visionSystemPrompt.value = visionConfig.systemPrompt || '';
});

const saveTextPrompt = () => {
  try {
    const config = openAIService.getTextConfig();
    config.systemPrompt = textSystemPrompt.value;
    openAIService.updateTextClient(config);
    showSnackbar('文本模型提示词已保存', 'success');
  } catch (error) {
    console.error('Error saving text prompt:', error);
    showSnackbar('保存失败: ' + error.message, 'error');
  }
};

const saveVisionPrompt = () => {
  try {
    const config = openAIService.getVisionConfig();
    config.systemPrompt = visionSystemPrompt.value;
    openAIService.updateVisionClient(config);
    showSnackbar('视觉模型提示词已保存', 'success');
  } catch (error) {
    console.error('Error saving vision prompt:', error);
    showSnackbar('保存失败: ' + error.message, 'error');
  }
};

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text)
    .then(() => {
      showSnackbar('文本已复制到剪贴板');
    })
    .catch(err => {
      console.error('Failed to copy text: ', err);
      showSnackbar('复制失败: ' + err.message, 'error');
    });
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

.scrollable-textarea {
  max-height: 300px;
}
</style>
