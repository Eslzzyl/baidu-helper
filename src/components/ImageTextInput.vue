<template>
    <div>
        <v-textarea v-model="localTextInput" :label="label" :placeholder="placeholder" :rows="rows" auto-grow
            hide-details outlined @input="updateText" ref="textareaRef"></v-textarea>

        <!-- 多图片上传和展示区域 -->
        <div class="mt-3 mb-2">
            <div class="d-flex align-center mb-2">
                <span class="text-subtitle-2 mr-2">添加图片</span>
                <v-btn icon small color="primary" @click="triggerImageUpload" title="添加图片">
                    <v-icon>mdi-image-plus</v-icon>
                </v-btn>
                <input type="file" ref="imageInput" accept="image/*" multiple style="display: none"
                    @change="handleImageInputChange" />
                <v-btn icon small color="primary" class="ml-1" @click="clearAllImages" :disabled="!localImages.length"
                    title="清除所有图片">
                    <v-icon>mdi-image-off</v-icon>
                </v-btn>
                <v-spacer></v-spacer>
                <span class="caption" v-if="localImages.length">已添加 {{ localImages.length }} 张图片</span>
            </div>

            <v-card outlined class="image-drop-area pa-3 mb-2 text-center"
                :class="{ 'paste-active': isImageDropActive }" @dragover.prevent="isImageDropActive = true"
                @dragleave.prevent="isImageDropActive = false" @drop.prevent="handleMultiImageDrop"
                @paste.stop="handlePasteOnDropArea" @click="triggerImageUpload" tabindex="0">
                <v-icon v-if="!localImages.length" size="24" class="mb-1">mdi-image-multiple</v-icon>
                <div v-if="!localImages.length">点击添加或拖放图片到此处</div>

                <div v-if="localImages.length" class="image-preview-container">
                    <div v-for="(img, index) in localImages" :key="index" class="image-preview-item">
                        <v-img :src="img.preview" height="100" width="100" contain class="rounded ma-1 preview-image"
                            :aspect-ratio="1"></v-img>
                        <v-btn icon x-small color="error" class="image-delete-btn" @click.stop="removeImage(index)"
                            title="删除图片">
                            <v-icon x-small>mdi-close</v-icon>
                        </v-btn>
                    </div>
                </div>
            </v-card>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits, onMounted, nextTick } from 'vue';

const props = defineProps({
    textInput: {
        type: String,
        default: ''
    },
    images: {
        type: Array,
        default: () => []
    },
    label: {
        type: String,
        default: '请输入文本'
    },
    placeholder: {
        type: String,
        default: '输入文本内容'
    },
    rows: {
        type: Number,
        default: 4
    }
});

const emit = defineEmits(['update:textInput', 'update:images', 'paste-image']);

const localTextInput = ref(props.textInput);
const localImages = ref([...props.images]);
const isImageDropActive = ref(false);
const imageInput = ref(null);
const textareaRef = ref(null);

// 确保组件内部状态与外部传入的值保持同步
watch(() => props.textInput, (newVal) => {
    localTextInput.value = newVal;
});

watch(() => props.images, (newVal) => {
    localImages.value = [...newVal];
});

// 监听本地状态变化，更新外部值
watch(localTextInput, (newVal) => {
    emit('update:textInput', newVal);
});

// 修改这个 watch 函数，使用防递归标记
let isUpdatingImages = false;
watch(localImages, (newVal) => {
    if (!isUpdatingImages) {
        isUpdatingImages = true;
        emit('update:images', JSON.parse(JSON.stringify(newVal)));
        nextTick(() => {
            isUpdatingImages = false;
        });
    }
}, { deep: true });

// 方法
const updateText = () => {
    emit('update:textInput', localTextInput.value);
};

const triggerImageUpload = () => {
    imageInput.value.click();
};

const handleImageInputChange = (event) => {
    if (!event.target.files || event.target.files.length === 0) return;

    const files = Array.from(event.target.files);
    addMultipleImages(files);

    // 重置input，确保可以重复选择相同的文件
    event.target.value = '';
};

const handleMultiImageDrop = (event) => {
    isImageDropActive.value = false;

    if (!event.dataTransfer.files || event.dataTransfer.files.length === 0) return;

    const files = Array.from(event.dataTransfer.files).filter(file =>
        file.type.startsWith('image/')
    );

    if (files.length > 0) {
        addMultipleImages(files);
    }
};

const handlePasteOnDropArea = (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    const imageFiles = [];

    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
                imageFiles.push(blob);
            }
        }
    }

    if (imageFiles.length > 0) {
        addMultipleImages(imageFiles);
        event.preventDefault();
    }
};

// 修改图片添加方法，使用深拷贝避免引用问题
const addMultipleImages = (files) => {
    const newImages = [];

    for (const file of files) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Data = e.target.result;
                newImages.push({
                    file: file,
                    preview: base64Data,
                    base64: base64Data.split(',')[1]
                });

                // 当所有图片都处理完后，一次性更新 localImages
                if (newImages.length === files.length) {
                    nextTick(() => {
                        const updatedImages = [...localImages.value, ...newImages];
                        localImages.value = updatedImages;
                    });
                }
            };
            reader.readAsDataURL(file);
        }
    }
};

// 为确保一致性，也修改 removeImage 和 clearAllImages 方法
const removeImage = (index) => {
    const updatedImages = [...localImages.value];
    updatedImages.splice(index, 1);
    localImages.value = updatedImages;
};

const clearAllImages = () => {
    localImages.value = [];
};

onMounted(() => {
    // 为textarea添加粘贴事件处理
    if (textareaRef.value) {
        textareaRef.value.$el.addEventListener('paste', (event) => {
            const items = event.clipboardData?.items;
            if (!items) return;

            let hasImage = false;
            const imageFiles = [];

            // 检查是否包含图片
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        hasImage = true;
                        imageFiles.push(blob);
                    }
                }
            }

            if (hasImage) {
                // 防止图片被直接粘贴到文本框中
                event.preventDefault();

                // 直接添加图片到本组件
                addMultipleImages(imageFiles);

                // 通知父组件处理图片粘贴事件，使用深拷贝
                if (imageFiles.length > 0) {
                    emit('paste-image', imageFiles[0]);
                }
            }
        });
    }
});
</script>

<style scoped>
.image-drop-area {
    min-height: 60px;
    cursor: pointer;
    border: 2px dashed #ccc;
    transition: all 0.3s;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.paste-active {
    border-color: #1976d2;
    background-color: rgba(25, 118, 210, 0.05);
}

.image-preview-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: center;
    width: 100%;
}

.image-preview-item {
    position: relative;
    margin: 8px;
    width: 100px;
    height: 100px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.preview-image {
    object-fit: contain;
    width: 100%;
    height: 100%;
}

.image-delete-btn {
    position: absolute;
    top: -8px;
    right: -8px;
    background-color: rgba(255, 255, 255, 0.8) !important;
}
</style>
