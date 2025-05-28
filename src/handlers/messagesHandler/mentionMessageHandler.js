// src/handlers/messagesHandler/mentionMessageHandler.js

import getConfig from '../../env';
import TelegramBot from '../../api/TelegramBot';
import GeminiApi from '../../api/GeminiApi';
import rateLimiterCheck from '../../utils/rateLimiter';
import filesHandler from '../filesHandler';
import getChatContents from '../../chatContents/getChatContents';
import updateChatContents from '../../chatContents/updateChatContents';
import sendFormattedMessage from '../../utils/messageFormatting/sendMessage';
import { scheduleDeletion } from '../../utils/scheduler';

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
	console.log('Handling mention message...');
	const config = getConfig(env);
	const bot = new TelegramBot(env);
	const geminiApi = new GeminiApi(env);
	const botName = config.botName;
	const messageText = message.text || message.caption || ''; // Keep original text for mention check

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

		if (!messageText.replace(botName, '')) {
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

		const { canProceed, retryAfterSeconds } = await rateLimiterCheck(env, chatId);

		if (!canProceed) {
			console.log(`Rate limit exceeded. Retry after ${retryAfterSeconds} seconds.`);
			const { message_id } = await bot.sendMessage({
				chat_id: chatId,
				text: `超出速率限制，请等待 ${retryAfterSeconds} 秒后重试。`,
				reply_to_message_id: replyToMessageId,
			});

			if (message_id) {
				await scheduleDeletion(env, chatId, message_id, Number(retryAfterSeconds) * 1_000);
			}
			return true;
		}

		let askContents = []; // Array to hold contents for the Gemini API call

		// 处理 reply_to_message
		if (message.reply_to_message) {
			console.log('Handling reply_to_message...');
			const replyParts = await extractMessageParts(message.reply_to_message, env, botName);
			if (replyParts.length > 0) {
				askContents.push({
					role: isChat ? 'model' : 'user',
					parts: replyParts,
				});
			}
		}

		// 处理当前消息
		const currentParts = await extractMessageParts(message, env, botName);
		if (currentParts.length > 0) {
			askContents.push({
				role: 'user',
				parts: currentParts,
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

		try {
			const response = await geminiApi.generateContent(contents);

			// console.log('Gemini API response:', JSON.stringify(response, null, 2));

			if (!response) {
				console.log('Gemini API returned an empty response.');
				return true; // 消息已被处理 (错误情况)
			}

			const resTexts =
				response.parts
					.map((part) => part?.text)
					.join('')
					.trim() || '';

			if (!resTexts) {
				console.log('Gemini API returned empty response.');
				throw new Error('Gemini API returned an empty response.');
			}

			const fullText = `${resTexts}\n\n------\n\n⚠️ AI 的回复可能与实际不符，请自行辨认！`;

			const { ok, error: sendError } = await sendFormattedMessage(env, chatId, fullText, replyToMessageId);

			if (!ok) {
				throw sendError || new Error('发送消息时发生未知错误');
			}

			// 更新聊天记录，保存 askContents 和回复
			await updateChatContents(env, chatId, userId, [...askContents, response]);

			if (thinkMessageId) {
				await bot.deleteMessage({
					chat_id: chatId,
					message_id: thinkMessageId,
				});
			}
		} catch (error) {
			if (thinkMessageId) {
				await bot.deleteMessage({
					chat_id: chatId,
					message_id: thinkMessageId,
				});
			}
			throw error;
		}
	} catch (error) {
		console.error('Error handling mention message');
		throw error;
	}

	return true;
}

export default handleMentionMessage;
