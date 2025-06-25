// src/api/GeminiApi.js

import { GoogleGenAI, FunctionCallingConfigMode } from '@google/genai';
import getConfig from '../../env';
import kvRead from '../../kvManager/kvRead';
import tools from './toolDeclarations';
import toolExecutors from './toolExecutors';

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
		this.toolExecutors.env = env;
		this.toolExecutors.githubToken = config.githubToken; // 将 githubToken 传递给工具执行器
		this.MAX_TOOL_CALL_ROUNDS = 6; // 最大工具调用轮次
	}

	/**
	 * 调用 Gemini API 进行对话或生成内容，支持工具调用
	 * @param {Array<object>} initialContents - 初始对话历史记录 (格式取决于 Gemini SDK)
	 * @returns {Promise<object|null>} Gemini API 的最终响应对象，包含文本或工具调用结果。如果发生错误则返回 null。
	 */
	async generateContent(initialContents) {
		if (!initialContents || !Array.isArray(initialContents)) return null;
		const systemPrompt = (await kvRead(this.botConfigKv, this.systemPromptKey)) || 'You are a helpful assistant.';

		console.log(`systemPrompt: ${systemPrompt.slice(0, 200)}...`);

		// 复制初始内容，以便在工具调用时添加新消息
		let contents = [...initialContents];
		// 配置 API 请求
		const baseConfig = {
			maxOutputTokens: 65536,
			temperature: 0.7,
			thinkingConfig: {
				thinkingBudget: 24576,
			},
			tools: this.tools,
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

		const MAX_RETRIES = 3; // 定义最大重试次数
		let retryCount = 0; // 初始化重试计数

		// 循环处理，直到 API 返回最终回复而不是工具调用
		for (let i = 0; i < this.MAX_TOOL_CALL_ROUNDS; i++) {
			console.log(`API 调用轮次: ${i + 1}, 重试次数: ${retryCount}`);
			console.log('当前发送的 contents:', JSON.stringify(contents, null, 2)); // 打印完整的 contents 可能非常长，谨慎使用

			try {
				console.log('发送 Gemini API 请求...');
				const response = await this.genai.models.generateContent({
					model: this.model,
					config: baseConfig,
					contents: contents,
				});

				console.log(`Gemini API 响应: ${JSON.stringify(response, null, 2)}`);

				const candidate = response?.candidates?.[0];

				if (!candidate || !candidate.content || !candidate.content.parts) {
					console.warn('Gemini API 返回结果不包含有效的 candidate 或 content:', JSON.stringify(response, null, 2));
					if (retryCount < MAX_RETRIES) {
						retryCount++;
						console.log(`Gemini API 响应为空，进行第 ${retryCount} 次重试...`);
						await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount)); // 每次重试间隔递增
						continue; // 继续下一次循环，进行重试
					} else {
						throw new Error(`Gemini API 未返回有效结果，已达最大重试次数 (${MAX_RETRIES})`);
					}
				}

				// 重置重试计数，因为成功获取到有效响应
				retryCount = 0;

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

						if (this.toolExecutors[functionName]) {
							try {
								// 执行对应的工具函数
								const toolResult = await this.toolExecutors[functionName](functionArgs);

								if (functionName === 'getOnlineMediaFile' && toolResult.fileData) {
									toolResponseParts.push({
										fileData: toolResult.fileData,
									});
								} else {
									// 将工具执行结果添加到 toolResponseParts 数组
									toolResponseParts.push({
										functionResponse: {
											name: functionName,
											response: toolResult,
										},
									});
								}
								console.log(`工具 ${functionName} 执行成功，结果已记录`);
							} catch (toolError) {
								console.error(`执行工具 ${functionName} 失败:`, toolError);
								// 即使工具执行失败，也向 API 报告失败信息
								toolResponseParts.push({
									functionResponse: {
										name: functionName,
										response: {
											error: `错误：执行工具 ${functionName} 失败 - ${toolError.message || '未知错误'}`,
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
										error: `错误：工具 ${functionName} 未实现`,
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
		const errorMsg = `达到最大 API 调用轮次 (${this.MAX_TOOL_CALL_ROUNDS})，未能获取最终回复`;
		console.error(errorMsg);
		throw new Error(errorMsg);
	}
}

export default GeminiApi;
