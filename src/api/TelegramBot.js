// src/api/TelegramBot.js

import getConfig from '../env';
import { markdownToHtml } from '../utils/helpers';
import { botCommands } from '../config/botCommands';

/**
 * 封装 Telegram Bot API 的交互逻辑
 */
class TelegramBot {
	/**
	 * @param {object} env - Cloudflare Worker 的环境变量对象
	 */
	constructor(env) {
		const config = getConfig(env);
		this.botToken = config.botToken;
		this.apiUrl = config.apiUrl;
		this.env = env;
	}

	/**
	 * 发送 API 请求的通用方法
	 * @param {string} method - Telegram Bot API 方法名 (例如 'sendMessage')
	 * @param {object} body - 请求体参数
	 * @returns {Promise<object>} API 响应对象
	 * @private
	 */
	async _sendRequest(method, body) {
		const url = `${this.apiUrl}/${method}`;
		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
			});

			const result = await response.json();

			if (!response.ok || !result.ok) {
				console.error(`Telegram API request failed for ${method}:`, result);
				throw new Error(
					`Telegram API error: ${result.description || response.statusText}`
				);
			}

			return result.result;
		} catch (error) {
			console.error(`Error sending request to ${method}:`, error);
			throw error;
		}
	}

	/**
	 * 发送文本消息
	 * @param {object} params - 包含发送消息所需参数的对象 (如 chat_id, text, parse_mode 等)
	 * @returns {Promise<object>} API 响应对象
	 */
	async sendMessage(params, isFormatted = true) {
		// console.log('Sending message with params:', params);
		const body = {
			chat_id: params.chat_id,
			text: isFormatted ? markdownToHtml(params.text) : params.text,
			reply_to_message_id: params.reply_to_message_id || null,
			parse_mode: params.parse_mode || 'HTML',
			link_preview_options: { is_disabled: true },
		};
		try {
			const result = await this._sendRequest('sendMessage', body);
			return { ok: true, message_id: result.message_id };
		} catch (error) {
			console.error('Error in sendMessage:', error);
			throw error;
		}
	}

	/**
	 * 编辑已发送的文本消息
	 * @param {object} params - 包含编辑消息所需参数的对象 (如 chat_id, message_id, text, parse_mode 等)
	 * @param {boolean} [isFormatted=true] - 是否对文本进行 Markdown 到 HTML 的格式转换
	 * @returns {Promise<object>} API 响应对象
	 */
	async editMessageText(params, isFormatted = true) {
		const body = {
			chat_id: params.chat_id,
			message_id: params.message_id,
			text: isFormatted ? markdownToHtml(params.text) : params.text,
			parse_mode: params.parse_mode || 'HTML',
			link_preview_options: { is_disabled: true },
		};
		try {
			const result = await this._sendRequest('editMessageText', body);
			return { ok: true, message_id: result.message_id };
		} catch (error) {
			console.error('Error in editMessageText:', error);
			throw error;
		}
	}

	/**
	 * 删除指定聊天中的消息
	 * @param {Object} params - 请求参数
	 * @param {number|string} params.chat_id - 聊天ID
	 * @param {number} params.message_id - 消息ID
	 * @returns {Object|null} 成功返回{ ok: true }，失败返回null
	 */
	async deleteMessage(params) {
		const body = {
			chat_id: params.chat_id,
			message_id: params.message_id,
		};
		try {
			/** 发送删除消息请求 */
			await this._sendRequest('deleteMessage', body);
			return { ok: true };
		} catch (error) {
			/** 记录错误并返回空值 */
			console.error('Error in deleteMessage:', error);
			throw error;
		}
	}

	/**
	 * 设置 Bot 命令列表
	 * @param {Array<object>} commands - 命令列表，每个对象包含 command 和 description
	 * @returns {Promise<object>} API 响应对象
	 */
	async setBotCommands(params) {
		// console.log('Setting bot commands:', commands);
		const body = {
			commands: botCommands,
			scope: {
				type: 'chat',
				chat_id: params.chat_id,
			},
		};
		try {
			// 调用 _sendRequest 并返回结果
			await this._sendRequest('setMyCommands', body);

			return { ok: true };
		} catch (error) {
			console.error('Error in setBotCommands:', error);
			throw error;
		}
	}

	/**
	 * 获取文件信息，包括文件路径
	 * @param {string} fileId - 文件的唯一 ID
	 * @returns {Promise<object|null>} 文件信息对象，如果获取失败则返回 null
	 */
	async getFile(fileId) {
		console.log(`Getting file info for file_id: ${fileId}`);
		try {
			return await this._sendRequest('getFile', { file_id: fileId });
		} catch (error) {
			console.error(`Error in getFile for file_id ${fileId}:`, error);
			throw error;
		}
	}
}

export default TelegramBot;
