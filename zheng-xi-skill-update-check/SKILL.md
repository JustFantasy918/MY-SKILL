---
name: zheng-xi-skill-update-check
description: 郑希（易方达基金经理）新材料检查与 zheng-xi-investment-philosophy skill 更新工作流。当用户要求"检查郑希新材料 / 更新郑希 skill / 郑希最新观点检查 / 郑希手记检查"，或月度自动化任务触发时使用。覆盖：搜索新公开材料（季报/手记/专访）→ 获取全文 → 对比现有 skill reference → 输出更新建议报告 → （用户确认后）执行更新。触发词：郑希新材料、郑希 skill 更新、检查郑希、更新郑希理念、郑希季报检查。
version: 1.0.1
agent_created: true
---

# 郑希 Skill 更新检查工作流

## 概述

本 skill 固化了"检查郑希新公开材料并更新 zheng-xi-investment-philosophy skill"的完整流程。目标 skill 位于 `~/.workbuddy/skills/zheng-xi-investment-philosophy/`（当前版本 1.2.2，含 **9 个文件：SKILL.md + 8 个 reference**）。

> ⚠️ **文件数会变**：新增/删除 reference 后必须回来同步本行与各处计数（历史错误：曾写"7 个文件 + 6 个 reference"，实际漏算 `decision-flowchart.md`）。每次更新后以 `ls references/ | wc -l` 实际核对。

**核心原则**：默认只搜索、对比、汇报，**不自动修改目标 skill 文件**；仅在用户明确确认（如"更新吧"）后才执行更新。

## 工作流总览

```
Phase 0 准备 → Phase 1 搜索 → Phase 2 获取全文 → Phase 3 对比 → Phase 4 汇报
                                                                    ↓ 用户确认
                                                          Phase 5 执行更新 → Phase 6 收尾
```

---

## Phase 0：准备工作

1. 若由自动化任务触发，先读 `.workbuddy/automations/automation-1782319988644/memory.md` 了解上次检查结果与"下次检查提示"。
2. 读目标 skill 的 `SKILL.md`，记录当前版本号。
3. 浏览 `~/.workbuddy/skills/zheng-xi-investment-philosophy/references/` 各文件，重点看各文件中带时间标注的内容（如"切换节奏参考"最后更新到哪个季度）——这些是对比的基线。

## Phase 1：搜索新材料

按 `references/data-sources.md` 执行：

1. **官网页面**：WebFetch `https://www.efunds.com.cn/manager/462.shtml`，提取所有基金经理手记、媒体报道、定期报告的标题和日期，与记忆中的已知列表对比找新增。
2. **定期报告**：根据当前日期对照披露日历（见 data-sources.md），WebFetch 最近一期报告全文，URL 模式为 `https://www.efunds.com.cn/manager/report/{年份}/{期数编码}/462_max.shtml`。
3. **网络搜索**：用 data-sources.md 中验证过的关键词组合搜索新专访/报道，关键词须包含"郑希 易方达"+ 具体时段（如"2026年8月"）。
4. **重点提示**：季报披露日（约 4/22、7/21、8/31、10 月下旬、次年 3/31）前后必有新材料；若检查日恰逢披露日，优先抓新披露报告。

## Phase 2：获取全文

对每份新材料用 WebFetch 提取全文，重点提取：

- **定期报告**：投资策略和运作分析部分全部内容（市场回顾、行业分析、展望、操作策略）
- **调仓数据**：前十大重仓股变动（新进/调出）、11-20 大重仓股、QDII 产品持仓
- **专访**：投资理念原话（用引号精确保存）、类比、金句
- **注意**：东方财富/头条等页面若 WebFetch 失败，可换用 WebSearch 找同内容的其他来源

## Phase 3：对比现有 skill

逐文件对比（各文件职责见 `references/update-procedure.md`）：

| 对比维度 | 检查什么 |
|---------|---------|
| 核心哲学 | 是否出现新的方法论表述/世界观（如"景气成长投资框架"） |
| 板块观点 | 是否有新板块（如半导体设备、商业航天）、旧板块观点变化 |
| 景气周期 | 拼接案例是否滞后（现有内容最后更新到哪个季度）、新景气信号 |
| 原话类比 | 新专访中的原话/类比是否已收录 |
| 选股风控 | 新的筛选条件、退出机制、持仓数据（集中度等） |
| 职业动态 | 管理规模、新基金产品、职务变化 |

**关键判断**：调仓实操比观点更有价值——如果郑希的实际持仓验证了某个观点（如 2026H1 重仓转向半导体上游），该观点从"观点"升级为"已验证操作"，必须更新。

## Phase 4：汇报（此阶段不修改任何目标 skill 文件）

按以下结构输出报告（模板见 `references/update-procedure.md`）：

1. **新材料列表**（表格：来源/日期/核心内容）
2. **新增/变更要点**（分文件对比表，标注现有 skill 状态和重要性 ⭐）
3. **更新优先级建议**（P0 必须 / P1 建议 / P2 可选，对应到具体文件）
4. **结尾请用户确认**：明确说明"等待确认后才动手"

## Phase 5：执行更新（仅用户确认后）

按 `references/update-procedure.md` 执行，核心规则：

- 按优先级依次更新文件（P0 先做）
- **原话与媒体解读严格分开收录**：郑希原话/官方表述可直接引用；媒体解读（如"AI上半场连接/下半场制造端"）必须标注"非郑希原话"
- 更新目标 skill 的 SKILL.md：版本号 minor +1（如 1.1.0→1.2.0），速查表同步新增维度
- 带时间序列的内容（切换节奏、拼接案例）采用**追加**而非替换，保留历史脉络

## Phase 6：收尾

1. 更新自动化记忆 `.workbuddy/automations/automation-1782319988644/memory.md`：记录本次执行摘要、"下次检查提示"（下期报告披露时间及重点验证事项）
2. 向项目当日工作日志 `.workbuddy/memory/YYYY-MM-DD.md` 追加一条记录
3. 用 present_files 展示所有更新过的文件
4. 向用户汇报：各文件更新内容摘要 + 引用规范说明 + 下次检查提示

## Resources

- `references/data-sources.md`——数据源清单：官网 URL 模式、定期报告披露日历、验证有效的搜索关键词、媒体来源
- `references/update-procedure.md`——目标 skill 文件职责、对比报告模板、更新规则（版本号/原话标注/收尾流程）
