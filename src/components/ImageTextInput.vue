<template>
    <div>
        <v-textarea clearable v-model="localTextInput" :label="label" :placeholder="placeholder" :rows="rows" auto-grow
            hide-details outlined @input="updateText" ref="textareaRef"></v-textarea>

        <!-- 多图片上传和展示区域 -->
        <div class="mt-3 mb-2">
            <div class="d-flex align-center mb-2">
                <v-spacer></v-spacer>
                <span class="caption" v-if="localImages.length">已添加 {{ localImages.length }} 张图片</span>
            </div>

            <v-card outlined class="image-paste-area pa-3 mb-2 text-center position-relative"
                @paste.stop="handlePasteOnArea">
                <v-icon small class="clear-all-btn" @click.stop="clearAllImages" :disabled="!localImages.length"
                    title="清除所有图片" v-if="localImages.length">
                    mdi-close-circle
                </v-icon>

                <v-icon v-if="!localImages.length" size="24" class="mb-1">mdi-image-multiple</v-icon>
                <div v-if="!localImages.length">在此处粘贴图片</div>

                <div v-if="localImages.length" class="image-preview-container">
                    <div v-for="(img, index) in localImages" :key="index" class="image-preview-item">
                        <v-img :src="img.preview" height="80" :width="calculateImageWidth(img)" contain
                            class="rounded ma-1 preview-image" @click="previewImage(img.preview)"></v-img>
                        <v-icon small class="image-delete-icon" @click.stop="removeImage(index)" title="删除图片">
                            mdi-close-circle
                        </v-icon>
                    </div>
                </div>
            </v-card>
        </div>

        <!-- 图片预览对话框 -->
        <v-dialog v-model="showImagePreview" max-width="90vw">
            <v-img :src="previewImageSrc" max-height="90vh" contain></v-img>
        </v-dialog>
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
const textareaRef = ref(null);
const showImagePreview = ref(false);
const previewImageSrc = ref('');
const imageAspectRatios = ref({}); // 存储图片宽高比

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

const handlePasteOnArea = (event) => {
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

// 添加计算图片宽度的方法
const calculateImageWidth = (img) => {
    if (imageAspectRatios.value[img.preview]) {
        // 保持图片原始宽高比，固定高度为80px
        return 80 * imageAspectRatios.value[img.preview];
    }
    return 'auto'; // 在比例还未计算出来时使用自动宽度
};

// 修改图片添加方法，增加宽高比计算
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

                // 计算并存储图片宽高比
                const img = new Image();
                img.onload = () => {
                    const aspectRatio = img.width / img.height;
                    imageAspectRatios.value = {
                        ...imageAspectRatios.value,
                        [base64Data]: aspectRatio
                    };
                };
                img.src = base64Data;

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

const clearAllImages = () => {
    localImages.value = [];
};

// 添加删除单个图片的方法
const removeImage = (index) => {
    const updatedImages = [...localImages.value];
    updatedImages.splice(index, 1);
    localImages.value = updatedImages;
};

// 新增图片预览方法
const previewImage = (imageSrc) => {
    previewImageSrc.value = imageSrc;
    showImagePreview.value = true;
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
.image-paste-area {
    min-height: 60px;
    border: 2px dashed #ccc;
    transition: all 0.3s;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    position: relative;
}

.clear-all-btn {
    position: absolute;
    top: 5px;
    right: 5px;
    z-index: 2;
}

.image-preview-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: center;
    width: 100%;
    overflow-x: auto;
}

.image-preview-item {
    margin: 4px;
    height: 80px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    position: relative;
    overflow: visible;
    /* 确保图标可以溢出显示 */
}

.image-delete-icon {
    position: absolute;
    top: -5px;
    right: -5px;
    z-index: 1;
    color: #f44336;
    opacity: 0.8;
    font-size: 16px;
    background-color: #ffffff;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
}

.image-delete-icon:hover {
    opacity: 1;
    transform: scale(1.1);
}

.preview-image {
    object-fit: contain;
    height: 100%;
}

.preview-image:hover {
    transform: scale(1.05);
    transition: transform 0.2s;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
}

.position-relative {
    position: relative;
}
</style>
