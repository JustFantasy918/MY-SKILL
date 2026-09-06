---
name: shao-weihua-destiny
description: >-
  Shao Weihua BaZi destiny analysis system based on Four Pillars theory. Provides
  BaZi charting, Ten Gods calculation, day master strength analysis, useful god
  selection, major luck cycles, and comprehensive destiny reports. Triggers on
  mentions of BaZi, four pillars, destiny analysis, five elements, ten gods,
  luck cycles, useful god, day master strength, or Shao Weihua.
version: 1.0.0
agent_created: true
---

# 邵伟华四柱命理分析系统

> 基于邵伟华《四柱预测学》理论体系的命理分析指引。
> 本技能仅供文化研究用途，命理学非科学，不构成任何人生决策依据。

## 免责声明（红线）

- 命理学属于传统文化研究范畴，非科学验证的预测方法
- 分析结果仅供参考，禁止用于医疗、法律、投资等重大决策
- 禁止编造命理结论：仅使用本技能 references 中收录的蒸馏理论
- 禁止替代专业建议：涉及健康/法律/财务问题时引导用户咨询专业人士

## 使用场景

1. **排盘请求**："帮我排个八字""算一下四柱" → 调用 scripts/analyze.js 排盘
2. **旺衰分析**："我的日干旺不旺""身旺还是身弱" → 读 theory-wangshuai.md + 排盘
3. **用神选取**："我的用神是什么""适合什么五行" → 读 theory-yongshen.md + 排盘
4. **大运流年**："我接下来走什么运""今年运势怎么样" → 读 theory-dayun-liunian.md + 排盘
5. **十神心性**："我的性格怎么样""十神代表什么" → 读 theory-shishen.md
6. **理论问答**："五行相生相克是什么""十神怎么定义" → 读对应 theory-*.md
7. **完整分析**："帮我做一个完整的命理分析" → 读 prediction-workflow.md + 全流程排盘

## 协作关系

本技能是自包含的命理分析工具，不依赖其他技能。

| 步骤 | 职责 |
|------|------|
| 1. 理论指引 | 读对应 reference 文件提供理论框架 |
| 2. 排盘计算 | 调用 scripts/analyze.js 执行四柱排盘 |
| 3. 结果解读 | 用 references 中的理论解读排盘结果 |
| 4. 综合报告 | 按 prediction-workflow.md 的12步流程生成报告 |

## 场景索引（按问题类型选 reference）

**排盘/基础**:
- "帮我排八字" → 调用 scripts/analyze.js，无需读 reference
- "五行相生相克" → 读 `theory-yinyang-wuxing.md`
- "干支怎么排" → 读 `theory-sizhu-paipan.md`

**十神/心性**:
- "十神是什么" → 读 `theory-shishen.md`
- "我的性格分析" → 读 `theory-shishen.md` + 排盘

**旺衰/用神**:
- "身旺身弱" → 读 `theory-wangshuai.md` + 排盘
- "用神选取" → 读 `theory-yongshen.md` + 排盘

**大运/流年**:
- "大运排列" → 读 `theory-dayun-liunian.md` + 排盘
- "流年吉凶" → 读 `theory-dayun-liunian.md` + 排盘

**完整流程**:
- "完整命理分析" → 读 `prediction-workflow.md` + 全流程

## 使用规则

1. **先读理论再排盘**：理论性问题先读对应 reference，排盘类需求先排盘再读理论解读
2. **条件化分析**：所有判断必须条件化（"若日干得令则偏向身旺"），不给绝对结论
3. **保留理论出处**：解读时标注"根据邵伟华理论体系"
4. **免责提示**：每次分析结果末尾附免责声明

## 核心理论速查表

| 维度 | 核心内容 | 对应 reference |
|------|---------|---------------|
| 阴阳五行 | 相生相克、五行之性、十二长生 | theory-yinyang-wuxing.md |
| 四柱排盘 | 年月日时柱排法、纳音 | theory-sizhu-paipan.md |
| 十神 | 定义、生克、旺衰、心性、主事 | theory-shishen.md |
| 日干旺衰 | 得令、得地、得生、得助 | theory-wangshuai.md |
| 用神 | 扶抑、通关、调候、救应 | theory-yongshen.md |
| 大运流年 | 顺逆排、起运数、岁运吉凶 | theory-dayun-liunian.md |
| 预测流程 | 12步完整流程 | prediction-workflow.md |

## scripts/analyze.js 使用方法

```bash
# 基础排盘
node scripts/analyze.js --year 1990 --month 6 --day 15 --hour 10 --gender male

# 完整分析
node scripts/analyze.js --year 1990 --month 6 --day 15 --hour 10 --gender male --full
```

输出 JSON 格式的排盘和分析结果，可直接用于解读。
