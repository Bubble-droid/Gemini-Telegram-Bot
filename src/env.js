// src/env.js

/**
 * 从环境变量中获取并整理配置信息
 * @param {object} env - Cloudflare Worker 的环境变量对象
 * @returns {object} 包含所有配置项的对象
 */
const getConfig = (env) => {
	// 验证必要的环境变量是否存在
	const requiredVars = [
		'GEMINI_API_KEY',
		'TELEGRAM_BOT_ADMIN_ID',
		'TELEGRAM_BOT_USERNAME',
		'TELEGRAM_BOT_TOKEN',
		'WEBHOOK_SECRET_TOKEN',
		'TELEGRAM_BOT_CONFIG',
		'GROUP_CHAT_CONTENTS',
		'API_RATE_LIMIT',
		'GITHUB_TOKEN', // 添加 GitHub Token
	];
	for (const varName of requiredVars) {
		if (!env[varName]) {
			throw new Error(`缺少必要的环境变量: ${varName}`);
		}
	}

	return {
		apiKey: env.GEMINI_API_KEY,
		modelName: env.GEMINI_MODEL_NAME || 'gemini-2.5-flash-preview-05-20',
		adminId: Number(env.TELEGRAM_BOT_ADMIN_ID),
		botId: Number(env.TELEGRAM_BOT_ID),
		botName: env.TELEGRAM_BOT_USERNAME,
		botToken: env.TELEGRAM_BOT_TOKEN,
		apiUrl: `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`,
		secretToken: env.WEBHOOK_SECRET_TOKEN,
		kvExpirationTtl: Number(env.KV_EXPIRATION_TTL) || 7 * 24 * 60 * 60,
		botConfigKv: env.TELEGRAM_BOT_CONFIG,
		chatContentsKv: env.GROUP_CHAT_CONTENTS,
		allowedGroupIds: env.ALLOWED_GROUP_IDS,
		apiRateLimit: env.API_RATE_LIMIT,
		maxContentsLength: Number(env.MAX_CONTENTS_LENGTH) || 10,
		apiRequestInterval: Number(env.API_REQUEST_INTERVAL) || 1.0,
		githubToken: env.GITHUB_TOKEN, // 添加 GitHub Token
	};
};

export default getConfig;
