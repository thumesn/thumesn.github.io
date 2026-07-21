---
layout: post
title: RL 解决杀戮尖塔2：从环境开始重新考虑
date: 2026-07-20 20:16:21
tags:
  - Reinforcement Learning
  - RL
  - Slay the Spire
  - Game AI
categories:
  - 技术
  - 强化学习
  - 杀戮尖塔
---

## 环境问题考虑

现在的环境observation 肯定是不够的，对于排队和弃牌堆没有刻画；同时对于怪物的ai，严格来说也应该会有一个大致记忆；对于特殊效果考虑编码。

问题就是序列过大导致状态空间有点过大了，纯探索的话，难以探索到最优轨迹，也难以收敛到最优轨迹。

### 状态空间
