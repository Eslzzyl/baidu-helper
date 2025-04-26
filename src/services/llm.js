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

    async generateTextAnswer(prompt) {
        const config = this.getTextConfig();

        try {
            const response = await this.textClient.chat.completions.create({
                model: config.model,
                temperature: parseFloat(config.temperature),
                messages: [
                    {
                        role: 'system',
                        content: config.systemPrompt
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('Error generating text answer:', error);
            throw error;
        }
    }

    async extractTextFromImage(imageBase64, userNotes = '') {
        const config = this.getVisionConfig();

        try {
            const messages = [
                {
                    role: 'system',
                    content: config.systemPrompt
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: userNotes
                                ? `${userNotes}`
                                : ''
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`
                            }
                        }
                    ]
                }
            ];

            const response = await this.visionClient.chat.completions.create({
                model: config.model,
                temperature: parseFloat(config.temperature),
                messages: messages
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('Error extracting text from image:', error);
            throw error;
        }
    }

    async generateTextWithImages(prompt, imageBase64Array) {
        const config = this.getVisionConfig();
        
        try {
            const messages = [
                {
                    role: 'system',
                    content: config.systemPrompt
                },
                {
                    role: 'user',
                    content: []
                }
            ];
            
            // 添加用户文本（如果有）
            if (prompt && prompt.trim()) {
                messages[1].content.push({
                    type: 'text',
                    text: prompt
                });
            }
            
            // 添加所有图片
            for (const imageBase64 of imageBase64Array) {
                messages[1].content.push({
                    type: 'image_url',
                    image_url: {
                        url: `data:image/jpeg;base64,${imageBase64}`
                    }
                });
            }
            
            const response = await this.visionClient.chat.completions.create({
                model: config.model,
                temperature: parseFloat(config.temperature),
                messages: messages
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('Error generating answer with images:', error);
            throw error;
        }
    }
}

export default new OpenAIService();
