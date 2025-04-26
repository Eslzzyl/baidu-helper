<template>
  <v-row>
    <!-- 左侧：图片文字识别 -->
    <v-col cols="12" md="6">
      <div class="text-h6 mb-3 text-center">图片文字识别</div>

      <ImageTextInput v-model:textInput="userNotes" v-model:images="ocrImages" label="请输入关于图片的备注或提示（可选）"
        placeholder="在此输入备注信息，帮助模型更好地理解图片内容" :rows="2" @paste-image="handleOcrImagePaste" @keydown="handleOcrKeydown"
        instanceId="ocr-image-input" />

      <div class="text-center mt-3">
        <v-btn color="primary" @click="recognizeText" :loading="loadingImage" :disabled="!ocrImages.length">
          识别文字
        </v-btn>
      </div>

      <v-card outlined class="pa-3 mt-3">
        <v-textarea clearable v-model="recognizedText" placeholder="识别结果将显示在这里" rows="8" auto-grow outlined hide-details
          class="text-area-result"></v-textarea>
        <div class="d-flex justify-space-between align-center mt-2">
          <v-btn color="info" @click="formatText('recognizedText')" :disabled="!recognizedText" small>
            <v-icon left>mdi-format-text</v-icon>格式化
          </v-btn>
          <div>
            <v-btn color="primary" @click="syncToAnswer" :disabled="!recognizedText" small class="mr-2">
              <v-icon left>mdi-sync</v-icon>同步到生成解答
            </v-btn>
            <v-btn color="primary" @click="copyToClipboard(recognizedText)" :disabled="!recognizedText" title="复制到剪贴板">
              复制
            </v-btn>
          </div>
        </div>
      </v-card>
    </v-col>

    <!-- 右侧：文本生成解答 -->
    <v-col cols="12" md="6">
      <div class="text-h6 mb-3 text-center">生成解答</div>

      <ImageTextInput v-model:textInput="userInput" v-model:images="multipleImages" label="请输入问题或文本内容"
        placeholder="输入你的问题或粘贴文本内容" :rows="4" @paste-image="handleAnswerImagePaste" @keydown="handleAnswerKeydown"
        instanceId="answer-image-input">
      </ImageTextInput>

      <div class="text-center mt-3">
        <v-btn color="primary" @click="generateAnswer" :loading="loadingText"
          :disabled="!userInput && !multipleImages.length">
          生成解答
        </v-btn>
      </div>

      <v-card outlined class="pa-3 mt-3">
        <v-textarea clearable v-model="generatedAnswer" placeholder="解答结果将显示在这里" rows="8" auto-grow outlined
          hide-details class="text-area-result"></v-textarea>
        <div class="d-flex justify-space-between align-center mt-2">
          <v-btn color="info" @click="formatText('generatedAnswer')" :disabled="!generatedAnswer" small>
            <v-icon left>mdi-format-text</v-icon>格式化
          </v-btn>
          <v-btn color="primary" @click="copyToClipboard(generatedAnswer)" :disabled="!generatedAnswer" title="复制到剪贴板">
            复制
          </v-btn>
        </div>
      </v-card>
    </v-col>
  </v-row>

  <v-snackbar v-model="snackbar" :timeout="2000" :color="snackbarColor">
    {{ snackbarText }}
  </v-snackbar>
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
  recognizedText.value = ''; // 清空之前的结果

  try {
    const imageBase64Array = ocrImages.value.map(img => img.base64);

    try {
      // 使用流式API，传入所有图片
      await openAIService.createChatCompletion({
        text: userNotes.value,
        imageBase64Array: imageBase64Array,
        mode: 'ocr',
        stream: true,
        onStream: (chunk, fullText) => {
          recognizedText.value = fullText;
        }
      });
    } catch (error) {
      console.error('Error recognizing text:', error);
      showSnackbar('识别失败: ' + error.message, 'error');
    } finally {
      loadingImage.value = false;
    }
  } catch (error) {
    loadingImage.value = false;
    console.error('Error processing images:', error);
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
  generatedAnswer.value = ''; // 清空之前的结果

  try {
    // 使用流式API
    const imageBase64Array = multipleImages.value.map(img => img.base64);

    await openAIService.createChatCompletion({
      text: userInput.value,
      imageBase64Array: imageBase64Array,
      mode: 'answer',
      stream: true,
      onStream: (chunk, fullText) => {
        generatedAnswer.value = fullText;
      }
    });
  } catch (error) {
    console.error('Error generating answer:', error);
    showSnackbar('生成解答失败: ' + error.message, 'error');
  } finally {
    loadingText.value = false;
  }
};

// 同步识别结果到解答输入
const syncToAnswer = () => {
  if (recognizedText.value) {
    userInput.value = recognizedText.value;
  }
};

// 格式化文本方法
const formatText = (textRef) => {
  if (!textRef || (textRef !== 'recognizedText' && textRef !== 'generatedAnswer')) return;

  let text = textRef === 'recognizedText' ? recognizedText.value : generatedAnswer.value;

  if (!text) return;

  // 1. 所有的英文分号改为中文分号
  text = text.replace(/;/g, '；');

  // 2. 所有的英文括号改为中文括号，但括号中有一个数字的除外
  text = text.replace(/\(([^0-9]|[0-9]{2,}|$)/g, '（$1');
  text = text.replace(/([^0-9]|^|[0-9]{2,})\)/g, '$1）');

  // 3. 所有的中文括号中间如果没有内容，则应当插入一个空格
  text = text.replace(/（）/g, '（ ）');

  // 更新对应的文本
  if (textRef === 'recognizedText') {
    recognizedText.value = text;
  } else {
    generatedAnswer.value = text;
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

const showSnackbar = (text, color = 'error') => {
  snackbarText.value = text;
  snackbarColor.value = color;
  snackbar.value = true;
};

// 键盘事件处理
const handleOcrKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (ocrImages.value.length && (userNotes.value.trim() || ocrImages.value.length > 0)) {
      recognizeText();
    }
  }
};

const handleAnswerKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (userInput.value.trim() || multipleImages.value.length > 0) {
      generateAnswer();
    }
  }
};
</script>

<style scoped>
.text-pre-wrap {
  white-space: pre-wrap;
  word-break: break-word;
}

.text-area-result {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}
</style>
