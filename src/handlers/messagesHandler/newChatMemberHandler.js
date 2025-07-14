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

	const newMemberFullName = `${first_name} ${last_name}`;

	const newMemberMention = `[${newMemberFullName}](tg://user?id=${newMemberId})`;
	const welcomeText = [
		`欢迎 ${newMemberMention} 加入 ${chatTitle} 讨论组！`,
		'* 提问前须知：',
		'  - GUI.for.Cores 分为两个客户端（GUI.for.Clash 和 GUI.for.SingBox）',
		'  - 遇到任何问题请先将 GUI.for.Cores 主程序更新到最新版，以及安装`滚动发行`插件并运行再次更新。',
		'  - 不要只更新 GUI.for.Cores 客户端，而不更新内核，反之依然。',
		'  - 请确保你当前使用的 GUI.for.Cores 版本，与所选内核版本兼容。（默认情况下 GUI.for.Cores 客户端与最新版内核保持同步）',
		'  - 如遇到更新后仍无法解决的问题，提问时应直接发出现问题的完整窗口截图，说明你使用的是哪个客户端和版本，以及使用的内核版本，还有进行什么操作时遇到的问题。',
		`  - 有关 GUI.for.Cores 和内核的问题，都可以 @ 智能助手（\`${botName}\`）提问，以获得及时解答。`,
	].join('\n');

	try {
		const { message_id } = await bot.sendMessage({
			chat_id: chatId,
			text: welcomeText,
		});

		if (message_id) {
			await scheduleDeletion(env, chatId, message_id, 5 * 60 * 1_000);
		}
	} catch (error) {
		console.log('Error sending welcome message');
		throw error;
	}
}

export default newChatMemberHandler;
