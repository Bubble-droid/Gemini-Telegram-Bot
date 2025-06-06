// src/api/GeminiApi.js

import { GoogleGenAI, Type, FunctionCallingConfigMode } from '@google/genai';
import getConfig from '../env';
import kvRead from '../kvManager/kvRead';

const tools = [
	{
		functionDeclarations: [
			{
				name: 'getDocument',
				description: '始终使用此工具，根据用户的提问和文档路径列表，查询相关的在线文档，获取解答依据',
				parameters: {
					type: Type.OBJECT,
					properties: {
						docsPath: {
							type: Type.ARRAY,
							description:
								'需要查询的文档路径列表，一个数组，例如: ["MetaCubeX/Meta-Docs/refs/heads/main/docs/api/index.md", "SagerNet/sing-box/refs/heads/dev-next/docs/configuration/experimental/clash-api.md", ...]',
							items: {
								type: Type.STRING,
								description: '单个文档的路径',
							},
						},
					},
					required: ['docsPath'],
				},
			},
		],
	},
];

/**
 * 执行工具的映射对象
 * 键是工具名称 (functionDeclarations 中的 name)，值是对应的执行函数
 */
const toolExecutors = {
	/**
	 * 执行 getDocument 工具
	 * @param {object} args  工具调用时传递的参数对象，例如 { docsPath: ['path1', 'path2'] }
	 * @returns {Promise<object>}  工具执行结果对象，包含 content 字段
	 */
	getDocument: async (args) => {
		console.log('执行工具: getDocument, 参数:', args);
		const docUrlPrefix = 'https://raw.githubusercontent.com';
		let docstxt = '';
		if (args && args.docsPath && Array.isArray(args.docsPath)) {
			for (const doc of args.docsPath) {
				if (typeof doc === 'string') {
					const completeDocUrl = `${docUrlPrefix}/${doc}`;
					const docName = doc.split('/').slice(-2);
					try {
						console.log(`尝试获取文档: ${completeDocUrl}`);
						const response = await fetch(completeDocUrl, {
							method: 'GET',
						});

						if (!response.ok) {
							console.warn(`获取文档失败，状态码: ${response.status}, URL: ${completeDocUrl}`);
							docstxt += `#${doc}\n\n错误：无法获取文档内容 (状态码: ${response.status})\n`; // 添加错误提示到结果中
							continue; // 继续处理下一个文档
						}

						const docContent = await response.text();
						docstxt += `<document_${docName.join(
							'_'
						)}>\n<path>${doc}</path>\n<content>\n${docContent}\n</content>\n</document_${docName.join('_')}>\n\n`; // 文档内容之间用空行隔开
					} catch (fetchError) {
						console.error(`获取文档时发生网络错误: ${fetchError}, URL: ${completeDocUrl}`);
						docstxt += `<document_${docName.join(
							'_'
						)}>\n<path>${doc}</path>\n<content>\n错误：获取文档时发生网络错误\n</content>\n</document_${docName.join('_')}>\n\n`; // 添加错误提示到结果中
					}
				}
			}
		} else {
			console.warn('getDocument 工具调用参数无效:', args);
			docstxt = '错误：getDocument 工具调用参数无效，未提供文档路径。';
		}
		console.log('getDocument 工具执行完毕，结果长度:', docstxt.length);
		// Gemini SDK 的 functionResponse 需要一个 response 对象，通常包含结果
		// 格式应为 { output: '...' }
		return { output: docstxt.trim() }; // 返回包含结果的对象，使用 output 字段
	},
};

/**
 * 封装 Gemini API 调用逻辑
 */
class GeminiApi {
	/**
	 * @param {object} env - Cloudflare Worker 的环境变量对象
	 */
	constructor(env) {
		const config = getConfig(env);
		this.genai = new GoogleGenAI({ apiKey: config.apiKey });
		this.model = config.modelName;
		this.botConfigKv = config.botConfigKv;
		this.systemPromptKey = 'system_prompt';
		this.env = env;
		this.tools = tools;
		this.toolExecutors = toolExecutors;
		this.MAX_TOOL_CALL_ROUNDS = 6; // 最大工具调用轮次
	}

	/**
	 * 调用 Gemini API 进行对话或生成内容
	 * @param {Array<object>} contents - 对话历史记录 (格式取决于 Gemini SDK)
	 * @returns {Promise<object|null>} Gemini API 的响应对象，包含文本。如果发生错误则返回 null。
	 */
	/**
	 * 调用 Gemini API 进行对话或生成内容，支持工具调用
	 * @param {Array<object>} initialContents - 初始对话历史记录 (格式取决于 Gemini SDK)
	 * @returns {Promise<object|null>} Gemini API 的最终响应对象，包含文本或工具调用结果。如果发生错误则返回 null。
	 */
	async generateContent(initialContents) {
		if (!initialContents || !Array.isArray(initialContents)) return null;

		const ai = this.genai;
		const modelName = this.model;
		const tools = this.tools;
		const toolExecutors = this.toolExecutors;
		const kvNamespace = this.botConfigKv;
		const key = this.systemPromptKey;
		const systemPrompt = (await kvRead(kvNamespace, key)) || 'You are a helpful assistant.';

		console.log(`systemPrompt: ${systemPrompt.slice(0, 200)}...`);

		// 复制初始内容，以便在工具调用时添加新消息
		let contents = [...initialContents];

		// 配置 API 请求
		const baseConfig = {
			maxOutputTokens: 65536,
			temperature: 0.3,
			thinkingConfig: {
				thinkingBudget: 24576,
			},
			tools: tools,
			toolConfig: {
				functionCallingConfig: {
					mode: FunctionCallingConfigMode.AUTO,
				},
			},
			responseMimeType: 'text/plain',
			systemInstruction: [
				{
					text: systemPrompt,
				},
			],
		};

		const maxToolCallRounds = this.MAX_TOOL_CALL_ROUNDS;
		// 循环处理，直到 API 返回最终回复而不是工具调用
		for (let i = 0; i < maxToolCallRounds; i++) {
			console.log(`API 调用轮次: ${i + 1}`);
			console.log('当前发送的 contents:', JSON.stringify(contents, null, 2)); // 打印完整的 contents 可能非常长，谨慎使用

			try {
				console.log('发送 Gemini API 请求...');
				const response = await ai.models.generateContent({
					model: modelName,
					config: baseConfig,
					contents: contents,
				});

				console.log(`Gemini API 响应: ${JSON.stringify(response, null, 2)}`);

				const candidate = response?.candidates?.[0];

				if (!candidate || !candidate.content || !candidate.content.parts) {
					console.warn('Gemini API 返回结果不包含有效的 candidate 或 content:', JSON.stringify(response, null, 2));
					throw new Error('Gemini API 未返回有效结果');
				}

				const parts = candidate.content.parts;
				const functionCalls = parts.filter((part) => part.functionCall);

				if (functionCalls.length > 0) {
					console.log(`检测到工具调用 (${functionCalls.length} 个)`);

					// 将模型的工具调用回复（包括文本和工具调用）添加到消息历史
					contents.push({
						role: 'model',
						parts: parts, // 添加所有 parts (包括文本和 functionCall)
					});

					const toolResponseParts = []; // 存储本次轮次所有工具的执行结果

					for (const functionCall of functionCalls) {
						const functionName = functionCall.functionCall.name;
						const functionArgs = functionCall.functionCall.args;

						if (toolExecutors[functionName]) {
							try {
								// 执行对应的工具函数
								console.log(`执行工具: ${functionName}, 参数:`, functionArgs);
								// 工具执行器需要返回 { output: '...' } 格式
								const toolResult = await toolExecutors[functionName](functionArgs);

								// 将工具执行结果添加到 toolResponseParts 数组
								toolResponseParts.push({
									functionResponse: {
										name: functionName,
										response: toolResult, // toolResult 应该是 { output: '...' } 格式
									},
								});
								console.log(`工具 ${functionName} 执行成功，结果已记录`);
							} catch (toolError) {
								console.error(`执行工具 ${functionName} 失败:`, toolError);
								// 即使工具执行失败，也向 API 报告失败信息
								toolResponseParts.push({
									functionResponse: {
										name: functionName,
										response: {
											output: `错误：执行工具 ${functionName} 失败 - ${toolError.message || '未知错误'}`,
										},
									},
								});
							}
						} else {
							// 处理模型调用了我们未实现的工具的情况
							const errorMsg = `模型调用了未实现的工具: ${functionName}`;
							console.warn(errorMsg);
							toolResponseParts.push({
								functionResponse: {
									name: functionName,
									response: {
										output: `错误：工具 ${functionName} 未实现`,
									},
								},
							});
						}
					}

					// 将所有工具的执行结果作为用户消息发送回 API
					if (toolResponseParts.length > 0) {
						contents.push({
							role: 'user',
							parts: toolResponseParts,
						});
						console.log('工具执行结果已添加到消息历史，准备下一轮 API 调用');
					} else {
						// 如果没有任何工具被成功或失败执行（理论上不应该发生如果 model 响应有 functionCalls）
						console.warn('模型调用了工具，但没有工具执行结果被记录');
						// 这种情况下，模型可能陷入困境，直接返回一个提示或错误
						return {
							role: 'model',
							parts: [{ text: '😥 抱歉，模型尝试使用工具但未能获取结果。' }],
						};
					}
				} else {
					// 没有工具调用，提取最终的文本回复或其他内容
					const textParts = parts.filter((part) => part.text);

					if (textParts.length > 0) {
						console.log(`Gemini API request successful, returning text response.`);
						// 返回完整的响应对象，符合最终回复格式
						return {
							role: 'model',
							parts: textParts,
						};
					} else {
						// 如果既没有工具调用也没有文本回复
						console.warn('Gemini API 返回非工具调用响应，但没有文本内容或其他可处理的 parts:', JSON.stringify(response, null, 2));
						// 可以检查 finishReason，例如是否是 "STOP"
						const finishReason = candidate.finishReason;
						if (finishReason === 'STOP') {
							// 如果正常停止但内容为空，可能是模型无话可说或遇到问题
							return {
								role: 'model',
								parts: [{ text: '😥 抱歉，未能获取有效的文本回复。' }],
							};
						} else {
							// 其他 finishReason 可能需要进一步处理
							return {
								role: 'model',
								parts: [{ text: `😥 抱歉，未能获取有效的文本回复，Finish Reason: ${finishReason}` }],
							};
						}
					}
				}
			} catch (error) {
				console.error('调用 Gemini API 或处理工具调用过程中发生错误:', error);
				// 错误已在内部记录和通知，这里只需重新抛出或返回错误状态
				throw error;
			}
		}

		// 如果循环次数达到上限，仍然没有最终回复
		const errorMsg = `达到最大 API 调用轮次 (${maxToolCallRounds})，未能获取最终回复`;
		console.error(errorMsg);
		throw new Error(errorMsg);
	}
}

export default GeminiApi;
