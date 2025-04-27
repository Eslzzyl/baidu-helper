<template>
  <v-row>
    <!-- 左侧：图片文字识别 -->
    <v-col cols="12" md="6">
      <div class="text-h6 mb-3 text-center">图片文字识别</div>

      <ImageTextInput v-model:textInput="userNotes" v-model:images="ocrImages" label="请输入关于图片的备注或提示（可选）"
        placeholder="在此输入备注信息，帮助模型更好地理解图片内容" :rows="2" @paste-image="handleOcrImagePaste" @keydown="handleOcrKeydown"
        instanceId="ocr-image-input" :image-aspect-ratios="imageAspectRatios" @image-added="handleImageAdded"
        @image-removed="handleImageRemoved" @images-cleared="handleImagesCleared('ocr')" />

      <div class="text-center mt-3">
        <v-btn v-if="!loadingImage" color="primary" @click="recognizeText" :disabled="!ocrImages.length">
          识别文字
        </v-btn>
        <v-btn v-else color="error" @click="abortOcr">
          <v-icon left>mdi-cancel</v-icon>
          中止识别
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
        instanceId="answer-image-input" :image-aspect-ratios="imageAspectRatios" @image-added="handleImageAdded"
        @image-removed="handleImageRemoved" @images-cleared="handleImagesCleared('answer')" />

      <div class="text-center mt-3">
        <v-btn v-if="!loadingText" color="primary" @click="generateAnswer"
          :disabled="!userInput && !multipleImages.length">
          生成解答
        </v-btn>
        <v-btn v-else color="error" @click="abortAnswer">
          <v-icon left>mdi-cancel</v-icon>
          中止生成
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
import { ref, onMounted, onUnmounted, watch } from 'vue'; // 导入 watch
import openAIService from '@/services/llm';
import ImageTextInput from '@/components/ImageTextInput.vue';

// 定义 localStorage 键名
const STORAGE_KEYS = {
  USER_NOTES: 'baidu_helper_userNotes',
  OCR_IMAGES: 'baidu_helper_ocrImages',
  RECOGNIZED_TEXT: 'baidu_helper_recognizedText',
  USER_INPUT: 'baidu_helper_userInput',
  MULTIPLE_IMAGES: 'baidu_helper_multipleImages',
  GENERATED_ANSWER: 'baidu_helper_generatedAnswer',
  IMAGE_ASPECT_RATIOS: 'baidu_helper_imageAspectRatios', // 新增宽高比存储键
};

// 图片文字识别相关
const recognizedText = ref('');
const loadingImage = ref(false);
const userNotes = ref('');
const ocrImages = ref([]); // { file: Blob | null, preview: string, base64: string }

// 文本生成解答相关
const userInput = ref('');
const generatedAnswer = ref('');
const loadingText = ref(false);
const multipleImages = ref([]); // { file: Blob | null, preview: string, base64: string }
const imageAspectRatios = ref({}); // 新增：存储图片宽高比 { [previewUrl]: ratio }

// 共用
const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('success');

// Abort Controllers
let ocrAbortController = null;
let answerAbortController = null;

// --- 持久化逻辑 ---

// 加载状态
const loadState = () => {
  try {
    userNotes.value = localStorage.getItem(STORAGE_KEYS.USER_NOTES) || '';
    recognizedText.value = localStorage.getItem(STORAGE_KEYS.RECOGNIZED_TEXT) || '';
    userInput.value = localStorage.getItem(STORAGE_KEYS.USER_INPUT) || '';
    generatedAnswer.value = localStorage.getItem(STORAGE_KEYS.GENERATED_ANSWER) || '';

    const storedAspectRatios = localStorage.getItem(STORAGE_KEYS.IMAGE_ASPECT_RATIOS);
    imageAspectRatios.value = storedAspectRatios ? JSON.parse(storedAspectRatios) : {}; // 加载宽高比

    const storedOcrImages = localStorage.getItem(STORAGE_KEYS.OCR_IMAGES);
    if (storedOcrImages) {
      const parsedImages = JSON.parse(storedOcrImages);
      // 从 base64 重建图片对象，file 无法恢复
      ocrImages.value = parsedImages.map(imgData => ({
        file: null, // file 不能被序列化存储
        preview: `data:image/png;base64,${imgData.base64}`, // 假设是png，或根据实际情况调整
        base64: imgData.base64
      }));
    } else {
      ocrImages.value = [];
    }


    const storedMultipleImages = localStorage.getItem(STORAGE_KEYS.MULTIPLE_IMAGES);
    if (storedMultipleImages) {
      const parsedImages = JSON.parse(storedMultipleImages);
      // 从 base64 重建图片对象，file 无法恢复
      multipleImages.value = parsedImages.map(imgData => ({
        file: null, // file 不能被序列化存储
        preview: `data:image/png;base64,${imgData.base64}`, // 假设是png，或根据实际情况调整
        base64: imgData.base64
      }));
    } else {
      multipleImages.value = [];
    }

  } catch (error) {
    console.error("Failed to load state from localStorage:", error);
    // 如果解析失败，可以考虑清除损坏的数据
    // Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }
};

// 保存状态 - 只保存必要信息（如图片的base64）
const saveState = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_NOTES, userNotes.value);
    localStorage.setItem(STORAGE_KEYS.RECOGNIZED_TEXT, recognizedText.value);
    localStorage.setItem(STORAGE_KEYS.USER_INPUT, userInput.value);
    localStorage.setItem(STORAGE_KEYS.GENERATED_ANSWER, generatedAnswer.value);

    // 只存储图片的 base64 数据
    const ocrImagesToStore = ocrImages.value.map(img => ({ base64: img.base64 }));
    localStorage.setItem(STORAGE_KEYS.OCR_IMAGES, JSON.stringify(ocrImagesToStore));

    const multipleImagesToStore = multipleImages.value.map(img => ({ base64: img.base64 }));
    localStorage.setItem(STORAGE_KEYS.MULTIPLE_IMAGES, JSON.stringify(multipleImagesToStore));

    localStorage.setItem(STORAGE_KEYS.IMAGE_ASPECT_RATIOS, JSON.stringify(imageAspectRatios.value)); // 保存宽高比

  } catch (error) {
    console.error("Failed to save state to localStorage:", error);
    // 考虑 localstorage 空间不足的情况
    if (error.name === 'QuotaExceededError') {
      showSnackbar('存储空间不足，部分数据可能未保存', 'warning');
    }
  }
};

// 监听变化并保存
watch(userNotes, saveState);
watch(recognizedText, saveState);
watch(userInput, saveState);
watch(generatedAnswer, saveState);
watch(ocrImages, saveState, { deep: true }); // 需要深度监听数组内部变化
watch(multipleImages, saveState, { deep: true }); // 需要深度监听数组内部变化
watch(imageAspectRatios, saveState, { deep: true }); // 监听宽高比变化

// --- 生命周期钩子 ---
onMounted(() => {
  loadState(); // 组件挂载时加载状态
});

// --- 现有方法 ---

// 图片文字识别方法
const recognizeText = async () => {
  if (!ocrImages.value.length) return;

  loadingImage.value = true;
  recognizedText.value = ''; // 清空之前的结果

  // 确保创建新的 AbortController 并清除旧的
  if (ocrAbortController) {
    try { ocrAbortController.abort(); } catch (e) { console.error(e); }
  }
  ocrAbortController = new AbortController();

  try {
    const imageBase64Array = ocrImages.value.map(img => img.base64);

    try {
      // 使用流式API，传入所有图片和 signal
      const result = await openAIService.createChatCompletion({
        text: userNotes.value,
        imageBase64Array: imageBase64Array,
        mode: 'ocr',
        stream: true,
        onStream: (chunk, fullText) => {
          // 只有当处理没有被中止时才更新 UI
          if (!ocrAbortController.signal.aborted) {
            recognizedText.value = fullText;
          }
        },
        signal: ocrAbortController.signal
      });

      // 如果结果包含中止标记，确保显示在 UI 上
      if (result && result.includes('[生成已被用户中止]') && !recognizedText.value.includes('[生成已被用户中止]')) {
        recognizedText.value = result;
      }
    } catch (error) {
      console.error('Error recognizing text:', error);
      // 如果不是中止错误，则显示 Snackbar
      if (error.name !== 'AbortError' && error.message !== '生成已中止') {
        showSnackbar('识别失败: ' + error.message, 'error');
      } else {
        showSnackbar('识别已中止', 'info');
        // 如果中止了，可能需要保留部分结果，或者清空
        // recognizedText.value = ''; // 可选：中止时清空结果
      }
    } finally {
      loadingImage.value = false;
      ocrAbortController = null; // 清理 Controller
    }
  } catch (error) {
    loadingImage.value = false;
    ocrAbortController = null; // 清理 Controller
    console.error('Error processing images:', error);
    if (error.name !== 'AbortError' && error.message !== '生成已中止') {
      showSnackbar('处理图片失败: ' + error.message, 'error');
    }
  }
};

// 新增：中止 OCR 的方法
const abortOcr = () => {
  if (ocrAbortController) {
    try {
      ocrAbortController.abort();
      // 立即更新 UI 状态，让用户知道中止命令已发出
      loadingImage.value = false;

      // 可以选择在中止时添加提示
      if (recognizedText.value) {
        recognizedText.value += '\n\n[识别已被用户中止]';
      } else {
        recognizedText.value = '[识别已被用户中止]';
      }
    } catch (error) {
      console.error('Error aborting OCR:', error);
    }
  }
};


// 图片粘贴处理方法 (保持不变，宽高比在 ImageTextInput 中计算并通过事件传递)
const handleOcrImagePaste = (blob) => {
  if (!blob) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result.split(',')[1];
    ocrImages.value.push({
      file: blob,
      preview: e.target.result,
      base64: base64
    });
    // saveState(); // watch 会自动触发保存
  };
  reader.readAsDataURL(blob);
};

const handleAnswerImagePaste = (blob) => {
  if (!blob) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result.split(',')[1];
    multipleImages.value.push({
      file: blob,
      preview: e.target.result,
      base64: base64
    });
    // saveState(); // watch 会自动触发保存
  };
  reader.readAsDataURL(blob);
};

// 新增：处理 ImageTextInput 组件添加图片事件
const handleImageAdded = ({ preview, aspectRatio }) => {
  if (preview && aspectRatio) {
    imageAspectRatios.value = {
      ...imageAspectRatios.value,
      [preview]: aspectRatio
    };
    // saveState(); // watch 会自动触发保存
  }
};

// 新增：处理 ImageTextInput 组件移除图片事件
const handleImageRemoved = (previewUrl) => {
  if (previewUrl && imageAspectRatios.value[previewUrl]) {
    const newRatios = { ...imageAspectRatios.value };
    delete newRatios[previewUrl];
    imageAspectRatios.value = newRatios;
    // saveState(); // watch 会自动触发保存
  }
};

// 新增：处理 ImageTextInput 组件清空图片事件
const handleImagesCleared = (type) => {
  const imagesToClear = type === 'ocr' ? ocrImages.value : multipleImages.value;
  const previewsToClear = imagesToClear.map(img => img.preview);
  const newRatios = { ...imageAspectRatios.value };
  let changed = false;
  previewsToClear.forEach(preview => {
    if (newRatios[preview]) {
      delete newRatios[preview];
      changed = true;
    }
  });
  if (changed) {
    imageAspectRatios.value = newRatios;
    // saveState(); // watch 会自动触发保存
  }
};


// 生成解答方法
const generateAnswer = async () => {
  if (!userInput.value && multipleImages.value.length === 0) return;

  loadingText.value = true;
  generatedAnswer.value = ''; // 清空之前的结果

  // 确保创建新的 AbortController 并清除旧的
  if (answerAbortController) {
    try { answerAbortController.abort(); } catch (e) { console.error(e); }
  }
  answerAbortController = new AbortController();

  try {
    const imageBase64Array = multipleImages.value.map(img => img.base64);

    const result = await openAIService.createChatCompletion({
      text: userInput.value,
      imageBase64Array: imageBase64Array,
      mode: 'answer',
      stream: true,
      onStream: (chunk, fullText) => {
        // 只有当处理没有被中止时才更新 UI
        if (!answerAbortController.signal.aborted) {
          generatedAnswer.value = fullText;
        }
      },
      signal: answerAbortController.signal
    });

    // 如果结果包含中止标记，确保显示在 UI 上
    if (result && result.includes('[生成已被用户中止]') && !generatedAnswer.value.includes('[生成已被用户中止]')) {
      generatedAnswer.value = result;
    }
  } catch (error) {
    console.error('Error generating answer:', error);
    // 如果不是中止错误，则显示 Snackbar
    if (error.name !== 'AbortError' && error.message !== '生成已中止') {
      showSnackbar('生成解答失败: ' + error.message, 'error');
    } else {
      // generatedAnswer.value = ''; // 可选：中止时清空结果
    }
  } finally {
    loadingText.value = false;
    answerAbortController = null; // 清理 Controller
  }
};

// 新增：中止解答生成的方法
const abortAnswer = () => {
  if (answerAbortController) {
    try {
      answerAbortController.abort();
      // 立即更新 UI 状态，让用户知道中止命令已发出
      loadingText.value = false;

      // 可以选择在中止时添加提示
      if (generatedAnswer.value) {
        generatedAnswer.value += '\n\n[生成已被用户中止]';
      } else {
        generatedAnswer.value = '[生成已被用户中止]';
      }
    } catch (error) {
      console.error('Error aborting answer generation:', error);
    }
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

  // 所有的英文分号改为中文分号
  text = text.replace(/;/g, '；');

  // 所有的英文括号改为中文括号，但括号中有一个数字的除外
  text = text.replace(/\(([^0-9]|[0-9]{2,}|$)/g, '（$1');
  text = text.replace(/([^0-9]|^|[0-9]{2,})\)/g, '$1）');

  // 所有的中文括号中间如果没有内容，则应当插入一个空格
  text = text.replace(/（）/g, '（ ）');

  // 所有的英文逗号改为中文逗号
  text = text.replace(/,/g, '，');

  // 所有的英文问号改为中文问号
  text = text.replace(/\?/g, '？');

  // 所有的英文感叹号改为中文感叹号
  text = text.replace(/!/g, '！');

  // 形如(1)(2)这种的题号后面如果没有点或空格，则应当加上一个点和一个空格
  text = text.replace(/\((\d+)\)(?![\s\.\，\,\;\；\:\：])/g, '($1). ');

  // 形如1.2.这种的题号后面如果没有空格，则应当加上一个空格
  text = text.replace(/(\d+)\.(?![\s])/g, '$1. ');

  // 形如A.B.这种的题号后面如果没有空格，则应当加上一个空格
  text = text.replace(/([A-Z])\.(?![\s])/g, '$1. ');

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
