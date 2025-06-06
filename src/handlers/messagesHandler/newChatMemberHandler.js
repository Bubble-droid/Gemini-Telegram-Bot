// src/handlers/messagesHandler/newChatMemberHandler.js

import getConfig from '../../env';
import TelegramBot from '../../api/TelegramBot';
import { scheduleDeletion } from '../../utils/scheduler';

/**
 * 处理新成员加入聊天的消息
 * @param {object} message - Telegram Message 对象
 * @param {object} env - Cloudflare Worker 的环境变量对象
 * @returns {boolean} - 如果消息已被处理，返回 true
 */
async function newChatMemberHandler(message, env) {
	console.log('Received message:', JSON.stringify(message, null, 2));
	console.log('Handling new chat member message...');
	const config = getConfig(env);
	const bot = new TelegramBot(env);
	const botName = config.botName.replace('@', '').trim();

	const {
		chat: { id: chatId, title: chatTitle = 'GUI.for.Cores' },
		new_chat_member: { id: newMemberId, first_name = '', last_name = '' },
	} = message;

	const newMemberFullName = `${first_name} ${last_name}`.trim();

	const newMemberMention = `[${newMemberFullName}](tg://user?id=${newMemberId})`;
	const welcomeText = `欢迎  ${newMemberMention}  加入 ${chatTitle} 讨论组！

		* 提问前须知：

		  - 遇到任何问题请先将 GUI.for.Cores 主程序，和滚动发行更新到最新版。
		  - 请确保你当前使用的 GUI.for.Cores 版本，与所选内核版本兼容。
		  - 提问应直接发报错或者日志截图，说明你使用的 GUI.for.Cores 客户端和版本，以及使用的内核版本。
		  - 有关 GUI.for.Cores 操作和内核配置的问题，都可以 @ 智能助手(${botName}) 提问，以获得及时解答。`;

	try {
		const { message_id } = await bot.sendMessage({
			chat_id: chatId,
			text: welcomeText,
		});

		if (message_id) {
			await scheduleDeletion(env, chatId, message_id, 3 * 60 * 1_000);
		}
	} catch (error) {
		console.log('Error sending welcome message');
		throw error;
	}
}

export default newChatMemberHandler;
