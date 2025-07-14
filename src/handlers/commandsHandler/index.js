// src/handlers/commandsHandler/index.js

import getConfig from '../../env';
import TelegramBot from '../../api/TelegramBot';
import handleStartCommand from './startCommand';
import handleClearCommand from './clearCommand';
import handleToolsCommand from './toolsCommand';
import { scheduleDeletion } from '../../utils/scheduler';

/**
 * 处理接收到的 Telegram Bot 命令
 * @param {object} message - Telegram Message 对象 (包含 bot_command entity)
 * @param {object} env - Cloudflare Worker 的环境变量对象
 */
async function commandsHandler(message, env) {
	console.log('Received message:', JSON.stringify(message, null, 2));
	console.log('Handling commands message...');
	const config = getConfig(env);
	const bot = new TelegramBot(env);
	const botName = config.botName;

	try {
		const commandEntity = message.entities.find((entity) => entity.type === 'bot_command');
		const commandText = message.text.substring(commandEntity.offset, commandEntity.offset + commandEntity.length);

		if (!commandText.includes(botName)) return false;

		await bot.setBotCommands({ chat_id: message.chat.id });

		const command = commandText.startsWith('/') ? commandText.slice(1).replace(botName, '').trim() : commandText;

		console.log('Handling command:', command);

		switch (command) {
			case 'start':
				console.log('Executing start command placeholder');
				await handleStartCommand(message, env);
				break;
			case 'clear':
				console.log('Executing clear command placeholder');
				await handleClearCommand(message, env);
				break;
			case 'tools':
				console.log('Executing tools command placeholder');
				await handleToolsCommand(message, env);
				break;
			// case 'debug':
			// 	console.log('Executing debug command placeholder');
			// 	break;
			// case 'debug_out':
			// 	console.log('Executing debug_out command placeholder');
			// 	break;
			default:
				console.log(`Unknown command: ${command}`);
		}
	} catch (error) {
		console.error('Error handling command:', error);
		await bot.deleteMessage({
			chat_id: message.chat.id,
			message_id: message.message_id,
		});
		throw error;
	}

	return true;
}

export default commandsHandler;
