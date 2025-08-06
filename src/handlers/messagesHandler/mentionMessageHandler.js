// src/handlers/messagesHandler/mentionMessageHandler.js

import getConfig from '../../env';
import TelegramBot from '../../api/TelegramBot';
import GeminiApi from '../../api/GeminiAPI';
import rateLimiterCheck from '../../utils/rateLimiter';
import filesHandler from '../filesHandler';
import getChatContents from '../../chatContents/getChatContents';
import updateChatContents from '../../chatContents/updateChatContents';
import sendFormattedMessage from '../../utils/messageFormatting/sendMessage';
import { scheduleDeletion } from '../../utils/scheduler';

/**
 * 检查消息是否包含文件
 * @param {object} message - Telegram 消息对象
 * @returns {boolean} - 如果消息包含文件，返回 true
 */
function containsFile(message) {
	return message.video || message.document || message.photo;
}

/**
 * 从消息中提取 Gemini API 的 parts 数组
 * @param {object} message - Telegram 消息对象
 * @param {object} env - Cloudflare Worker 环境变量
 * @param {string} botName - Bot 的名称，用于从文本中移除
 * @returns {Promise<Array<object>>} - 包含文件数据和文本内容的 parts 数组
 */
async function extractMessageParts(message, env, botName) {
	const parts = [];
	let messageText = message.text || message.caption || '';

	// 如果是当前消息，移除 botName
	if (
		message.entities &&
		message.entities.some(
			(entity) => entity.type === 'mention' && messageText.substring(entity.offset, entity.offset + entity.length) === botName
		)
	) {
		messageText = messageText.replace(botName, '').trim();
	} else if (
		message.caption_entities &&
		message.caption_entities.some(
			(entity) => entity.type === 'mention' && messageText.substring(entity.offset, entity.offset + entity.length) === botName
		)
	) {
		messageText = messageText.replace(botName, '').trim();
	}

	if (message.video || message.document || message.photo) {
		console.log('Received a message with file, passing to filesHandler');
		const fileData = await filesHandler(message, env);

		if (fileData && fileData.fileData) {
			parts.push({
				fileData: fileData.fileData,
			});
		} else {
			console.log('filesHandler did not return valid fileData.');
		}

		// 如果没有提供文本，设置默认提示
		if (!messageText) {
			if (message.video) messageText = '分析这个视频';
			else if (message.document) messageText = '分析这个文件';
			else if (message.photo) messageText = '分析这张图片';
			else messageText = '分析这个文件'; // 备用提示
		}
	}

	if (messageText) {
		parts.push({
			text: messageText,
		});
	}

	return parts;
}

/**
 * 处理提及 Bot 的消息
 * 检查消息是否提及 Bot，处理文件或文本内容，并调用 Gemini API 生成回复。
 * @param {object} message - Telegram 消息对象
 * @param {object} env - Cloudflare Worker 环境变量
 * @returns {Promise<boolean>} - 如果消息被处理（无论是成功还是失败），返回 true；如果消息未提及 Bot 或无有效内容，返回 false。
 */
async function handleMentionMessage(message, env, isChat = false) {
	console.log('Received message:', JSON.stringify(message, null, 2));
	console.log('Handling mention message...');
	const config = getConfig(env);
	const bot = new TelegramBot(env);
	const adminId = config.adminId;
	const botName = config.botName;
	const messageText = message.text || message.caption || ''; // Keep original text for mention check

	const hasFileInCurrentMessage = containsFile(message);
	const hasFileInReplyMessage = message.reply_to_message
		? containsFile(message.reply_to_message)
		: false;

	try {
		// 检查是否提及 Bot
		if (!messageText.includes(botName) && !isChat) {
			return false;
		}

		console.log('Mention verified.');

		const {
			message_id: replyToMessageId,
			from: { id: userId },
			chat: { id: chatId },
		} = message;

		if (
			!messageText.replace(botName, '').trim() &&
			!hasFileInCurrentMessage &&
			!message.reply_to_message
		) {
			console.log('No valid content to send to Gemini API.');
			const { message_id } = await bot.sendMessage({
				chat_id: chatId,
				text: '请发送你的问题或者回复某条消息并 @ 我，可以是图片、视频、文本或者文件。',
				reply_to_message_id: replyToMessageId,
			});
			if (message_id) {
				await scheduleDeletion(env, chatId, message_id, 3 * 60 * 1_000);
			}
			return true; // 消息已被处理 (错误情况)
		}

		const { canProceed, retryAfterSeconds } = await rateLimiterCheck(
			env,
			chatId
		);

		if (!canProceed && userId !== adminId) {
			console.log(
				`Rate limit exceeded. Retry after ${retryAfterSeconds} seconds.`
			);
			const { message_id } = await bot.sendMessage({
				chat_id: chatId,
				text: `超出速率限制，请等待 ${retryAfterSeconds} 秒后重试。`,
				reply_to_message_id: replyToMessageId,
			});

			if (message_id) {
				await scheduleDeletion(
					env,
					chatId,
					message_id,
					Number(retryAfterSeconds) * 1_000
				);
			}
			return true;
		}

		let uploadMessageId = null;
		if (hasFileInCurrentMessage || hasFileInReplyMessage) {
			const { message_id } = await bot.sendMessage({
				chat_id: chatId,
				text: '📄 File uploading...',
				reply_to_message_id: replyToMessageId,
			});
			uploadMessageId = message_id;
		}

		let askContents = []; // Array to hold contents for the Gemini API call
		try {
			// 处理 reply_to_message
			if (message.reply_to_message) {
				console.log('Handling reply_to_message...');
				const replyParts = await extractMessageParts(
					message.reply_to_message,
					env,
					botName
				);
				if (
					message.reply_to_message.from.username ===
					botName.replace('@', '').trim()
				) {
					isChat = true;
				}
				if (replyParts.length > 0) {
					askContents.push({
						role: isChat ? 'model' : 'user',
						parts: replyParts,
					});
				}
			}

			// 处理当前消息
			const currentParts = await extractMessageParts(
				message,
				env,
				botName,
				replyToMessageId
			);
			if (currentParts.length > 0) {
				askContents.push({
					role: 'user',
					parts: currentParts,
				});
			}
		} catch (extractError) {
			try {
				if (uploadMessageId) {
					await bot.deleteMessage({
						chat_id: chatId,
						message_id: uploadMessageId,
					});
				}
			} finally {
				throw extractError;
			}
		}

		if (uploadMessageId) {
			await bot.deleteMessage({
				chat_id: chatId,
				message_id: uploadMessageId,
			});
		}

		const chatContents = await getChatContents(env, chatId, userId);

		if (!chatContents) {
			throw new Error('Failed to get chat contents.');
		}

		// 合并历史记录和当前/回复消息内容
		const contents = [...chatContents, ...askContents];

		const { message_id: thinkMessageId } = await bot.sendMessage({
			chat_id: chatId,
			text: '✨ Thinking...',
			reply_to_message_id: replyToMessageId,
		});

		if (thinkMessageId) {
			await scheduleDeletion(env, chatId, thinkMessageId, 30 * 60 * 1_000);
		}

		const geminiApi = new GeminiApi(env, {
			chatId,
			replyToMessageId,
			thinkMessageId,
		});
		try {
			const { response, hasThoughts, callCount, retryCount, totalToken } =
				await geminiApi.generateContent(contents);

			const resThoughtTexts =
				response.parts
					.filter((part) => part.thought)
					.map((part) => part.text)
					.join('')
					.trim() || '';

			let hasResThoughts = false;

			if (resThoughtTexts) {
				hasResThoughts = true;
				await bot.editMessageText(
					{
						chat_id: chatId,
						message_id: thinkMessageId,
						text: `Thoughts:\n\n<blockquote expandable>${(() => {
							const strArr = Array.from(resThoughtTexts);
							if (strArr.length > 4096) {
								return `${strArr.slice(0, 2000).join('')}\n\n......\n\n${strArr
									.slice(strArr.length - 2000)
									.join('')}`.trim();
							}
							return resThoughtTexts;
						})()}</blockquote>`,
					},
					false
				);
			}

			if (!hasThoughts && !hasResThoughts) {
				await bot.deleteMessage({
					chat_id: chatId,
					message_id: thinkMessageId,
				});
			}

			const resTexts =
				response.parts
					.filter((part) => !part.thought)
					.map((part) => part.text)
					.join('')
					.trim() || '';

			if (!resTexts) {
				await bot.deleteMessage({
					chat_id: chatId,
					message_id: thinkMessageId,
				});
				throw new Error('Gemini API 未返回有效回复：未知原因，请稍后再试。');
			}

			const fullText = `🤖 \`${config.modelName}\`\n\n${resTexts}\n\n\n*✨ 本次处理共调用 ${callCount} 次 Gemini API（${retryCount} 次出错重试），总消耗 ${totalToken} 个 Token*\n\n*⚠️ AI 的回答无法保证百分百准确，请自行判断！*`;

			const { ok, error: sendError } = await sendFormattedMessage(
				env,
				chatId,
				fullText,
				replyToMessageId
			);

			if (!ok) {
				throw sendError || new Error('发送消息时发生未知错误');
			}

			if (resTexts) {
				// 更新聊天记录，保存 askContents 和回复
				await updateChatContents(env, chatId, userId, [
					...askContents,
					response,
				]);
			}
		} catch (apiError) {
			await bot.deleteMessage({
				chat_id: chatId,
				message_id: thinkMessageId,
			});
			throw apiError;
		}
	} catch (error) {
		console.error('Error handling mention message');
		throw error;
	}

	return true;
}

export default handleMentionMessage;
