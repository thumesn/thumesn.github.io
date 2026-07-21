# 博客写作与发布说明

这个仓库用 Hexo + Stellar 生成静态博客，GitHub Pages 从仓库根目录发布。

## 写文章

只编辑源文件，不手改生成后的 HTML。

文章源文件在：

```text
blog-source/source/_posts/
```

现在文章按专题放子目录，常用目录是：

```text
blog-source/source/_posts/llm/
blog-source/source/_posts/rl/
blog-source/source/_posts/skills/
blog-source/source/_posts/site/
```

这些子目录只用于编辑时分类；站点链接仍按文件名生成，不需要手动改 URL。

新建文章：

```bash
scripts/post.sh new "文章标题"
```

新建到某个专题目录：

```bash
scripts/post.sh new "文章标题" rl
scripts/post.sh new "文章标题" llm
scripts/post.sh new "文章标题" skills
```

查看所有文章：

```bash
scripts/post.sh list
```

输出会显示相对路径和文章标题，方便从专题目录里找文件。

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
_posts/rl/
_posts/llm/
_posts/skills/
_posts/site/
```

图片最终会统一放在：

```text
img/posts/
```

写文章时可以先把图片粘到当前文章目录，使用普通 Markdown 或 Obsidian 图片语法：

```md
![图片说明](example.png)
![[example.png]]
```

构建或发布时脚本会自动处理图片：

1. 把图片移到 `img/posts/专题目录/`
2. 把文件名改成 `文章文件名-fig-编号.ext`
3. 把文章里的引用改成站点绝对路径
4. 如果图名是空、`alt text`、截图默认名或 Obsidian 默认名，就自动改成 `图 N：文章标题`

例如：

```md
![图 1：RL 解决杀戮尖塔（一）](/img/posts/rl/rl-slay-the-spire-environment-modeling-fig-01.png)
```

如果你已经手写了有意义的图名，比如 `![速度对比](example.png)`，脚本会保留这个图名，只整理文件路径。

也可以手动整理图片，命令是：

```bash
scripts/post.sh assets
```

已经是 `/img/...` 或 `https://...` 的图片链接不会被脚本改动。

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

## 定时自动提交

Git hook 不会在保存文件时触发。需要自动提交时，可以运行定时检查脚本：

```bash
scripts/blog-autocommit.sh
```

默认每 10 分钟检查一次 `blog-source/source/` 和博客配置文件；如果有改动，就构建并提交一次。默认只会自动本地提交，不会自动推送。

如果希望每 10 分钟自动提交并推送到 GitHub Pages：

```bash
scripts/blog-autocommit.sh --push
```

如果想改检查间隔，比如每 30 分钟检查一次：

```bash
scripts/blog-autocommit.sh --push --interval 1800
```

写作时可以一直保存，脚本只会在检查点把一批改动合并成一个提交。写完后按 `Ctrl-C` 停止。

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
scripts/blog-autocommit.sh --push
```

也可以不用自动提交，写完后手动发布：

```bash
scripts/blog-publish.sh -m "add: 文章标题"
```
