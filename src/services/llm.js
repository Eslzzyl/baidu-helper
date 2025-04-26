import OpenAI from 'openai';

class OpenAIService {
    constructor() {
        this.textClient = null;
        this.visionClient = null;
        this.initClients();
    }

    initClients() {
        const textConfig = this.getTextConfig();
        const visionConfig = this.getVisionConfig();

        // 初始化文本模型客户端
        this.textClient = new OpenAI({
            apiKey: textConfig.apiKey || 'default-key',
            baseURL: textConfig.baseUrl || 'https://api.openai.com/v1',
            dangerouslyAllowBrowser: true,
        });

        // 初始化视觉模型客户端
        this.visionClient = new OpenAI({
            apiKey: visionConfig.apiKey || 'default-key',
            baseURL: visionConfig.baseUrl || 'https://api.openai.com/v1',
            dangerouslyAllowBrowser: true,
        });
    }

    updateTextClient(config) {
        this.textClient = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseUrl,
            dangerouslyAllowBrowser: true,
        });
        localStorage.setItem('textConfig', JSON.stringify(config));
    }

    updateVisionClient(config) {
        this.visionClient = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseUrl,
            dangerouslyAllowBrowser: true,
        });
        localStorage.setItem('visionConfig', JSON.stringify(config));
    }

    getTextConfig() {
        const defaultConfig = {
            baseUrl: 'https://api.openai.com/v1',
            apiKey: '',
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
            systemPrompt: '你是一个有用的助手，请回答用户的问题。'
        };

        const savedConfig = localStorage.getItem('textConfig');
        return savedConfig ? JSON.parse(savedConfig) : defaultConfig;
    }

    getVisionConfig() {
        const defaultConfig = {
            baseUrl: 'https://api.openai.com/v1',
            apiKey: '',
            model: 'gpt-4-vision-preview',
            temperature: 0.7,
            systemPrompt: '请识别并提取图片中的所有文字，保持原始格式。'
        };

        const savedConfig = localStorage.getItem('visionConfig');
        return savedConfig ? JSON.parse(savedConfig) : defaultConfig;
    }

    /**
     * 通用的聊天完成函数，可处理纯文本、单图片或多图片情况
     * @param {Object} options - 配置选项
     * @param {string} options.prompt - 文本提示
     * @param {string[]} options.imageBase64Array - 图片Base64数组
     * @param {string} options.userNotes - 用户注释（仅用于单图片模式）
     * @param {boolean} options.useTextModel - 是否使用文本模型而非视觉模型
     * @returns {Promise<string>} - 返回AI回复的内容
     */
    async createChatCompletion({ prompt = '', imageBase64Array = [], userNotes = '', useTextModel = false }) {
        // 确定使用哪个客户端和配置
        const isVisionRequest = imageBase64Array.length > 0;
        const client = useTextModel ? this.textClient : (isVisionRequest ? this.visionClient : this.textClient);
        const config = useTextModel ? this.getTextConfig() : (isVisionRequest ? this.getVisionConfig() : this.getTextConfig());

        try {
            // 准备消息格式
            const messages = [
                {
                    role: 'system',
                    content: config.systemPrompt
                }
            ];

            // 根据不同场景构建用户消息内容
            if (isVisionRequest) {
                // 视觉请求（单图片或多图片）
                const userContent = [];

                // 添加文本内容（如果有）
                if ((prompt || userNotes) && (prompt + userNotes).trim()) {
                    userContent.push({
                        type: 'text',
                        text: userNotes || prompt
                    });
                }

                // 添加图片
                for (const imageBase64 of imageBase64Array) {
                    userContent.push({
                        type: 'image_url',
                        image_url: {
                            url: `data:image/jpeg;base64,${imageBase64}`
                        }
                    });
                }

                messages.push({
                    role: 'user',
                    content: userContent
                });
            } else {
                // 纯文本请求
                messages.push({
                    role: 'user',
                    content: prompt
                });
            }

            // 发送请求
            const response = await client.chat.completions.create({
                model: config.model,
                temperature: parseFloat(config.temperature),
                messages: messages
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('Error in chat completion:', error);
            throw error;
        }
    }

    // 以下为保持向后兼容的包装函数
    async generateTextAnswer(prompt) {
        return this.createChatCompletion({
            prompt,
            useTextModel: true
        });
    }

    async extractTextFromImage(imageBase64, userNotes = '') {
        return this.createChatCompletion({
            imageBase64Array: [imageBase64],
            userNotes
        });
    }

    async generateTextWithImages(prompt, imageBase64Array) {
        return this.createChatCompletion({
            prompt,
            imageBase64Array
        });
    }
}

export default new OpenAIService();
