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
                :class="{ 'drag-over': isDragOver, 'is-focused': isFocused }" @paste.stop="handlePasteOnArea"
                @dragover.prevent="handleDragOver" @dragleave.prevent="handleDragLeave" @drop.prevent="handleDrop"
                @focus="handleFocus" @blur="handleBlur" tabindex="0">
                <v-icon small class="clear-all-btn" @click.stop="clearAllImages" :disabled="!localImages.length"
                    title="清除所有图片" v-if="localImages.length">
                    mdi-close-circle
                </v-icon>

                <v-icon v-if="!localImages.length" size="24" class="mb-1">mdi-image-multiple</v-icon>
                <div v-if="!localImages.length">在此处粘贴或拖放图片</div>

                <div v-if="localImages.length" class="image-preview-container">
                    <div v-for="(img, index) in localImages" :key="index" class="image-preview-item" draggable="true"
                        @dragstart="handleDragStart($event, img, index)">
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
            <v-img :src="previewImageSrc" max-height="90vh" contain @click="closeImagePreview"></v-img>
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
    },
    // 添加一个唯一ID用于区分不同实例
    instanceId: {
        type: String,
        default: () => `image-input-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
});

const emit = defineEmits(['update:textInput', 'update:images', 'paste-image']);

const localTextInput = ref(props.textInput);
const localImages = ref([...props.images]);
const textareaRef = ref(null);
const showImagePreview = ref(false);
const previewImageSrc = ref('');
const imageAspectRatios = ref({}); // 存储图片宽高比
const isDragOver = ref(false); // 用于标记是否有元素正在拖放到此区域
const isFocused = ref(false); // 标记粘贴区域是否被聚焦

// 拖放操作相关数据
const draggedImageIndex = ref(null);
const draggedImage = ref(null);
const dragSourceInstanceId = ref(null);

// 确保组件内部状态与外部传入的值保持同步
watch(() => props.textInput, (newVal) => {
    localTextInput.value = newVal;
});

watch(() => props.images, (newVal) => {
    localImages.value = [...newVal];
});

watch(localTextInput, (newVal) => {
    emit('update:textInput', newVal);
});

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

const updateText = () => {
    emit('update:textInput', localTextInput.value);
};

// 处理粘贴区域的聚焦事件
const handleFocus = () => {
    isFocused.value = true;
};

// 处理粘贴区域的失焦事件
const handleBlur = () => {
    isFocused.value = false;
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

const calculateImageWidth = (img) => {
    if (imageAspectRatios.value[img.preview]) {
        // 保持图片原始宽高比，固定高度为80px
        return 80 * imageAspectRatios.value[img.preview];
    }
    return 'auto'; // 在比例还未计算出来时使用自动宽度
};

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

// 添加处理从文件系统拖拽的图片方法
const handleFileDrop = (files) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length > 0) {
        addMultipleImages(imageFiles);
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

// 关闭图片预览
const closeImagePreview = () => {
    showImagePreview.value = false;
};

// 拖放相关方法
const handleDragOver = (event) => {
    event.dataTransfer.dropEffect = 'copy';
    isDragOver.value = true;
};

const handleDragLeave = () => {
    isDragOver.value = false;
};

const handleDragStart = (event, img, index) => {
    // 存储被拖动图片的信息
    draggedImage.value = img;
    draggedImageIndex.value = index;
    dragSourceInstanceId.value = props.instanceId;

    // 设置拖拽的数据
    event.dataTransfer.setData('application/json', JSON.stringify({
        instanceId: props.instanceId,
        imageIndex: index,
        imageData: img
    }));

    // 设置拖拽的效果
    event.dataTransfer.effectAllowed = 'copyMove';

    // 设置拖拽时的缩略图
    if (img.preview) {
        const dragImage = new Image();
        dragImage.src = img.preview;
        event.dataTransfer.setDragImage(dragImage, 20, 20);
    }
};

const handleDrop = (event) => {
    isDragOver.value = false;

    // 尝试从拖放数据中获取图片
    try {
        // 1. 检查是否是从其他ImageTextInput组件拖拽的图片
        const jsonData = event.dataTransfer.getData('application/json');

        if (jsonData) {
            const dragData = JSON.parse(jsonData);

            // 如果是从另一个实例拖拽的
            if (dragData.instanceId && dragData.instanceId !== props.instanceId) {
                // 添加从其他组件拖拽的图片
                if (dragData.imageData) {
                    localImages.value = [...localImages.value, dragData.imageData];

                    // 通过自定义事件通知原始组件删除被拖拽的图片
                    const dragEvent = new CustomEvent('image-drag-received', {
                        detail: {
                            sourceInstanceId: dragData.instanceId,
                            imageIndex: dragData.imageIndex
                        }
                    });
                    window.dispatchEvent(dragEvent);
                }
                return;
            }
        }

        // 2. 检查是否是从文件系统拖拽的文件
        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            handleFileDrop(event.dataTransfer.files);
            return;
        }

    } catch (error) {
        console.error('Error handling drop:', error);
    }
};

onMounted(() => {
    // 监听图片拖拽完成事件，从原始组件中移除已被拖拽的图片
    const handleImageDragReceived = (event) => {
        const { sourceInstanceId, imageIndex } = event.detail;

        // 如果当前组件是拖拽的源头，则移除被拖走的图片
        if (sourceInstanceId === props.instanceId) {
            const updatedImages = [...localImages.value];
            updatedImages.splice(imageIndex, 1);
            localImages.value = updatedImages;
        }
    };

    window.addEventListener('image-drag-received', handleImageDragReceived);

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

    return () => {
        window.removeEventListener('image-drag-received', handleImageDragReceived);
    };
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
    outline: none;
    /* 移除默认的焦点样式 */
}

.image-paste-area.drag-over {
    border-color: #1976d2;
    background-color: rgba(25, 118, 210, 0.05);
    box-shadow: 0 0 8px rgba(25, 118, 210, 0.3);
}

/* 新增: 聚焦时的样式 */
.image-paste-area.is-focused {
    border-color: #1976d2;
    border-style: solid;
    box-shadow: 0 0 6px rgba(25, 118, 210, 0.4);
    background-color: rgba(25, 118, 210, 0.02);
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
    cursor: grab;
    position: relative;
    overflow: visible;
    /* 确保图标可以溢出显示 */
}

.image-preview-item:active {
    cursor: grabbing;
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

.close-preview-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
    z-index: 10;
}
</style>
