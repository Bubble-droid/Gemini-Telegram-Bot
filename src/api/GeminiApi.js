// src/api/GeminiApi.js

import { GoogleGenAI, Type, FunctionCallingConfigMode } from '@google/genai';
import getConfig from '../env';
import kvRead from '../kvManager/kvRead';

const tools = [
	{
		functionDeclarations: [
			{
				name: 'getAssetsContent',
				description: '根据提供的 GitHub 仓库文件路径列表，获取文件的原始内容。',
				parameters: {
					type: Type.OBJECT,
					properties: {
						assetsPath: {
							type: Type.ARRAY,
							description:
								'需要查询的文件路径列表，例如 ["MetaCubeX/Meta-docs/refs/heads/main/docs/api/index.md", "SagerNet/sing-box/refs/heads/dev-next/src/main.go", ...]',
							items: {
								type: Type.STRING,
								description: '单个文件的完整路径，格式为 "owner/repo/refs/heads/branch/path/to/file.ext"',
							},
						},
					},
					required: ['assetsPath'],
				},
			},
			{
				name: 'searchGitHubRepositoryFilesByKeyword',
				description: '根据关键词在指定的 GitHub 仓库和路径中搜索文件内容，以获取相关文件路径。',
				parameters: {
					type: Type.OBJECT,
					properties: {
						keyword: {
							type: Type.STRING,
							description: '用于搜索文件内容的关键词，多个关键词请用空格分隔，例如 "路由 DNS"。',
						},
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
						},
						path: {
							type: Type.STRING,
							description: '在仓库中搜索的路径，默认为仓库根目录。例如 "docs/" 或 "frontend/src/"。此路径应相对于仓库根目录。',
							default: '',
						},
						branch: {
							type: Type.STRING,
							description: '要搜索的仓库分支，默认为仓库默认分支（如 main 或 master）。',
							default: '',
						},
					},
					required: ['keyword', 'owner', 'repo'],
				},
			},
			{
				name: 'listGitHubDirectoryContents',
				description: '列出指定 GitHub 仓库、指定目录内的所有文件和子目录（单层）。此工具旨在辅助模型探索仓库文件结构。',
				parameters: {
					type: Type.OBJECT,
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
						},
						path: {
							type: Type.STRING,
							description: '要列出文件和子目录的路径，默认为仓库根目录。例如 "docs/configuration/"。此路径应相对于仓库根目录。',
							default: '',
						},
						branch: {
							type: Type.STRING,
							description: '要查询的仓库分支，默认为仓库默认分支（如 main 或 master）。',
							default: '',
						},
					},
					required: ['owner', 'repo'],
				},
			},
			{
				name: 'listGitHubRepositoryTree',
				description: '递归列出指定 GitHub 仓库和分支下的所有文件及其完整路径。此工具旨在辅助模型获取仓库的完整文件结构，用于深度分析。',
				parameters: {
					type: Type.OBJECT,
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
						},
						branch: {
							type: Type.STRING,
							description: '要查询的仓库分支，默认为仓库默认分支（如 main 或 master）。',
							default: '',
						},
					},
					required: ['owner', 'repo'],
				},
			},
			{
				name: 'listGitHubRepositoryDirectories',
				description: '递归列出指定 GitHub 仓库和分支下的所有目录及其完整路径。此工具旨在辅助模型获取仓库的目录结构，用于深度分析。',
				parameters: {
					type: Type.OBJECT,
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
						},
						branch: {
							type: Type.STRING,
							description: '要查询的仓库分支，默认为仓库默认分支（如 main 或 master）。',
							default: '',
						},
					},
					required: ['owner', 'repo'],
				},
			},
			{
				name: 'listGitHubRepositoryFilesInPath',
				description: '递归列出指定 GitHub 仓库、分支和特定路径下的所有文件及其完整路径。此工具旨在辅助模型获取特定目录下的文件列表。',
				parameters: {
					type: Type.OBJECT,
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
						},
						path: {
							type: Type.STRING,
							description: '要筛选文件的相对路径，例如 "docs/configuration/"。此路径应相对于仓库根目录。',
						},
						branch: {
							type: Type.STRING,
							description: '要查询的仓库分支，默认为仓库默认分支（如 main 或 master）。',
							default: '',
						},
					},
					required: ['owner', 'repo', 'path'],
				},
			},
			{
				name: 'listGitHubRepositoryCommits',
				description: '获取指定 GitHub 仓库的最近提交记录。',
				parameters: {
					type: Type.OBJECT,
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
						},
						branch: {
							type: Type.STRING,
							description: '要查询的仓库分支，默认为仓库默认分支（如 main 或 master）。',
							default: '',
						},
						path: {
							type: Type.STRING,
							description: '筛选提交记录的路径，只返回涉及该路径的提交。例如 "docs/"。此路径应相对于仓库根目录。',
							default: '',
						},
						per_page: {
							type: Type.NUMBER,
							description: '每页返回的提交数量，默认为 10，最大 30。',
							default: 10,
						},
						page: {
							type: Type.NUMBER,
							description: '页码，默认为 1。',
							default: 1,
						},
					},
					required: ['owner', 'repo'],
				},
			},
		],
	},
	{
		name: 'getGitHubRepositoryReleases',
		description: '获取指定 GitHub 仓库的最新稳定发布版本（Latest Release）和最新预发布版本（Latest Pre-release）信息。',
		parameters: {
			type: Type.OBJECT,
			properties: {
				owner: {
					type: Type.STRING,
					description: 'GitHub 仓库所有者，例如 "SagerNet"。',
				},
				repo: {
					type: Type.STRING,
					description: 'GitHub 仓库名称，例如 "sing-box"。',
				},
			},
			required: ['owner', 'repo'],
		},
	},
];

/**
 * 执行工具的映射对象
 * 键是工具名称 (functionDeclarations 中的 name)，值是对应的执行函数
 */
const toolExecutors = {
	/**
	 * 执行 getAssetsContent 工具
	 * @param {object} args  工具调用时传递的参数对象，例如 { assetsPath: ['path1', 'path2'] }
	 * @returns {Promise<object>}  工具执行结果对象，包含 content 字段
	 */
	getAssetsContent: async (args) => {
		console.log('执行工具: getAssetsContent, 参数:', args);
		const assetsUrlPrefix = 'https://raw.githubusercontent.com';
		const githubToken = toolExecutors.githubToken;
		let assetstxt = '';
		if (args && args.assetsPath && Array.isArray(args.assetsPath)) {
			for (const asset of args.assetsPath) {
				if (typeof asset === 'string') {
					const completeassetUrl = `${assetsUrlPrefix}/${asset}`;
					// 从路径中提取 repo/branch/file.ext 作为文档名称的简写
					const assetNameParts = asset.split('/');
					const repoName = assetNameParts[1]; // 例如 'Meta-assets'
					const branchName = assetNameParts[3]; // 例如 'main'
					const fileName = assetNameParts
						.slice(4)
						.join('_')
						.replace(/\.[^/.]+$/, ''); // 移除文件后缀
					const assetIdentifier = `${repoName}_${branchName}_${fileName}`;

					try {
						console.log(`尝试获取文件: ${completeassetUrl}`);
						const response = await fetch(completeassetUrl, {
							method: 'GET',
							headers: {
								Authorization: `Bearer ${githubToken}`,
								'User-Agent': 'Gemini-Telegram-Bot',
							},
						});

						if (!response.ok) {
							console.warn(`获取文件失败，状态码: ${response.status}, URL: ${completeassetUrl}`);
							assetstxt += `#<document_${assetIdentifier}>\n<path>${asset}</path>\n<content>\n错误：无法获取文件内容 (状态码: ${response.status})\n</content>\n</document_${assetIdentifier}>\n\n`; // 添加错误提示到结果中
							continue; // 继续处理下一个文档
						}

						const assetContent = await response.text();
						assetstxt += `<document_${assetIdentifier}>\n<path>${asset}</path>\n<content>\n${assetContent}\n</content>\n</document_${assetIdentifier}>\n\n`; // 文档内容之间用空行隔开
					} catch (fetchError) {
						console.error(`获取文件时发生网络错误: ${fetchError}, URL: ${completeassetUrl}`);
						assetstxt += `<document_${assetIdentifier}>\n<path>${asset}</path>\n<content>\n错误：获取文件时发生网络错误 - ${
							fetchError.message || '未知错误'
						}\n</content>\n</document_${assetIdentifier}>\n\n`; // 添加错误提示到结果中
					}
				}
			}
		} else {
			console.warn('getAssetsContent 工具调用参数无效:', args);
			assetstxt = '错误：getAssetsContent 工具调用参数无效，未提供文件路径。';
		}
		console.log('getAssetsContent 工具执行完毕，结果长度:', assetstxt.length);
		return { output: assetstxt.trim() }; // 返回包含结果的对象，使用 output 字段
	},
	/**
	 * 执行 searchGitHubRepositoryFilesByKeyword 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { keyword: 'resolve', owner: 'SagerNet', repo: 'sing-box', path: 'assets/', branch: 'main' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 output 字段，output 是找到的文件路径列表
	 */
	searchGitHubRepositoryFilesByKeyword: async (args) => {
		console.log('执行工具: searchGitHubRepositoryFilesByKeyword, 参数:', args);
		const { keyword, owner, repo, path = '', branch = '' } = args; // 默认分支为 'main'
		const githubToken = toolExecutors.githubToken; // 从 toolExecutors 获取 githubToken

		if (!keyword || !owner || !repo) {
			console.warn('searchGitHubRepositoryFilesByKeyword 工具调用参数无效:', args);
			return { output: '错误：searchGitHubRepositoryFilesByKeyword 工具调用参数无效，缺少关键词、仓库所有者或仓库名称。' };
		}

		if (!githubToken) {
			console.error('GITHUB_TOKEN 未配置，无法执行 GitHub API 搜索。');
			return { output: '错误：GITHUB_TOKEN 未配置，无法执行 GitHub API 搜索。' };
		}

		// 构建 GitHub API 搜索 URL，包含 branch 参数
		// q=Keywords+in:file+repo:Owner/Repo+path:PATH/TO&ref:Branch
		const apiUrl = `https://api.github.com/search/code?q=${encodeURIComponent(keyword)}+in:file+repo:${encodeURIComponent(
			`${owner}/${repo}`
		)}${path ? `+path:${path}` : ''}${branch ? `&ref=${encodeURIComponent(branch)}` : ''}`;

		try {
			console.log(`尝试通过 GitHub API 搜索文件: ${apiUrl}`);
			const response = await fetch(apiUrl, {
				method: 'GET',
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${githubToken}`,
					'User-Agent': 'Gemini-Telegram-Bot', // GitHub API 要求 User-Agent
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.warn(`GitHub API 搜索文件失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`);
				return { output: `错误：GitHub API 搜索文件失败 (状态码: ${response.status}) - ${errorText}` };
			}

			const data = await response.json();
			const foundFiles = [];

			if (data.items && Array.isArray(data.items)) {
				for (const item of data.items) {
					// 构建完整的文档路径，格式为 "owner/repo/refs/heads/branch/path/to/asset.md"
					const repoFullName = item.repository.full_name;
					// item.path 已经是相对于仓库根目录的路径
					foundFiles.push(`${repoFullName}/refs/heads/${branch}/${item.path}`);
				}
			}
			console.log(`searchGitHubRepositoryFilesByKeyword 工具执行完毕，找到 ${foundFiles.length} 个文件。`);
			return { output: foundFiles };
		} catch (fetchError) {
			console.error(`GitHub API 搜索文件时发生网络错误: ${fetchError}, URL: ${apiUrl}`);
			return { output: `错误：GitHub API 搜索文件时发生网络错误 - ${fetchError.message || '未知错误'}` };
		}
	},

	/**
	 * 执行 listGitHubDirectoryContents 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box', path: 'docs/', branch: 'dev-next' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 output 字段，output 是文件和目录列表
	 */
	listGitHubDirectoryContents: async (args) => {
		console.log('执行工具: listGitHubDirectoryContents, 参数:', args);
		const { owner, repo, path = '', branch = '' } = args;
		const githubToken = toolExecutors.githubToken; // 从 toolExecutors 获取 githubToken

		if (!owner || !repo) {
			console.warn('listGitHubDirectoryContents 工具调用参数无效:', args);
			return { output: '错误：listGitHubDirectoryContents 工具调用参数无效，缺少仓库所有者或仓库名称。' };
		}

		if (!githubToken) {
			console.error('GITHUB_TOKEN 未配置，无法执行 GitHub API。');
			return { output: '错误：GITHUB_TOKEN 未配置，无法执行 GitHub API。' };
		}

		// 确保 path 不以斜杠开头，如果 path 为空则不需要处理
		const cleanedPath = path.startsWith('/') ? path.substring(1) : path;
		const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${cleanedPath}${
			branch ? `?ref=${encodeURIComponent(branch)}` : ''
		}`;

		try {
			console.log(`尝试通过 GitHub API 列出目录内容: ${apiUrl}`);
			const response = await fetch(apiUrl, {
				method: 'GET',
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${githubToken}`,
					'User-Agent': 'Gemini-Telegram-Bot', // GitHub API 要求 User-Agent
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.warn(`GitHub API 列出目录内容失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`);
				return { output: `错误：GitHub API 列出目录内容失败 (状态码: ${response.status}) - ${errorText}` };
			}

			const data = await response.json();
			const fileList = [];

			if (Array.isArray(data)) {
				for (const item of data) {
					// 构建完整的 GitHub 文件路径，格式为 "owner/repo/refs/heads/branch/path/to/file.ext"
					// item.path 已经是相对于仓库根目录的路径
					const fullPath = `${owner}/${repo}/refs/heads/${branch}/${item.path}`;
					fileList.push({
						name: item.name,
						path: fullPath,
						type: item.type, // 'file' or 'dir'
					});
				}
			}
			console.log(`listGitHubDirectoryContents 工具执行完毕，找到 ${fileList.length} 个文件/目录。`);
			return { output: fileList };
		} catch (fetchError) {
			console.error(`GitHub API 列出目录内容时发生网络错误: ${fetchError}, URL: ${apiUrl}`);
			return { output: `错误：GitHub API 列出目录内容时发生网络错误 - ${fetchError.message || '未知错误'}` };
		}
	},

	/**
	 * 执行 listGitHubRepositoryTree 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box', branch: 'dev-next' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 output 字段，output 是文件列表
	 */
	listGitHubRepositoryTree: async (args) => {
		console.log('执行工具: listGitHubRepositoryTree, 参数:', args);
		const { owner, repo, branch = '' } = args;
		const githubToken = toolExecutors.githubToken; // 从 toolExecutors 获取 githubToken

		if (!owner || !repo) {
			console.warn('listGitHubRepositoryTree 工具调用参数无效:', args);
			return { output: '错误：listGitHubRepositoryTree 工具调用参数无效，缺少仓库所有者或仓库名称。' };
		}

		if (!githubToken) {
			console.error('GITHUB_TOKEN 未配置，无法执行 GitHub API。');
			return { output: '错误：GITHUB_TOKEN 未配置，无法执行 GitHub API。' };
		}

		try {
			// 1. 获取分支的最新 commit SHA
			const branchApiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches/${
				branch ? `${encodeURIComponent(branch)}` : ''
			}`;
			console.log(`尝试获取分支信息: ${branchApiUrl}`);
			const branchResponse = await fetch(branchApiUrl, {
				method: 'GET',
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${githubToken}`,
					'User-Agent': 'Gemini-Telegram-Bot',
				},
			});

			if (!branchResponse.ok) {
				const errorText = await branchResponse.text();
				console.warn(`获取分支信息失败，状态码: ${branchResponse.status}, 错误: ${errorText}, URL: ${branchApiUrl}`);
				return { output: `错误：获取分支信息失败 (状态码: ${branchResponse.status}) - ${errorText}` };
			}
			const branchData = await branchResponse.json();
			const treeSha = branchData.commit.sha;
			console.log(`获取到分支 ${branch} 的 tree SHA: ${treeSha}`);

			// 2. 使用 tree SHA 递归获取仓库文件树
			const treeApiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
				repo
			)}/git/trees/${encodeURIComponent(treeSha)}?recursive=1`;
			console.log(`尝试递归获取仓库文件树: ${treeApiUrl}`);
			const treeResponse = await fetch(treeApiUrl, {
				method: 'GET',
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${githubToken}`,
					'User-Agent': 'Gemini-Telegram-Bot',
				},
			});

			if (!treeResponse.ok) {
				const errorText = await treeResponse.text();
				console.warn(`递归获取仓库文件树失败，状态码: ${treeResponse.status}, 错误: ${errorText}, URL: ${treeApiUrl}`);
				return { output: `错误：递归获取仓库文件树失败 (状态码: ${treeResponse.status}) - ${errorText}` };
			}

			const treeData = await treeResponse.json();
			const fileList = [];

			if (treeData.tree && Array.isArray(treeData.tree)) {
				for (const item of treeData.tree) {
					// 构建完整的 GitHub 路径，保留原始类型
					const fullPath = `${owner}/${repo}/refs/heads/${branch}/${item.path}`;
					fileList.push({
						name: item.path.split('/').pop(), // 文件名或目录名
						path: fullPath,
						type: item.type === 'blob' ? 'file' : 'tree', // 'blob' 表示文件，'tree' 表示目录
					});
				}
			}
			console.log(`listGitHubRepositoryTree 工具执行完毕，找到 ${fileList.length} 个文件。`);
			return { output: fileList };
		} catch (fetchError) {
			console.error(`GitHub API 列出仓库文件树时发生网络错误: ${fetchError}, URL: ${fetchError.url || '未知'}`);
			return { output: `错误：GitHub API 列出仓库文件树时发生网络错误 - ${fetchError.message || '未知错误'}` };
		}
	},

	/**
	 * 执行 listGitHubRepositoryDirectories 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box', branch: 'dev-next' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 output 字段，output 是目录列表
	 */
	listGitHubRepositoryDirectories: async (args) => {
		console.log('执行工具: listGitHubRepositoryDirectories, 参数:', args);
		const { owner, repo, branch = '' } = args;

		// 调用 listGitHubRepositoryTree 获取完整的仓库树
		const treeResult = await toolExecutors.listGitHubRepositoryTree({ owner, repo, branch });

		if (treeResult.output && Array.isArray(treeResult.output)) {
			// 筛选出所有类型为 'tree' 的项（即目录）
			const directories = treeResult.output.filter((item) => item.type === 'tree');
			console.log(`listGitHubRepositoryDirectories 工具执行完毕，找到 ${directories.length} 个目录。`);
			return { output: directories };
		} else {
			console.warn('listGitHubRepositoryDirectories 无法获取有效的仓库树数据。');
			return { output: '错误：无法获取仓库目录列表。' };
		}
	},

	/**
	 * 执行 listGitHubRepositoryFilesInPath 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box', path: 'docs/', branch: 'dev-next' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 output 字段，output 是文件列表
	 */
	listGitHubRepositoryFilesInPath: async (args) => {
		console.log('执行工具: listGitHubRepositoryFilesInPath, 参数:', args);
		const { owner, repo, path, branch = '' } = args;

		if (!path) {
			console.warn('listGitHubRepositoryFilesInPath 工具调用参数无效: 缺少 path。');
			return { output: '错误：listGitHubRepositoryFilesInPath 工具调用参数无效，缺少路径参数。' };
		}

		// 确保 path 以斜杠结尾，以便正确匹配目录下的文件
		const cleanedPath = path.endsWith('/') ? path : `${path}/`;

		// 调用 listGitHubRepositoryTree 获取完整的仓库树
		const treeResult = await toolExecutors.listGitHubRepositoryTree({ owner, repo, branch });

		if (treeResult.output && Array.isArray(treeResult.output)) {
			// 筛选出类型为 'file'（文件）且其在仓库中的相对路径以指定 path 开头的项
			const filesInPath = treeResult.output.filter((item) => {
				if (item.type !== 'file') {
					return false;
				}
				// 从完整的 item.path 中提取相对于仓库根目录的路径
				// item.path 格式为 "owner/repo/refs/heads/branch/relative/path/to/file.ext"
				const parts = item.path.split('/');
				// 确保路径至少有 5 部分（owner, repo, refs, heads, branch）
				if (parts.length < 5) {
					return false;
				}
				const relativePathInRepo = parts.slice(5).join('/');
				return relativePathInRepo.startsWith(cleanedPath);
			});
			console.log(`listGitHubRepositoryFilesInPath 工具执行完毕，找到 ${filesInPath.length} 个文件。`);
			return { output: filesInPath };
		} else {
			console.warn('listGitHubRepositoryFilesInPath 无法获取有效的仓库树数据。');
			return { output: '错误：无法获取指定路径下的文件列表。' };
		}
	},

	/**
	 * 执行 listGitHubRepositoryCommits 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box', branch: 'dev-next', path: 'docs/', per_page: 50, page: 1 }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 output 字段，output 是提交记录列表
	 */
	listGitHubRepositoryCommits: async (args) => {
		console.log('执行工具: listGitHubRepositoryCommits, 参数:', args);
		const { owner, repo, branch = '', path = '', per_page = 10, page = 1 } = args;
		const githubToken = toolExecutors.githubToken;

		if (!owner || !repo) {
			console.warn('listGitHubRepositoryCommits 工具调用参数无效: 缺少仓库所有者或仓库名称。');
			return { output: '错误：listGitHubRepositoryCommits 工具调用参数无效，缺少仓库所有者或仓库名称。' };
		}

		if (!githubToken) {
			console.error('GITHUB_TOKEN 未配置，无法执行 GitHub API。');
			return { output: '错误：GITHUB_TOKEN 未配置，无法执行 GitHub API。' };
		}

		// 构建 GitHub API 提交记录 URL
		let apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits${
			branch ? `?sha=${encodeURIComponent(branch)}` : ''
		}${path ? `&path=${path}` : ''}&per_page=${per_page}&page=${page}`;

		try {
			console.log(`尝试通过 GitHub API 获取提交记录: ${apiUrl}`);
			const response = await fetch(apiUrl, {
				method: 'GET',
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${githubToken}`,
					'User-Agent': 'Gemini-Telegram-Bot',
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.warn(`GitHub API 获取提交记录失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`);
				return { output: `错误：GitHub API 获取提交记录失败 (状态码: ${response.status}) - ${errorText}` };
			}

			const data = await response.json();
			const commits = [];

			if (Array.isArray(data)) {
				for (const item of data) {
					commits.push({
						sha: item.sha,
						message: item.commit.message,
						author: item.commit.author.name,
						date: item.commit.author.date,
						url: item.html_url,
					});
				}
			}
			console.log(`listGitHubRepositoryCommits 工具执行完毕，找到 ${commits.length} 条提交记录。`);
			return { output: commits };
		} catch (fetchError) {
			console.error(`GitHub API 获取提交记录时发生网络错误: ${fetchError}, URL: ${fetchError.url || '未知'}`);
			return { output: `错误：GitHub API 获取提交记录时发生网络错误 - ${fetchError.message || '未知错误'}` };
		}
	},

	/**
	 * 执行 getGitHubRepositoryReleases 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 output 字段，output 是最新稳定发布版本和最新预发布版本信息
	 */
	getGitHubRepositoryReleases: async (args) => {
		console.log('执行工具: getGitHubRepositoryReleases, 参数:', args);
		const { owner, repo } = args;
		const githubToken = toolExecutors.githubToken;

		if (!owner || !repo) {
			console.warn('getGitHubRepositoryReleases 工具调用参数无效: 缺少仓库所有者或仓库名称。');
			return { output: '错误：getGitHubRepositoryReleases 工具调用参数无效，缺少仓库所有者或仓库名称。' };
		}

		if (!githubToken) {
			console.error('GITHUB_TOKEN 未配置，无法执行 GitHub API。');
			return { output: '错误：GITHUB_TOKEN 未配置，无法执行 GitHub API。' };
		}

		const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases`;

		try {
			console.log(`尝试通过 GitHub API 获取所有发布版本: ${apiUrl}`);
			const response = await fetch(apiUrl, {
				method: 'GET',
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${githubToken}`,
					'User-Agent': 'Gemini-Telegram-Bot',
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.warn(`GitHub API 获取发布版本失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`);
				return { output: `错误：GitHub API 获取发布版本失败 (状态码: ${response.status}) - ${errorText}` };
			}

			const data = await response.json();
			let latestRelease = null;
			let latestPreRelease = null;

			for (const release of data) {
				if (!release.draft) {
					if (!release.prerelease) {
						// 找到第一个非预发布版本，即为最新稳定版
						if (!latestRelease) {
							latestRelease = {
								tag_name: release.tag_name,
								name: release.name,
								published_at: release.published_at,
								html_url: release.html_url,
							};
						}
					} else {
						// 找到第一个预发布版本，即为最新预发布版
						if (!latestPreRelease) {
							latestPreRelease = {
								tag_name: release.tag_name,
								name: release.name,
								published_at: release.published_at,
								html_url: release.html_url,
							};
						}
					}
				}
				// 如果都找到了，则可以提前退出循环
				if (latestRelease && latestPreRelease) {
					break;
				}
			}

			console.log(`getGitHubRepositoryReleases 工具执行完毕。`);
			return {
				output: {
					latestRelease: latestRelease,
					latestPreRelease: latestPreRelease,
				},
			};
		} catch (fetchError) {
			console.error(`GitHub API 获取发布版本时发生网络错误: ${fetchError}, URL: ${fetchError.url || '未知'}`);
			return { output: `错误：GitHub API 获取发布版本时发生网络错误 - ${fetchError.message || '未知错误'}` };
		}
	},
};

/**
 * 封装 Gemini API 调用逻辑
 */
class GeminiApi {
	/**
	 * @param {object} env - Cloudflare Worker 的环境变量对象
	 */
	constructor(env) {
		const config = getConfig(env);
		this.genai = new GoogleGenAI({ apiKey: config.apiKey });
		this.model = config.modelName;
		this.botConfigKv = config.botConfigKv;
		this.systemPromptKey = 'system_prompt';
		this.env = env;
		this.tools = tools;
		this.toolExecutors = toolExecutors;
		this.toolExecutors.githubToken = config.githubToken; // 将 githubToken 传递给工具执行器
		this.MAX_TOOL_CALL_ROUNDS = 10; // 最大工具调用轮次
	}

	/**
	 * 调用 Gemini API 进行对话或生成内容，支持工具调用
	 * @param {Array<object>} initialContents - 初始对话历史记录 (格式取决于 Gemini SDK)
	 * @returns {Promise<object|null>} Gemini API 的最终响应对象，包含文本或工具调用结果。如果发生错误则返回 null。
	 */
	async generateContent(initialContents) {
		if (!initialContents || !Array.isArray(initialContents)) return null;
		const systemPrompt = (await kvRead(this.botConfigKv, this.systemPromptKey)) || 'You are a helpful assistant.';

		console.log(`systemPrompt: ${systemPrompt.slice(0, 200)}...`);

		// 复制初始内容，以便在工具调用时添加新消息
		let contents = [...initialContents];

		// 配置 API 请求
		const baseConfig = {
			maxOutputTokens: 65536,
			temperature: 0.3,
			thinkingConfig: {
				thinkingBudget: 24576,
			},
			tools: this.tools,
			toolConfig: {
				functionCallingConfig: {
					mode: FunctionCallingConfigMode.AUTO,
				},
			},
			responseMimeType: 'text/plain',
			systemInstruction: [
				{
					text: systemPrompt,
				},
			],
		};

		const MAX_RETRIES = 3; // 定义最大重试次数
		let retryCount = 0; // 初始化重试计数

		// 循环处理，直到 API 返回最终回复而不是工具调用
		for (let i = 0; i < this.MAX_TOOL_CALL_ROUNDS; i++) {
			console.log(`API 调用轮次: ${i + 1}, 重试次数: ${retryCount}`);
			console.log('当前发送的 contents:', JSON.stringify(contents, null, 2)); // 打印完整的 contents 可能非常长，谨慎使用

			try {
				console.log('发送 Gemini API 请求...');
				const response = await this.genai.models.generateContent({
					model: this.model,
					config: baseConfig,
					contents: contents,
				});

				console.log(`Gemini API 响应: ${JSON.stringify(response, null, 2)}`);

				const candidate = response?.candidates?.[0];

				if (!candidate || !candidate.content || !candidate.content.parts) {
					console.warn('Gemini API 返回结果不包含有效的 candidate 或 content:', JSON.stringify(response, null, 2));
					if (retryCount < MAX_RETRIES) {
						retryCount++;
						console.log(`Gemini API 响应为空，进行第 ${retryCount} 次重试...`);
						await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount)); // 每次重试间隔递增
						continue; // 继续下一次循环，进行重试
					} else {
						throw new Error(`Gemini API 未返回有效结果，已达最大重试次数 (${MAX_RETRIES})`);
					}
				}

				// 重置重试计数，因为成功获取到有效响应
				retryCount = 0;

				const parts = candidate.content.parts;
				const functionCalls = parts.filter((part) => part.functionCall);

				if (functionCalls.length > 0) {
					console.log(`检测到工具调用 (${functionCalls.length} 个)`);

					// 将模型的工具调用回复（包括文本和工具调用）添加到消息历史
					contents.push({
						role: 'model',
						parts: parts, // 添加所有 parts (包括文本和 functionCall)
					});

					const toolResponseParts = []; // 存储本次轮次所有工具的执行结果

					for (const functionCall of functionCalls) {
						const functionName = functionCall.functionCall.name;
						const functionArgs = functionCall.functionCall.args;

						if (this.toolExecutors[functionName]) {
							try {
								// 执行对应的工具函数
								// console.log(`执行工具: ${functionName}, 参数:`, functionArgs);
								// 工具执行器需要返回 { output: '...' } 格式
								const toolResult = await this.toolExecutors[functionName](functionArgs);

								// 将工具执行结果添加到 toolResponseParts 数组
								toolResponseParts.push({
									functionResponse: {
										name: functionName,
										response: toolResult, // toolResult 应该是 { output: '...' } 格式
									},
								});
								console.log(`工具 ${functionName} 执行成功，结果已记录`);
							} catch (toolError) {
								console.error(`执行工具 ${functionName} 失败:`, toolError);
								// 即使工具执行失败，也向 API 报告失败信息
								toolResponseParts.push({
									functionResponse: {
										name: functionName,
										response: {
											output: `错误：执行工具 ${functionName} 失败 - ${toolError.message || '未知错误'}`,
										},
									},
								});
							}
						} else {
							// 处理模型调用了我们未实现的工具的情况
							const errorMsg = `模型调用了未实现的工具: ${functionName}`;
							console.warn(errorMsg);
							toolResponseParts.push({
								functionResponse: {
									name: functionName,
									response: {
										output: `错误：工具 ${functionName} 未实现`,
									},
								},
							});
						}
					}

					// 将所有工具的执行结果作为用户消息发送回 API
					if (toolResponseParts.length > 0) {
						contents.push({
							role: 'user',
							parts: toolResponseParts,
						});
						console.log('工具执行结果已添加到消息历史，准备下一轮 API 调用');
					} else {
						// 如果没有任何工具被成功或失败执行（理论上不应该发生如果 model 响应有 functionCalls）
						console.warn('模型调用了工具，但没有工具执行结果被记录');
						// 这种情况下，模型可能陷入困境，直接返回一个提示或错误
						return {
							role: 'model',
							parts: [{ text: '😥 抱歉，模型尝试使用工具但未能获取结果。' }],
						};
					}
				} else {
					// 没有工具调用，提取最终的文本回复或其他内容
					const textParts = parts.filter((part) => part.text);

					if (textParts.length > 0) {
						console.log(`Gemini API request successful, returning text response.`);
						// 返回完整的响应对象，符合最终回复格式
						return {
							role: 'model',
							parts: textParts,
						};
					} else {
						// 如果既没有工具调用也没有文本回复
						console.warn('Gemini API 返回非工具调用响应，但没有文本内容或其他可处理的 parts:', JSON.stringify(response, null, 2));
						// 可以检查 finishReason，例如是否是 "STOP"
						const finishReason = candidate.finishReason;
						if (finishReason === 'STOP') {
							// 如果正常停止但内容为空，可能是模型无话可说或遇到问题
							return {
								role: 'model',
								parts: [{ text: '😥 抱歉，未能获取有效的文本回复。' }],
							};
						} else {
							// 其他 finishReason 可能需要进一步处理
							return {
								role: 'model',
								parts: [{ text: `😥 抱歉，未能获取有效的文本回复，Finish Reason: ${finishReason}` }],
							};
						}
					}
				}
			} catch (error) {
				console.error('调用 Gemini API 或处理工具调用过程中发生错误:', error);
				// 错误已在内部记录和通知，这里只需重新抛出或返回错误状态
				throw error;
			}
		}

		// 如果循环次数达到上限，仍然没有最终回复
		const errorMsg = `达到最大 API 调用轮次 (${this.MAX_TOOL_CALL_ROUNDS})，未能获取最终回复`;
		console.error(errorMsg);
		throw new Error(errorMsg);
	}
}

export default GeminiApi;
