// src/api/GeminiAPI/toolDeclarations.js

import { Type } from '@google/genai';

const tools = [
	{
		functionDeclarations: [
			{
				name: 'getAssetsContent',
				description: '根据提供的 GitHub 仓库文件路径列表，获取文件的原始内容。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'Get Assets Content Parameters',
					properties: {
						assetsPath: {
							type: Type.ARRAY,
							description:
								'需要查询的文件路径列表，例如 ["MetaCubeX/Meta-docs/refs/heads/main/docs/api/index.md", "SagerNet/sing-box/refs/heads/dev-next/src/main.go", ...]',
							items: {
								type: Type.STRING,
								title: 'Asset Path Item',
								description: '单个文件的完整路径，格式为 "owner/repo/refs/heads/branch/path/to/file.ext"',
								example: 'MetaCubeX/Meta-docs/refs/heads/main/docs/api/index.md',
							},
							minItems: 4,
							example: ['MetaCubeX/Meta-docs/refs/heads/main/docs/api/index.md', 'SagerNet/sing-box/refs/heads/dev-next/src/main.go'],
						},
					},
					required: ['assetsPath'],
				},
				response: {
					type: Type.OBJECT,
					title: 'Get Assets Content Response',
					properties: {
						assets: {
							type: Type.ARRAY,
							description: '获取到的文件内容列表。',
							items: {
								type: Type.OBJECT,
								title: 'Asset Content Item',
								properties: {
									path: {
										type: Type.STRING,
										description: '文件的完整路径。',
									},
									content: {
										type: Type.ARRAY,
										description: '文件的分割内容列表，每个元素是一个包含 "text" 字段的对象。',
										items: {
											type: Type.OBJECT,
											properties: {
												text: {
													type: Type.STRING,
													description: '分割后的文本内容。',
												},
											},
											required: ['text'],
										},
									},
									identifier: {
										type: Type.STRING,
										description: '文件的唯一标识符。',
									},
								},
								required: ['path', 'content', 'identifier'],
							},
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'searchFilesByKeyword',
				description: '根据关键词在指定的 GitHub 仓库、分支和特定路径下搜索文件内容，以获取相关文件路径。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'Search GitHub Repository Files By Keyword Parameters',
					properties: {
						keyword: {
							type: Type.STRING,
							description: '用于搜索文件内容的关键词，多个关键词请用空格分隔，例如 "路由 DNS"。',
							example: '路由 DNS',
						},
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
							example: 'SagerNet',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
							example: 'sing-box',
						},
						path: {
							type: Type.STRING,
							description: '在仓库中搜索的路径，默认为仓库根目录。例如 "docs/" 或 "frontend/src/"。此路径应相对于仓库根目录。',
							default: '',
							example: 'docs/',
						},
						branch: {
							type: Type.STRING,
							description: '要搜索的仓库分支，默认为仓库默认分支（如 main 或 master）。',
							default: 'main',
							example: 'main',
						},
					},
					required: ['keyword', 'owner', 'repo'],
				},
				response: {
					type: Type.OBJECT,
					title: 'Search GitHub Repository Files By Keyword Response',
					properties: {
						foundFiles: {
							type: Type.ARRAY,
							description: '根据关键词找到的文件路径列表。',
							items: {
								type: Type.STRING,
								title: 'Found File Path',
								description: '单个文件的完整路径。',
							},
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'listDirContents',
				description: '列出指定 GitHub 仓库、指定目录内的所有文件和子目录（只包含顶层内容）。此工具旨在辅助探索仓库指定目录的文件结构。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'List GitHub Directory Contents Parameters',
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
							example: 'SagerNet',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
							example: 'sing-box',
						},
						path: {
							type: Type.STRING,
							description: '要列出文件和子目录的路径，默认为仓库根目录。例如 "docs/configuration/"。此路径应相对于仓库根目录。',
							default: '',
							example: 'docs/configuration/',
						},
						branch: {
							type: Type.STRING,
							description: '要查询的仓库分支，默认为仓库默认分支（如 main 或 master）。',
							default: 'main',
							example: 'main',
						},
					},
					required: ['owner', 'repo'],
				},
				response: {
					type: Type.OBJECT,
					title: 'List GitHub Directory Contents Response',
					properties: {
						fileList: {
							type: Type.ARRAY,
							description: '指定目录内的文件和子目录列表。',
							items: {
								type: Type.OBJECT,
								title: 'File or Directory Item',
								properties: {
									name: {
										type: Type.STRING,
										description: '文件或目录的名称。',
									},
									path: {
										type: Type.STRING,
										description: '文件或目录的完整路径。',
									},
									type: {
										type: Type.STRING,
										description: '类型，"file" 或 "dir"。',
										enum: ['file', 'dir'],
									},
								},
								required: ['name', 'path', 'type'],
							},
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'listRepoTree',
				description: '递归列出指定 GitHub 仓库和分支下的所有文件及其完整路径。此工具旨在辅助获取仓库的完整文件结构，用于深度分析。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'List GitHub Repository Tree Parameters',
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
							example: 'SagerNet',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
							example: 'sing-box',
						},
						branch: {
							type: Type.STRING,
							description: '要查询的仓库分支，默认为仓库默认分支（如 main 或 master）。',
							default: 'main',
							example: 'main',
						},
					},
					required: ['owner', 'repo'],
				},
				response: {
					type: Type.OBJECT,
					title: 'List GitHub Repository Tree Response',
					properties: {
						fileList: {
							type: Type.ARRAY,
							description: '仓库中的所有文件和目录的递归列表。',
							items: {
								type: Type.OBJECT,
								title: 'Tree Item',
								properties: {
									name: {
										type: Type.STRING,
										description: '文件或目录的名称。',
									},
									path: {
										type: Type.STRING,
										description: '文件或目录的完整路径。',
									},
									type: {
										type: Type.STRING,
										description: '类型，"file" 或 "tree" (目录)。',
										enum: ['file', 'tree'],
									},
								},
								required: ['name', 'path', 'type'],
							},
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'listRepoDirs',
				description: '递归列出指定 GitHub 仓库和分支下的所有目录及其完整路径。此工具旨在辅助获取仓库的目录结构，用于深度分析。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'List GitHub Repository Directories Parameters',
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
							example: 'SagerNet',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
							example: 'sing-box',
						},
						branch: {
							type: Type.STRING,
							description: '要查询的仓库分支，默认为仓库默认分支（如 main 或 master）。',
							default: 'main',
							example: 'main',
						},
					},
					required: ['owner', 'repo'],
				},
				response: {
					type: Type.OBJECT,
					title: 'List GitHub Repository Directories Response',
					properties: {
						directories: {
							type: Type.ARRAY,
							description: '仓库中的所有目录的递归列表。',
							items: {
								type: Type.OBJECT,
								title: 'Directory Item',
								properties: {
									name: {
										type: Type.STRING,
										description: '目录的名称。',
									},
									path: {
										type: Type.STRING,
										description: '目录的完整路径。',
									},
									type: {
										type: Type.STRING,
										description: '类型，始终为 "tree"。',
										enum: ['tree'],
									},
								},
								required: ['name', 'path', 'type'],
							},
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'listRepoFilesInPath',
				description: '递归列出指定 GitHub 仓库、分支和特定路径下的所有文件及其完整路径。此工具旨在辅助获取特定目录下的文件列表。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'List GitHub Repository Files In Path Parameters',
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
							example: 'SagerNet',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
							example: 'sing-box',
						},
						path: {
							type: Type.STRING,
							description: '要筛选文件的相对路径，例如 "docs/configuration/"。此路径应相对于仓库根目录。',
							example: 'docs/configuration/',
						},
						branch: {
							type: Type.STRING,
							description: '要查询的仓库分支，默认为仓库默认分支（如 main 或 master）。',
							default: 'main',
							example: 'main',
						},
					},
					required: ['owner', 'repo', 'path'],
				},
				response: {
					type: Type.OBJECT,
					title: 'List GitHub Repository Files In Path Response',
					properties: {
						filesInPath: {
							type: Type.ARRAY,
							description: '指定路径下的文件列表。',
							items: {
								type: Type.OBJECT,
								title: 'File Item In Path',
								properties: {
									name: {
										type: Type.STRING,
										description: '文件的名称。',
									},
									path: {
										type: Type.STRING,
										description: '文件的完整路径。',
									},
									type: {
										type: Type.STRING,
										description: '类型，始终为 "file"。',
										enum: ['file'],
									},
								},
								required: ['name', 'path', 'type'],
							},
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'listRepoCommits',
				description: '获取指定 GitHub 仓库的最近指定次数的提交记录。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'List GitHub Repository Commits Parameters',
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
							example: 'SagerNet',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
							example: 'sing-box',
						},
						branch: {
							type: Type.STRING,
							description: '要查询的仓库分支，默认为仓库默认分支（如 main 或 master）。',
							default: 'main',
							example: 'main',
						},
						path: {
							type: Type.STRING,
							description: '筛选提交记录的路径，只返回涉及该路径的提交。例如 "docs/"。此路径应相对于仓库根目录。',
							default: '',
							example: 'docs/',
						},
						per_page: {
							type: Type.NUMBER,
							description: '每页返回的提交数量，默认为 10，最大 30。',
							default: 10,
							minimum: 1,
							maximum: 30,
							example: 10,
						},
						page: {
							type: Type.NUMBER,
							description: '页码，默认为 1。',
							default: 1,
							minimum: 1,
							example: 1,
						},
					},
					required: ['owner', 'repo'],
				},
				response: {
					type: Type.OBJECT,
					title: 'List GitHub Repository Commits Response',
					properties: {
						commits: {
							type: Type.ARRAY,
							description: '提交记录列表。',
							items: {
								type: Type.OBJECT,
								title: 'Commit Item',
								properties: {
									sha: {
										type: Type.STRING,
										description: '提交的 SHA 值。',
									},
									message: {
										type: Type.STRING,
										description: '提交信息。',
									},
									author: {
										type: Type.STRING,
										description: '提交作者。',
									},
									date: {
										type: Type.STRING,
										format: 'date-time',
										description: '提交日期。',
									},
									url: {
										type: Type.STRING,
										description: '提交的 HTML URL。',
									},
								},
								required: ['sha', 'message', 'author', 'date', 'url'],
							},
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'getCommitDetails',
				description: '获取指定 GitHub 仓库中某个提交的详细信息。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'Get GitHub Commit Details Parameters',
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
							example: 'SagerNet',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
							example: 'sing-box',
						},
						commit_sha: {
							type: Type.STRING,
							description: '要查询的提交的 SHA 值，例如 "2464ced48c504eb0dee616c6d474813621779afc"。',
							example: '2464ced48c504eb0dee616c6d474813621779afc',
						},
					},
					required: ['owner', 'repo', 'commit_sha'],
				},
				response: {
					type: Type.OBJECT,
					title: 'Get GitHub Commit Details Response',
					properties: {
						commitDetails: {
							type: Type.OBJECT,
							description: '提交的详细信息。',
							properties: {
								sha: {
									type: Type.STRING,
									description: '提交的 SHA 值。',
								},
								author: {
									type: Type.OBJECT,
									properties: {
										name: {
											type: Type.STRING,
											description: '作者名称。',
										},
										email: {
											type: Type.STRING,
											description: '作者邮箱。',
										},
										date: {
											type: Type.STRING,
											format: 'date-time',
											description: '提交日期。',
										},
									},
									required: ['name', 'email', 'date'],
								},
								message: {
									type: Type.STRING,
									description: '提交信息。',
								},
								html_url: {
									type: Type.STRING,
									description: '提交的 HTML URL。',
								},
								stats: {
									type: Type.OBJECT,
									properties: {
										total: {
											type: Type.NUMBER,
											description: '总更改行数。',
										},
										additions: {
											type: Type.NUMBER,
											description: '新增行数。',
										},
										deletions: {
											type: Type.NUMBER,
											description: '删除行数。',
										},
									},
									required: ['total', 'additions', 'deletions'],
								},
								files: {
									type: Type.ARRAY,
									description: '更改的文件列表。',
									items: {
										type: Type.OBJECT,
										properties: {
											filename: {
												type: Type.STRING,
												description: '文件名。',
											},
											status: {
												type: Type.STRING,
												description: '文件状态（例如 "added", "modified", "removed"）。',
											},
											additions: {
												type: Type.NUMBER,
												description: '文件新增行数。',
											},
											deletions: {
												type: Type.NUMBER,
												description: '文件删除行数。',
											},
											changes: {
												type: Type.NUMBER,
												description: '文件总更改行数。',
											},
											patch: {
												type: Type.STRING,
												description: '文件的 diff 信息。',
											},
										},
										required: ['filename', 'status', 'additions', 'deletions', 'changes'],
									},
								},
							},
							required: ['sha', 'author', 'message', 'html_url', 'stats', 'files'],
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'getRepoReleases',
				description: '获取指定 GitHub 仓库的最新稳定发布版本（Latest Release）和最新预发布版本（Latest Pre-release）信息。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'Get GitHub Repository Releases Parameters',
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
							example: 'SagerNet',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
							example: 'sing-box',
						},
					},
					required: ['owner', 'repo'],
				},
				response: {
					type: Type.OBJECT,
					title: 'Get GitHub Repository Releases Response',
					properties: {
						latestRelease: {
							type: Type.OBJECT,
							nullable: true,
							description: '最新的稳定发布版本信息。如果不存在，则为 null。',
							properties: {
								tag_name: {
									type: Type.STRING,
									description: '发布版本的标签名称。',
								},
								name: {
									type: Type.STRING,
									description: '发布版本的名称。',
								},
								published_at: {
									type: Type.STRING,
									format: 'date-time',
									description: '发布时间。',
								},
								html_url: {
									type: Type.STRING,
									description: '发布版本的 HTML URL。',
								},
							},
							required: ['tag_name', 'name', 'published_at', 'html_url'],
						},
						latestPreRelease: {
							type: Type.OBJECT,
							nullable: true,
							description: '最新的预发布版本信息。如果不存在，则为 null。',
							properties: {
								tag_name: {
									type: Type.STRING,
									description: '预发布版本的标签名称。',
								},
								name: {
									type: Type.STRING,
									description: '预发布版本的名称。',
								},
								published_at: {
									type: Type.STRING,
									format: 'date-time',
									description: '预发布时间。',
								},
								html_url: {
									type: Type.STRING,
									description: '预发布版本的 HTML URL。',
								},
							},
							required: ['tag_name', 'name', 'published_at', 'html_url'],
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'getYoutubeVideoLink',
				description: '解析用户提供的 YouTube 视频链接，并识别视频内容。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'Get Youtube Video Link Parameters',
					properties: {
						videoUrl: {
							type: Type.STRING,
							description: 'YouTube 视频的完整 URL，例如 "https://www.youtube.com/watch?v=9hE5-98ZeCg"。',
							example: 'https://www.youtube.com/watch?v=9hE5-98ZeCg',
						},
					},
					required: ['videoUrl'],
				},
				response: {
					type: Type.OBJECT,
					title: 'Get Youtube Video Link Response',
					properties: {
						fileData: {
							type: Type.OBJECT,
							description: '用于识别的文件数据',
							properties: {
								fileUri: {
									type: Type.STRING,
									description: 'YouTube 视频的 URI。',
								},
							},
							required: ['fileUri'],
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'getOnlineMediaFile',
				description: '解析用户提供的在线媒体文件（例如图片、视频）链接，并识别文件内容。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'Get Online Media File Parameters',
					properties: {
						fileUrl: {
							type: Type.STRING,
							description: '在线媒体文件的完整 URL，例如 "https://example.com/image.jpg"。',
							example: 'https://example.com/image.jpg',
						},
						fileName: {
							type: Type.STRING,
							description: '文件的名称，例如 "my_image.jpg"。',
							example: 'my_image.jpg',
						},
						mimeType: {
							type: Type.STRING,
							description: '文件的MIME类型，例如 "image/jpeg"、"image/png"、"image/gif"、"video/mp4" 等。',
							example: 'image/jpeg',
						},
					},
					required: ['fileUrl', 'fileName', 'mimeType'],
				},
				response: {
					type: Type.OBJECT,
					title: 'Get Online Media File Response',
					properties: {
						fileData: {
							type: Type.OBJECT,
							description: '用于识别的文件数据。',
							properties: {
								fileUri: {
									type: Type.STRING,
									description: '在线媒体文件的 URI。',
								},
								mimeType: {
									type: Type.STRING,
									description: '在线媒体文件的 MIME 类型。',
								},
							},
							required: ['fileUri', 'mimeType'],
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
		],
	},
];

export default tools;
