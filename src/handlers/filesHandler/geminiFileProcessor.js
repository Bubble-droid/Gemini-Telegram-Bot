// src/handlers/filesHandler/geminiFileProcessor.js

import { GoogleGenAI } from '@google/genai';
import getConfig from '../../env';
import downloadFileAsArrayBuffer from './fileDownloader';
import TelegramBot from '../../api/TelegramBot';
import kvRead from '../../kvManager/kvRead';
import { randomString } from '../../utils/helpers';

/**
 * 上传文件到 Gemini 并等待其处理完成。
 * @param {string} fileId - Telegram 文件的 file_id。
 * @param {string} fileName - 文件的显示名称。
 * @param {string} mimeType - 文件的 MIME 类型。
 * @param {object} env - Cloudflare Worker 的环境变量对象。
 * @returns {Promise<object|null>} 成功上传到 Gemini 的文件对象，如果处理失败则返回 null。
 */
async function uploadFileToGemini(
	fileId,
	fileName,
	mimeType,
	env,
	isToolExec = false,
	toolExecArgs
) {
	const config = getConfig(env);
	const bot = new TelegramBot(env);

	try {
		let fileUrl = '';
		if (!isToolExec) {
			// 1. 使用 Telegram Bot API 的 getFile 方法获取文件路径
			const file = await bot.getFile(fileId);
			if (!file || !file.file_path) {
				console.error(`Failed to get file path for file_id: ${fileId}`);
				return null;
			}
			fileUrl = `https://api.telegram.org/file/bot${config.botToken}/${file.file_path}`;
		} else {
			fileUrl = toolExecArgs.fileUrl;
		}
		console.log(`Downloading file from: ${fileUrl}`);

		// 2. 使用 downloadFileAsArrayBuffer 下载文件
		const fileArrayBuffer = await downloadFileAsArrayBuffer(fileUrl);
		if (!fileArrayBuffer) {
			console.error(`Failed to download file from: ${fileUrl}`);
			return null;
		}

		// 3. 将文件上传到 Gemini
		console.log('Uploading file to Gemini...');
		const geminiApiKeys = await kvRead(config.botConfigKv, 'gemini_api_keys', {
			type: 'json',
		});

		const fileBlob = new Blob([fileArrayBuffer], {
			type: isToolExec ? toolExecArgs.mimeType : mimeType,
		});
		const uploadedFileConfig = {
			displayName: isToolExec ? toolExecArgs.fileName : fileName,
			mimeType: isToolExec ? toolExecArgs.mimeType : mimeType,
			name: `files/${randomString(12)}`,
		};

		const [apiKey, apiKeyId] = geminiApiKeys[1];

		const ai = new GoogleGenAI({ apiKey });
		const uploadedFile = await ai.files.upload({
			file: fileBlob,
			config: uploadedFileConfig,
		});

		console.log(
			`Upload initiated. File name: ${uploadedFile.name}, State: ${uploadedFile.state}`
		);

		// 4. 等待文件处理完成
		const getFileStatus = await processGeminiFile(uploadedFile, env);

		if (!getFileStatus) {
			// processGeminiFile 已经记录了错误
			return null;
		}

		// 5. 返回上传的文件对象
		return uploadedFile;
	} catch (error) {
		console.error('Error in uploadFileToGemini:', error);
		throw error;
	}
}

/**
 * 等待 Gemini 文件处理完成。
 * @param {object} uploadedFile - 包含 'name' 属性的已上传文件对象。
 * @param {object} env - Cloudflare Worker 的环境变量对象。
 * @returns {Promise<object|null>} 文件状态对象（如果处理成功），否则为 null。
 */
async function processGeminiFile(uploadedFile, env) {
	const config = getConfig(env);
	const geminiApiKeys = await kvRead(config.botConfigKv, 'gemini_api_keys', {
		type: 'json',
	});
	const [apiKey, apiKeyId] = geminiApiKeys[1];
	const ai = new GoogleGenAI({ apiKey });
	try {
		let getFileStatus = await ai.files.get({ name: uploadedFile.name });

		while (getFileStatus.state === 'PROCESSING') {
			console.log(
				`Current Gemini file status: ${getFileStatus.state}. Retrying in 5 seconds...`
			);
			await new Promise((resolve) => setTimeout(resolve, 5000));
			getFileStatus = await ai.files.get({ name: uploadedFile.name });
		}

		if (getFileStatus.state === 'FAILED') {
			console.error('Gemini file processing failed.');
			// TODO: Handle specific failure reasons if needed
			return null;
		}

		console.log(
			`Gemini file processing complete. Final state: ${getFileStatus.state}`
		);
		return getFileStatus;
	} catch (error) {
		console.error('Error in processGeminiFile:', error);
		throw error;
	}
}

export default uploadFileToGemini;
