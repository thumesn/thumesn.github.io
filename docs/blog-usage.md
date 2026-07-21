# 博客写作与发布说明

这个仓库用 Hexo + Stellar 生成静态博客，GitHub Pages 从仓库根目录发布。

## 写文章

只编辑源文件，不手改生成后的 HTML。

文章源文件在：

```text
blog-source/source/_posts/
```

新建文章：

```bash
scripts/post.sh new "文章标题"
```

本地构建：

```bash
scripts/post.sh build
```

本地预览：

```bash
scripts/post.sh server
```

## Obsidian / VSCode 写作

推荐把 Obsidian vault 打开到：

```text
/home/chaofeng/thumesn.github.io/blog-source/source
```

文章写在：

```text
_posts/
```

图片统一放在：

```text
img/posts/
```

文章里用绝对路径引用图片：

```md
![图片说明](/img/posts/example.png)
```

不要使用 Obsidian 默认的 wikilink 图片格式：

```md
![[Pasted image.png]]
```

也尽量不要用相对路径引用图片。Hexo 生成后文章 URL 会变成 `/2026/07/21/.../`，相对路径容易失效。

## 一键提交并发布

写完后运行：

```bash
scripts/blog-publish.sh -m "add: 文章标题"
```

这个脚本会做四件事：

1. 执行 Hexo 构建
2. 把 `blog-source/public/` 同步到仓库根目录
3. 暂存博客相关文件并提交
4. 推送到当前分支，触发 GitHub Pages 发布

只想本地提交，不想推送：

```bash
scripts/blog-publish.sh --no-push -m "draft: 文章标题"
```

默认只暂存博客相关路径，避免把无关改动一起提交。确实要提交全部改动时再使用：

```bash
scripts/blog-publish.sh --all -m "update site"
```

## Git Hook

安装本地 git hook：

```bash
scripts/install-blog-hooks.sh
```

安装后，手动执行 `git commit` 时，如果暂存区包含 `blog-source/`、`scripts/` 或 `docs/` 的改动，pre-commit hook 会自动构建并同步静态页面，再把生成结果加入这次提交。

这能避免“只提交了 Markdown，忘记提交生成后的 HTML”的问题。

## 保存后自动提交

Git hook 不会在保存文件时触发。要实现“每次保存自动提交”，需要运行文件监听脚本：

```bash
scripts/blog-autocommit.sh
```

默认模式只会自动本地提交，不会自动推送。这样适合写作时频繁保存，避免每次保存都触发 GitHub Pages 部署。

如果你确实希望每次保存后都提交并推送：

```bash
scripts/blog-autocommit.sh --push
```

建议只在短时间集中写作时开启自动提交，写完后按 `Ctrl-C` 停止。

## 推荐日常流程

最稳的日常方式：

```bash
scripts/post.sh new "文章标题"
# 用 Obsidian 或 VSCode 编辑 Markdown
scripts/post.sh build
scripts/blog-publish.sh -m "add: 文章标题"
```

如果正在连续写作：

```bash
scripts/blog-autocommit.sh
```

写完确认没问题后：

```bash
git push origin master
```
