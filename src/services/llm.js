import OpenAI from 'openai';

const visionModelSystemPrompt = `用户将向你提供一张图片，其中包含一道小学或初中的语文题目，请你完整识别它并用规整的格式进行输出。如果题目中包含难以用文本表示的元素，则尽可能找到替代的表示方式。
输出不要使用任何markdown语法，遇到表格则应当将其转换为含义相同的填空。
填空题可使用括号（ ）或下划线______来表示。如果用括号表示，则括号中间应当插入一个空格。
如果是根据拼音写词语题，则每个词语仅用一个括号：shì lì （ ）
不要对题目进行任何解释和解答。
不要识别题目中已经填入的手写答案。仅识别题目。
仅识别图片中间完整的题目，如果图片还包含了其他题目的部分信息，不要输出这些题目的内容。
如果图片模糊，则可根据上下文联想识别，否则应当完全忠实于原文内容，不要擅自改动。
忽略图片中的所有分值信息（如果有）。
忽略题目的大题号（如一、二），但应当保留小题号（如1. (1). ）
重要：输出的所有标点符号都应当使用中文标点符号，不要使用英文标点符号。
如果用户在提供图片时附加了消息，那么你应当忠实遵守用户的指令。`;

const textModelSystemPrompt = `你是一位语文老师。根据用户提供给你的题目，编写答案和解析。
如果题目中有用“1.”“(1).”这样标记的小题，那么答案需要按照小题进行组织，且样式和题目保持一致。
重要：如果题目有多处答案，则答案之间用中文分号（；）分隔。答案不要带填空的括号。一个小题的最后一个答案不要加句号或分号。
涉及创造性发挥的题目，答案不唯一的，应当在答案后面标注“（答案不唯一）”。
涉及看拼音写词语的题目，应当解释每个词语的意思。
给出答案后，使用一段话来解析你给出的答案，通常在开头介绍本题考查什么知识点，然后根据题目解析答案，解析需要具备一定的篇幅。不要使用markdown语法，不要通过数字分点，逻辑上的分点可通过换行来表示。在解析的最后加上答案总结，例如“故本题答案为……”等。
重要：输出的所有标点符号都应当使用中文标点符号，不要使用英文标点符号。`;

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
            baseUrl: 'https://api.eslzzyl.eu.org/v1',
            apiKey: '',
            model: 'gemini-2.5-flash-preview-04-17',
            temperature: 0.7,
            systemPrompt: textModelSystemPrompt,
        };

        const savedConfig = localStorage.getItem('textConfig');
        return savedConfig ? JSON.parse(savedConfig) : defaultConfig;
    }

    getVisionConfig() {
        const defaultConfig = {
            baseUrl: 'https://api.eslzzyl.eu.org/v1',
            apiKey: '',
            model: 'gemini-2.0-flash',
            temperature: 0.7,
            systemPrompt: visionModelSystemPrompt,
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
