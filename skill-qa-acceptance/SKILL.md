---
name: skill-qa-acceptance
description: Skill 质量验收通用工具。给任何 WorkBuddy skill 跑 8 层自动测试(结构/交叉引用/章节编号/场景覆盖度/标注规范/文档内代码块可执行性/数字一致性/官方校验),定位悬空引用、校验器误判、文档-案例数字矛盾等隐性 bug。当用户说"验收这个 skill / 测试这个 skill / 检查 skill 质量 / 跑 qa_check / 对 skill 做质量测试 / 校验新 skill / 审查 skill 是否有错"时触发。脚本位于 scripts/qa_check.py,对任意 skill 目录可执行。
version: 1.0.0
agent_created: true
---

# Skill 质量验收

对任何 WorkBuddy skill 目录跑 8 层自动测试，找出静态阅读发现不了、只有跑起来才会暴露的问题。

## 何时使用

- 刚写完一个新 skill，需要验收
- 改完一个 skill 的多个文件，需要确认无回归
- skill 文档含代码示例（公式、接口调用），需要验证示例真能跑
- skill 文档引用了其他文件 / 章节，需要确认引用未失效
- 批量检查用户级 skill 库的健康度

## 何时不使用

- skill 完全静态、无文档代码、无交叉引用 —— 用官方 `package_skill.py` 就够
- 用户只是问"skill 里 X 是什么意思"，那是阅读任务不是测试任务

## 工作流（建议顺序）

### 1. 跑默认测试（约 5 秒）

```bash
python scripts/qa_check.py <skill_path>
```

输出 8 类测试结果（网络/代码块默认跳过），快速看 PASS / FAIL。

### 2. 开启高阶测试

```bash
python scripts/qa_check.py <skill_path> --code --package
```

- `--code` 执行文档中的 python 代码块
- `--package` 额外调用官方 `package_skill.py`

### 3. 提供场景文件（推荐）

```json
// scenarios.json
{
  "持仓诊断": {
    "refs": ["risk-management", "decision-flowchart"],
    "needs": ["止损", "减仓", "量比"]
  }
}
```

```bash
python scripts/qa_check.py <skill_path> --scenarios scenarios.json
```

### 4. 解读结果

| 结果 | 含义 | 处理 |
|---|---|---|
| ✅ PASS | 该层测试通过 | — |
| ❌ FAIL | 必修 | 按 detail 提示定位修复 |
| ⚠️ WARN | 半自动检查发现可疑 | 人工判断 |
| (跳过) | 默认未跑 | 按需加参数 |

## 8 层测试一览

| 编号 | 名称 | 默认行为 | 价值 |
|---|---|---|---|
| T1 | 结构 / frontmatter 合规 | 跑 | 抓"校验器误判"类硬伤 |
| T2 | 交叉引用完整性（悬空引用） | 跑 | 抓 review 不易发现、使用时才暴露的 bug |
| T3 | 章节编号连续性 | 跑 | 抓"三-A"这类不规范编号 |
| T4 | 场景索引覆盖度 | 需 `--scenarios` | 验证 SKILL.md 推荐路径真能用 |
| T5 | 标注规范（原话/解读/推演） | 跑 | 抓引用混淆 |
| T6 | 文档内 python 代码块可执行性 | 需 `--code` | **抓"文档写了但跑不通"**（最易忽视） |
| T7 | 公式-案例数字一致性 | 跑（半自动） | 抓自相矛盾的数字 |
| T8 | 官方 package_skill 校验 | 需 `--package` | 与 WorkBuddy 发布标准对齐 |

**默认跳过 T6/T8 的原因**：T6 可能调用网络（默认不安全），T8 是更严格的官方校验（耗时）。**新 skill 必跑、回归建议至少每两周跑一次。**

## 常见问题库

详见 `references/checklist.md`，覆盖：

- 校验器把 YAML 折叠符 `>-` 的 `>` 当成非法尖括号
- 引用规范 `xxx.md 第X节` 的章节定位模式
- 数字一致性测试为何半自动（公式与案例数字判定难）
- Windows 下编码问题（脚本已用 `io.open(encoding="utf-8")` 兜底）
- 大 skill 目录（>50 文件）的扫描性能
- 自定义 `--marks` 关键词

## 典型坑（已踩过，写进 checklist）

1. **description 折叠符误判**：官方校验脚本对 description 做原始文本扫描，`>-` 里的 `>` 会被判为非法尖括号 → **新建 skill 一律用单行 description**
2. **悬空引用**：A 文件引用了 B 文件的"第八节"，但 B 没有该章节 → T2 会自动抓出
3. **代码块可执行性**：文档给的"示例"可能因网络/环境差异跑不通 → T6 用 `--code` 实测
4. **公式与案例数字矛盾**：文档里"量比 > 1.5"是放量，但案例写"量比 1.40 → 放量"——T7 会标为待人工核对
5. **三-A 这类编号**：中文一二级章节混入英文后缀，T3 会报"非规范编号"

## 一次性使用 vs 长期监控

- **一次性**：`python scripts/qa_check.py <path>` 单跑
- **周期监控**：建议在每月 skill 维护日跑全量（带 `--code --package --scenarios`）

## 已知限制

- T7 数字一致性是半自动（只能列出可疑陈述，最终判断需要人工）
- T6 默认跳过需要网络的代码块（用 `--net` 开启，需自担风险）
- 不能检测语义错误（如错别字、逻辑漏洞）——这是阅读层的事
- 对 1 个文件的小 skill 收益不大（官方 `package_skill.py` 已够）