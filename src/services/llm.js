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

    async createChatCompletion({ text = '', imageBase64Array = [], mode = 'answer', stream = false, onStream = null }) {
        // 根据mode决定使用哪个客户端和配置
        const client = mode === 'ocr' ? this.visionClient : this.textClient;
        const config = mode === 'ocr' ? this.getVisionConfig() : this.getTextConfig();
        const hasImages = imageBase64Array.length > 0;

        try {
            // 准备消息格式
            const messages = [
                {
                    role: 'system',
                    content: config.systemPrompt
                }
            ];

            // 构建单个用户消息，包含所有图片和文本
            const userContent = [];

            // 添加图片内容（如果有）
            if (hasImages) {
                for (const imageBase64 of imageBase64Array) {
                    userContent.push({
                        type: 'image_url',
                        image_url: {
                            url: `data:image/jpeg;base64,${imageBase64}`
                        }
                    });
                }
            }

            // 添加文本内容（如果有）
            if (text && text.trim()) {
                userContent.push({
                    type: 'text',
                    text: text
                });
            }

            // 只有当有内容时才添加用户消息
            if (userContent.length > 0) {
                messages.push({
                    role: 'user',
                    content: userContent
                });
            }

            // 发送请求
            const requestOptions = {
                model: config.model,
                temperature: parseFloat(config.temperature),
                messages: messages,
                stream: stream
            };

            // 如果是流式输出
            if (stream && onStream) {
                let fullResponse = '';
                const stream = await client.chat.completions.create({
                    ...requestOptions,
                    stream: true,
                });

                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        fullResponse += content;
                        onStream(content, fullResponse);
                    }
                }

                return fullResponse;
            } else {
                const response = await client.chat.completions.create(requestOptions);
                return response.choices[0].message.content;
            }
        } catch (error) {
            console.error('Error in chat completion:', error);
            throw error;
        }
    }
}

export default new OpenAIService();
