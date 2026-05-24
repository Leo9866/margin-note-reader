# Hermes Agent — 5 分钟极速版

> 适合：微信/飞书直接发、开会前 5 分钟扫、老板茶水间问的时候答
> 完整版：[REPORT_EXECUTIVE.md](./REPORT_EXECUTIVE.md) | [8 篇 Phase 文档](./README.md)

---

## 📌 一句话

```
Hermes Agent 是 Nous Research 开源的"自我改进型"通用 AI Agent,
本质是一套【生产级 Agent Harness 工程】 — 把 LLM 在真实世界
持续工作的所有工程问题都解决了一遍。MIT 协议, v0.13.0。
```

---

## 🎯 跟同类的根本差异（一张表）

| | Hermes | Claude Code | OpenAI Agents | LangChain |
|---|:---:|:---:|:---:|:---:|
| 主场景 | **通用 Agent** | 编码助手 | 应用集成 | 框架 |
| 多 provider | **109+** ✓ | Claude only | OpenAI 优先 | 100+ ✓ |
| Prompt Cache | **4 段 ★** | ✓ | 自动 | ✗ |
| Retry 矩阵 | **30+ 模式** | 较少 | 基本 | 简单 |
| Steer 延迟引导 | **✓ 独特** | ✗ | ✗ | ✗ |
| **自演进飞轮** | **✓ 独特 ★★★** | ✗ | ✗ | ✗ |
| 多 interface | **7 种** | CLI/IDE | API only | 自建 |
| 7 种执行 backend | **✓** | 仅本地 | ✗ | 部分 |
| 开源 | **MIT** | 闭源 | 部分 | MIT |

---

## ★★★ 最值得讲的差异化：自演进闭环

### 别的 Agent 是这样"变好"的：
```
   收集轨迹 → 用 SFT/RLHF/DPO 训练 → 部署新模型
   • 周期: 周/月级    • 成本: 千美元起步    • 黑盒
```

### Hermes 是这样"变好"的：
```
   每 10 轮 → fork 一个轻量 review agent → 看主对话 →
   自动写 MEMORY.md / Skill → 下次会话自动注入

   • 周期: 实时        • 成本: 1-3 美分/次   • 纯文本可审计
```

### 四种正交记忆

```
┌─────────────────┬─────────────────────────────────────────────┐
│ ① 陈述性          │ MEMORY.md / USER.md  (用户偏好/事实)         │
│ ② 程序性          │ Skills 目录  (如何做某类任务的方法)            │
│ ③ 情景            │ SQLite + FTS5  (历史对话原文)                 │
│ ④ 用户模型        │ Honcho 辩证模型  (跨会话稳定的人物画像)        │
└─────────────────┴─────────────────────────────────────────────┘
```

### 真实场景（30 秒讲完）
```
用户: "stop being so verbose, just answer"   ← 一句话
   ↓
主线程正常回答, 用户感受不到延迟
   ↓
后台 review thread (异步):
   • 看完整对话历史 + 结构化 prompt
   • 决策: 写 USER.md + patch tone-guide skill
   • 落盘
   ↓
晚上用户开新会话, 问 "Tell me about decorators"
   ↓
LLM 看到 system prompt 已含 "Prefers terse answers"
   → 直接简洁回答, 没有"让我先解释"的开场
   ↓
用户感受: "Agent 自己变好了" — 完全无感知技术细节
```

---

## 🔧 工程深度的 6 个真实证据

```
① 主循环加固
   30+ 失败模式分桶 retry, 流式 90s stale 检测, 三级 interrupt 传播

② 上下文管理
   4 Pass 压缩 (Prune→Head→Tail→LLM Summary) + Session lineage 链

③ 状态持久化
   SQLite WAL + 应用层 jittered retry (防 convoy effect) + NFS 自动降级

④ 模型抽象
   4 种 transport × 109+ provider × 5 种认证 × 4 种 key 轮换策略

⑤ 工具系统
   50+ 工具自注册 (AST 预扫描), check_fn 30s TTL 缓存, Permission Gate 三层

⑥ 多执行环境
   7 种 backend (local/docker/ssh/singularity/modal/daytona/vercel)
   ─ 同一个 terminal 工具能从 $5 VPS 跑到 GPU 集群
```

---

## 💎 8 句金句（汇报现场可直接用）

```
① "Hermes 的主循环不是 100 行的 ReAct demo, 是 600+ 行的工程化加固 —
   这就是研究 demo 和生产 harness 的差距。"

② "Hermes 即使不需要流式输出也强制走 streaming — 只为拿到一个 90 秒
   的应用层心跳, 因为 HTTP 连接保活骗不了人, 只有数据 chunk 不撒谎。"

③ "Hermes 把 system prompt 切成 4 段, stable 段挂 1h cache,
   滚动尾巴挂 5m cache — 100 轮会话的输入 token 成本压到原来 25%。"

④ "Hermes 把 LLM 失败拆成 30+ 类, 每类有独立计数 + 独立动作 —
   这不是一个 try/except retry, 是一台'失败分类机'。"

⑤ "Hermes 不靠 fine-tune 就能'越用越懂你' — 靠四种正交记忆 +
   每 10 轮一次后台 review 飞轮。这是 fine-tune 之外的、可工程化、
   可审计、可即时生效的'Agent 自演进'路径。" ★★★

⑥ "中断不是设一个布尔 — 它是三级传播: 主循环线程、并发工具 worker 池、
   递归到所有子 Agent。这是真实场景下能在 1 秒内停下 Agent 的工程结构。"

⑦ "Hermes 的并发不是激进的'能并就并' — 三层闸门: 白名单 (10 个无副作用
   读工具) + 路径前缀比较 + clarify 永久串行。"

⑧ "同一个 terminal 工具, 本地 10ms / Docker 1s / Modal 30s + 快照持久化 —
   七种执行环境一套接口, '从 $5 VPS 到 GPU 集群'的部署连续谱。"
```

---

## ✨ 给我们自己项目的 3 条核心启发

```
⭐⭐⭐ 强烈建议借鉴
─────
① 状态外置 (SQLite/文件) 而不是 in-memory
   ─► 重启容错 + 多实例并发 + 跨 interface 一致性

② 失败分类 + 差异化恢复 (不是统一 retry N 次)
   ─► 30+ 失败模式分桶, 真实生产稳定性的关键

③ Provider/模型抽象层 (不被单一厂商绑死)
   ─► 4 种 transport × 多 key 轮换 × 自动 fallback
```

---

## 🎤 现场被追问的 5 大问题（背好答案）

```
Q: Hermes 是 ReAct 吗?
A: 不是经典 ReAct, 是结构化 Tool-Calling Loop, ReAct 思想的工业产物。
   叠加 5 种现代模式: Steerable / Interruptible / Hierarchical /
   Reflective / Cached。

Q: 怎么实现"会话无限长"?
A: 不是真无限。压缩触发 Session 分裂, 老 session 关闭, 新 session
   parent_session_id 串成 DAG。用户感受像"一直在聊", 后台是链。

Q: Nudge 每 10 轮触发烧钱吗?
A: 不会。aux 模型单次 ~1-3 美分, 10 轮主对话已几十美分了, 3% 开销
   换持久演进。可关 (memory.nudge_interval=0)。

Q: 我们能照搬到自己项目吗?
A: 整体 fork 维护成本高。建议借鉴模式:
   ⭐⭐⭐ 状态外置 / 失败分类 / 模型抽象
   ⭐⭐  Frozen snapshot / 自注册 / TTL 缓存
   ⭐   自演进飞轮 / Skills 三层 / Session lineage

Q: 跟 OpenAI Assistants 比?
A: Assistants 是托管服务, Hermes 是自部署。
   • 数据控制: Hermes 全本地, Assistants 在 OpenAI
   • Provider: Hermes 109+, Assistants 仅 OpenAI
   • 演进: Hermes 自演进飞轮, Assistants 无
```

---

## 📊 一组关键数字

```
   主文件 run_agent.py:        15,700 行
   总代码规模:                   ~60K Python + 5K TS
   ─────
   LLM provider:                109+
   IM 平台:                      20+
   执行 backend:                 7
   工具数:                       50+
   失败模式分类:                  30+
   记忆 provider:                8 (Honcho/mem0/hindsight/...)
   ─────
   一份完整对话压缩节省:          ~75-85% tokens
   Prompt cache 命中后输入成本:   原 25% (4 段缓存)
   Nudge 后台 review 单次成本:    ~1-3 美分
```

---

## 一张图说完整套架构

```
   接入层      [ CLI │ TUI │ Gateway(20+IM) │ ACP │ MCP │ Cron │ Batch ]
                                  ↕
   核心        [           Agent Core (run_agent.py 15.7K 行)        ]
                                  ↕
   能力        [        50+ 工具 + Toolsets + Subagent 委派           ]
                                  ↕
   记忆 ★★★    [   MEMORY.md + USER.md + Skills + Honcho + FTS5      ]
                                  ↕
   状态        [   SQLite WAL + 4 Pass 压缩 + Session lineage         ]
                                  ↕
   执行        [   7 种 backend (local/docker/ssh/modal/daytona/...)  ]
                                  ↕
   模型        [   4 种 transport × 109+ provider × 多 key 池         ]

   横切: 配置 (Profile) + 可观测 (3 尺度) + 安全 (7 层防护)
```

---

## 📚 想深入看的话

```
   完整版汇报 (30 分钟): docs-tech/REPORT_EXECUTIVE.md     (1,236 行)
   架构总览:              docs-tech/00_ARCHITECTURE_OVERVIEW.md
   Phase 1-8 深度:        docs-tech/PHASE_X_*.md (8 篇)
   学习路线:              HERMES_LEARNING_ROADMAP.md       (11.5 天)
   HTML 阅读器:           docs-tech/index.html
                          cd docs-tech && python3 -m http.server 8000
                          → http://localhost:8000/

   ─────
   合计 16,325 行图形化技术文档, 全部基于 v0.13.0 主分支源码逐项核对
```

---

*5 分钟版完。* — 想看任何一点的源码细节都在 8 篇 Phase 文档里。
