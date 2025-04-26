<template>
  <v-card class="pa-4 h-100" flat>
    <v-card-text>
      <v-row>
        <!-- 左侧：图片文字识别 -->
        <v-col cols="12" md="6">
          <div class="text-h6 mb-3 text-center">图片文字识别</div>

          <ImageTextInput v-model:textInput="userNotes" v-model:images="ocrImages" label="请输入关于图片的备注或提示（可选）"
            placeholder="在此输入备注信息，帮助模型更好地理解图片内容" :rows="2" @paste-image="handleOcrImagePaste" />

          <div class="text-center mt-3">
            <v-btn color="primary" @click="recognizeText" :loading="loadingImage" :disabled="!ocrImages.length">
              识别文字
            </v-btn>
          </div>

          <v-card outlined class="pa-3 mt-3">
            <div class="d-flex justify-space-between align-center mb-2">
              <div class="text-subtitle-1 font-weight-bold">识别结果</div>
              <v-btn icon @click="copyToClipboard(recognizedText)" :disabled="!recognizedText" title="复制到剪贴板">
                <v-icon>mdi-content-copy</v-icon>
              </v-btn>
            </div>
            <v-divider class="mb-2"></v-divider>
            <v-textarea v-model="recognizedText" placeholder="识别结果将显示在这里" rows="8" auto-grow outlined hide-details
              class="text-area-result"></v-textarea>
          </v-card>
        </v-col>

        <!-- 右侧：文本生成解答 -->
        <v-col cols="12" md="6">
          <div class="text-h6 mb-3 text-center">生成解答</div>

          <ImageTextInput v-model:textInput="userInput" v-model:images="multipleImages" label="请输入问题或文本内容"
            placeholder="输入你的问题或粘贴文本内容" :rows="4" @paste-image="handleAnswerImagePaste" />

          <div class="d-flex justify-space-between align-center mt-3">
            <v-btn color="primary" @click="generateAnswer" :loading="loadingText"
              :disabled="!userInput && !multipleImages.length">
              生成解答
            </v-btn>
            <v-btn icon @click="copyToClipboard(userInput)" :disabled="!userInput" title="复制输入内容">
              <v-icon>mdi-content-copy</v-icon>
            </v-btn>
          </div>

          <v-card outlined class="pa-3 mt-3">
            <div class="d-flex justify-space-between align-center mb-2">
              <div class="text-subtitle-1 font-weight-bold">解答结果</div>
              <v-btn icon @click="copyToClipboard(generatedAnswer)" :disabled="!generatedAnswer" title="复制到剪贴板">
                <v-icon>mdi-content-copy</v-icon>
              </v-btn>
            </div>
            <v-divider class="mb-2"></v-divider>
            <v-textarea v-model="generatedAnswer" placeholder="解答结果将显示在这里" rows="8" auto-grow outlined hide-details
              class="text-area-result"></v-textarea>
          </v-card>
        </v-col>
      </v-row>

      <v-snackbar v-model="snackbar" :timeout="2000" :color="snackbarColor">
        {{ snackbarText }}
      </v-snackbar>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import openAIService from '@/services/llm';
import ImageTextInput from '@/components/ImageTextInput.vue';

// 图片文字识别相关
const recognizedText = ref('');
const loadingImage = ref(false);
const userNotes = ref('');
const ocrImages = ref([]);

// 文本生成解答相关
const userInput = ref('');
const generatedAnswer = ref('');
const loadingText = ref(false);
const multipleImages = ref([]);

// 共用
const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('success');

// 图片文字识别方法
const recognizeText = async () => {
  if (!ocrImages.value.length) return;

  loadingImage.value = true;

  try {
    // 只使用第一张图片进行OCR
    const base64Image = ocrImages.value[0].base64;

    try {
      recognizedText.value = await openAIService.extractTextFromImage(base64Image, userNotes.value);
    } catch (error) {
      console.error('Error recognizing text:', error);
      showSnackbar('识别失败: ' + error.message, 'error');
    } finally {
      loadingImage.value = false;
    }
  } catch (error) {
    loadingImage.value = false;
    console.error('Error processing image:', error);
    showSnackbar('处理图片失败: ' + error.message, 'error');
  }
};

// 图片粘贴处理方法
const handleOcrImagePaste = (blob) => {
  if (!blob) return;

  // 创建图片预览
  const reader = new FileReader();
  reader.onload = (e) => {
    ocrImages.value.push({
      file: blob,
      preview: e.target.result,
      base64: e.target.result.split(',')[1]
    });
  };
  reader.readAsDataURL(blob);
};

const handleAnswerImagePaste = (blob) => {
  if (!blob) return;

  // 创建图片预览
  const reader = new FileReader();
  reader.onload = (e) => {
    multipleImages.value.push({
      file: blob,
      preview: e.target.result,
      base64: e.target.result.split(',')[1]
    });
  };
  reader.readAsDataURL(blob);
};

// 生成解答方法
const generateAnswer = async () => {
  if (!userInput.value && multipleImages.value.length === 0) return;

  loadingText.value = true;

  try {
    // 如果有图片和文本，使用多模态API
    if (multipleImages.value.length > 0) {
      const imageDataList = multipleImages.value.map(img => img.base64);
      generatedAnswer.value = await openAIService.generateTextWithImages(userInput.value, imageDataList);
    } else {
      // 纯文本请求
      generatedAnswer.value = await openAIService.generateTextAnswer(userInput.value);
    }
  } catch (error) {
    console.error('Error generating answer:', error);
    showSnackbar('生成解答失败: ' + error.message, 'error');
  } finally {
    loadingText.value = false;
  }
};

// 共用方法
const copyToClipboard = (text) => {
  if (!text) return;

  navigator.clipboard.writeText(text)
    .then(() => {
    })
    .catch(err => {
      console.error('Failed to copy text: ', err);
      showSnackbar('复制失败: ' + err.message, 'error');
    });
};

// 只在错误时显示 Snackbar
const showSnackbar = (text, color = 'error') => {
  if (color === 'error') {
    snackbarText.value = text;
    snackbarColor.value = color;
    snackbar.value = true;
  }
};
</script>

<style scoped>
.text-pre-wrap {
  white-space: pre-wrap;
  word-break: break-word;
}

.h-100 {
  height: 100%;
}

.text-area-result {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

.v-textarea.text-area-result>>>textarea {
  min-height: 200px;
}
</style>
