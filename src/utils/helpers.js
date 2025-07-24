// src/utils/helpers.js

/**
 * HTML 字符转义 -  精简版本，仅转义 Telegram HTML 必需字符
 * @param {string} text  要转义的文本
 * @returns {string}  转义后的 HTML 文本
 */
function escapeHtml(text) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

/**
 * 将 Markdown 格式文本转换为 HTML 格式
 * (这里仅为示例，实际转换需要更复杂的逻辑或使用库)
 * @param {string} markdownText - Markdown 格式文本
 * @returns {string} HTML 格式文本
 */
function markdownToHtml(markdownText) {
	if (typeof markdownText !== 'string') {
		console.error('markdownToHtml: 输入必须是字符串');
		return '';
	}

	let htmlText = markdownText;

	try {
		// 将常用的正则表达式定义为常量，提高可读性
		const REGEX = {
			CODE_BLOCK: /```(\w*)\n([\s\S]+?)```/g,
			INLINE_CODE: /`([^`]+?)`/g,
			LINK: /\[([^\]]+?)\]\(([^\)]+?)\)/g,
			BOLD_ASTERISK: /\*\*(.*?)\*\*/g,
			BOLD_UNDERSCORE: /__(.*?)__/g, // 明确用于粗体
			ITALIC_ASTERISK: /\*(.*?)\*/g, // 明确用于斜体
			STRIKETHROUGH: /~(.*?)~/g,
			SPOILER: /\|\|(.*?)\|\|/g,
			BLOCKQUOTE: /(^> [^\n]+(\n> [^\n]+)*)(?:\n|$)/gm,
			EXPANDABLE_BLOCKQUOTE: /(^>> [^\n]+(\n>> [^\n]+)*)(?:\n|$)/gm,
		};

		// 代码块格式化 (```lang\n code \n```  =>  <pre><code class="language-lang">...</code></pre>)
		htmlText = htmlText.replace(REGEX.CODE_BLOCK, (_, lang, code) => {
			const languageClass = lang ? `language-${lang}` : '';
			// 代码块内部的内容需要进行 HTML 转义
			return `<pre><code class="${languageClass}">${escapeHtml(
				code.trim()
			)}</code></pre>`;
		});

		// 行内代码格式化 (`code` => <code>code</code>)
		// 行内代码格式化 (`code` => <code>code</code>)
		htmlText = htmlText.replace(REGEX.INLINE_CODE, (match, content) => {
			// 行内代码内部的内容需要进行 HTML 转义
			return `<code>${escapeHtml(content)}</code>`;
		});

		// 链接格式化 ([text](url)  =>  <a href="url">text</a>)
		htmlText = htmlText.replace(REGEX.LINK, '<a href="$2">$1</a>');

		// 粗体格式化 (**bold**  =>  <b>bold</b>) - 同时支持 ** 和 __
		htmlText = htmlText.replace(REGEX.BOLD_ASTERISK, '<b>$1</b>');
		htmlText = htmlText.replace(REGEX.BOLD_UNDERSCORE, '<b>$1</b>');

		// 斜体格式化 (*italic*  =>  <i>italic</i>) - 支持 *
		htmlText = htmlText.replace(REGEX.ITALIC_ASTERISK, '<i>$1</i>');

		// 删除线格式化 (~strike~  =>  <s>strike</s>)
		htmlText = htmlText.replace(REGEX.STRIKETHROUGH, '<s>$1</s>');

		// 剧透格式化 (||spoiler||  =>  <tg-spoiler>spoiler</tg-spoiler>)
		// 统一使用 <tg-spoiler> 标签，不再处理 <span class="tg-spoiler">
		htmlText = htmlText.replace(REGEX.SPOILER, '<tg-spoiler>$1</tg-spoiler>');

		// 引用块格式化 (> quote  =>  <blockquote>quote</blockquote>) - 处理多行引用
		htmlText = htmlText.replace(REGEX.BLOCKQUOTE, (match) => {
			const blockquoteContent = match.replace(/^> /gm, '').trim();
			return `<blockquote>${blockquoteContent}</blockquote>`;
		});

		// 可展开引用块格式化 (>> quote  =>  <blockquote expandable>quote</blockquote>) - 处理多行可展开引用
		htmlText = htmlText.replace(REGEX.EXPANDABLE_BLOCKQUOTE, (match) => {
			const expandableBlockquoteContent = match.replace(/^>> /gm, '').trim();
			return `<blockquote expandable>${expandableBlockquoteContent}</blockquote>`;
		});

		return htmlText;
	} catch (error) {
		console.error('格式化文本为 HTML 格式时发生错误:', error);
		// 发生错误时，返回原始文本或空字符串，取决于期望的行为
		return markdownText; // 或者 return '';
	}
}

/**
 * 获取当前 UTC+8 时间并格式化
 * @returns {string} 格式化后的时间字符串 (YYYY-MM-DD HH:mm:ss UTC+8)
 */
function getCurrentTime() {
	const now = new Date();
	const formatter = new Intl.DateTimeFormat('zh-CN', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
		timeZone: 'Asia/Shanghai',
	});

	const formattedTime = formatter.format(now).replace(/\//g, '-') + ' UTC+8';
	return formattedTime;
}

export { markdownToHtml, getCurrentTime };
