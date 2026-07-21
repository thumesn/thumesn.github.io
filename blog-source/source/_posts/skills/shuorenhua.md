---
title: "说人话: 远离ai味"
date: 2026-07-21 16:50:00
categories:
  - 技术
  - Skills
tags:
  - Skills
  - 学习方法
  - 问题解决
---

skills 来自于[https://github.com/MrGeDiao/shuorenhua.git](https://github.com/MrGeDiao/shuorenhua.git)


## 触发条件

检查和清理中英文文本里的 AI 套路，适用于“去 AI 味”“说人话”“自然一点”“别像模板”“先标问题”这类改写和审稿需求；按场景控制力度，同时保留事实、术语、语域和责任主体。

### When to use：

在下面这些需求里使用：

- 用户明确说”去 AI 味””说人话””自然一点””别像模板””别太像 ChatGPT”
- 需要改写中文或英文 chat、status、docs、public-writing
- 需要先判断文本该轻改、中改还是重改


聊天回复
状态汇报
技术文档
公开写作
审稿/诊断
改写
判断改写力度

它还写了不要触发的情况：

在下面这些需求里不要硬套：

- 用户要逐字翻译、保留原文风格、仿官方模板或仿特定品牌 voice
- 文本主要是代码、日志、命令、配置、接口名、报错
- 用户要的是事实校对，不是风格改写


## 判断场景


chat：聊天、评论、即时回复
status：进度同步、站会、汇报、复盘摘要
docs：技术文档、说明、FAQ、事故复盘
public-writing：公众号、帖子、对外文章

基本是让模型判断，给了模型一些场景信号

```python
先判主场景，再处理局部问题。混合文本只保留一个主语域，其他语域只在必要信息层面留下
如果文本本身命中下面任一子场景，不依赖用户是否明说，也不受主场景初判限制，都要补看 Scene Packs：

  - `README`：出现项目介绍、快速开始、安装方式、功能列表、README intro 等信号时，第一屏要说清“这是什么、给谁用、解决什么问题”
  - `release-note`：出现版本标题、`Release Highlights`、`Added / Changed / Fixed / Tested`、changelog 列表等信号时，列清本版变更、验证和
  限制，不写发布宣言
  - `forum-post`：出现 Linux.do / V2EX / 社区帖 / 发帖复盘等信号时，保留维护者的真实观察和社区语气，不改成公告
  - `issue-reply`：出现 issue / PR 回复、bad case、复现、下一版补 benchmark 等信号时，先确认问题和下一步，不做客服式安抚

  子场景只负责发布目的和语气收束，不覆盖 protected spans、Tier、档位和回读规则。完整策略见 [Scene Packs](./references/scene-packs.md)。

  还有一个“混合场景处理”的原文：

  ### 混合场景处理

  如果一段文本同时命中多个场景：

  1. 先判主要用途
  2. 先划 protected spans，再以主场景的禁改项为上限
  3. 只清理次场景里明显突兀的词，不追求绝对纯化
```