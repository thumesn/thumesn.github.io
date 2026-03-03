# Post 编辑工作流

以后请只编辑 **post 源文件**，不要直接改生成后的 `2026/.../index.html`。

## 1) 文章源文件位置

- `blog-source/source/_posts/*.md`

例如这篇：
- `blog-source/source/_posts/qwen2-5-report-reading.md`

## 2) 常用命令（在仓库根目录）

```bash
# 列出所有可编辑 post
scripts/post.sh list

# 新建文章（Hexo 会自动生成 front-matter）
scripts/post.sh new "你的文章标题"

# 生成静态站点到 blog-source/public
scripts/post.sh build

# 本地预览
scripts/post.sh server
```

## 3) 发布说明

当前仓库根目录是发布产物目录；`blog-source` 是源码目录。

- 你改 `post` 后，先 `scripts/post.sh build`。
- 再把需要发布的产物同步到根目录并提交推送。

如果你愿意，我可以再给你加一条“自动同步 public -> 根目录”的安全脚本。
