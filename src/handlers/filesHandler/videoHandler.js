// src/handlers/filesHandler/videoHandler.js

import getConfig from '../../env';
import uploadFileToGemini from './geminiFileProcessor'; // Import the new processor

/**
 * 处理接收到的视频文件消息
 * @param {object} video - Telegram Video 对象
 * @param {object} env - Cloudflare Worker 的环境变量对象
 * @returns {Promise<object|null>} 成功上传到 Gemini 的文件对象，如果处理失败则返回 null
 */
async function handleVideo(video, env) {
	console.log('Handling video message');
	const config = getConfig(env);

	if (!video || !video.file_id) {
		console.log('Invalid video object or missing file_id.');
		return null;
	}

	try {
		const uploadedFile = await uploadFileToGemini(video.file_id, video.file_name || `video_${video.file_unique_id}`, 'video/mp4', env);

		return uploadedFile;
	} catch (error) {
		console.error('Error handling video:', error);
		throw error;
	}
}

export default handleVideo;
