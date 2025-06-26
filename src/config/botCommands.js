// src/config/botCommands.js

/**
 * 定义 Bot 命令及其描述和对应的处理函数名称
 */
const botCommands = [
	{ command: 'start', description: '欢迎使用' },
	{ command: 'clear', description: '清理对话上下文' },
	{ command: 'tools', description: '模型可用工具' },
	// { command: 'debug', description: '进入调试模式' },
	// { command: 'debug_out', description: '退出调试模式' },
];

/**
 * 根据命令字符串查找对应的命令配置
 * @param {string} command - 命令字符串 (不包含 '/')
 * @returns {object | undefined} 命令配置对象或 undefined
 */
function getCommandConfig(command) {
	return botCommands.find((cmd) => cmd.command === command);
}

export { botCommands, getCommandConfig };
