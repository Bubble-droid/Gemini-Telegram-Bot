// src/api/GeminiAPI/toolDeclarations.js

import { Type } from '@google/genai';

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
		name: 'getGitHubCommitDetails',
		description: '获取指定 GitHub 仓库中某个提交的详细信息。',
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
				commit_sha: {
					type: Type.STRING,
					description: '要查询的提交的 SHA 值，例如 "2464ced48c504eb0dee616c6d474813621779afc"。',
				},
			},
			required: ['owner', 'repo', 'commit_sha'],
		},
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
	{
		name: 'getOnlineMediaFile',
		description: '获取在线媒体文件（例如图片、视频），此工具适用于处理用户提供的在线媒体链接。',
		parameters: {
			type: Type.OBJECT,
			properties: {
				fileUrl: {
					type: Type.STRING,
					description: '在线媒体文件的完整URL，例如 "https://example.com/image.jpg"。',
				},
				fileName: {
					type: Type.STRING,
					description: '文件的名称，例如 "my_image.jpg"。',
				},
				mimeType: {
					type: Type.STRING,
					description: '文件的MIME类型，例如 "image/jpeg"、"image/png"、"image/gif"、"video/mp4" 等。',
				},
			},
			required: ['fileUrl', 'fileName', 'mimeType'],
		},
	},
];

export default tools;
