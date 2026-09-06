/**
 * report.js - 综合报告生成模块
 * 基于邵伟华《四柱预测学》第13章 预测12步流程
 */

const { judgeWangShuai } = require('./wangshuai');
const { selectYongShen } = require('./yongshen');
const { getDaYunList, getCurrentDaYun, getCurrentLiuNian } = require('./dayun');
const { judgeDaYunJiXiong, judgeLiuNianJiXiong } = require('./jixiong');
const { WUXING_GAN, WUXING_ZHI, WUXING_XING, SHISHEN_XINXING, getShiShen, SHENG, KE } = require('./constants');
const { countWuxing } = require('./bazi');

/**
 * 生成完整命理报告（12步流程）
 */
function generateReport(paipanResult) {
  const { pillars, dayGan, ec, gender, extras } = paipanResult;
  const dayWx = WUXING_GAN[dayGan];

  // 第3-7步：旺衰判断
  const wangShuai = judgeWangShuai(paipanResult);

  // 第8步：用神选取
  const yongShen = selectYongShen(paipanResult, wangShuai);

  // 第10步：大运排列 + 吉凶判断
  const daYunList = getDaYunList(ec, gender);
  const currentYear = new Date().getFullYear();

  const daYunWithJX = daYunList.map(dy => {
    const jx = dy.ganzhi && dy.ganzhi.length >= 2
      ? judgeDaYunJiXiong(dy.ganzhi, yongShen.yongshen, yongShen.jishen, dayGan)
      : { score: 0, level: '平', reasons: ['起步运'] };

    const liuNianWithJX = (dy.liuNian || []).map(ln => ({
      ...ln,
      jixiong: dy.ganzhi && dy.ganzhi.length >= 2 && ln.ganzhi && ln.ganzhi.length >= 2
        ? judgeLiuNianJiXiong(ln.ganzhi, yongShen.yongshen, yongShen.jishen, jx.level, dayGan)
        : { score: 0, level: '平', combined: '平', reasons: [] }
    }));

    return { ...dy, jixiong: jx, liuNian: liuNianWithJX };
  });

  // 从带吉凶数据的列表中获取当前大运和流年
  const currentDaYun = getCurrentDaYun(daYunWithJX, currentYear);
  const currentLiuNian = getCurrentLiuNian(currentDaYun, currentYear);

  // 第12步：综合分析
  const comprehensive = generateComprehensiveAnalysis(paipanResult, wangShuai, yongShen);

  // 五行分布
  const wuxingDist = countWuxing(paipanResult);

  return {
    basic: {
      dayGan, dayWx, gender,
      ganzhi: {
        year: pillars.year.ganzhi,
        month: pillars.month.ganzhi,
        day: pillars.day.ganzhi,
        time: pillars.time.ganzhi
      },
      extras
    },
    pillars,
    wangShuai,
    yongShen,
    wuxingDist,
    daYun: daYunWithJX,
    currentDaYun,
    currentLiuNian,
    comprehensive,
    disclaimer: '命理学属于传统文化研究范畴，非科学验证的预测方法。分析结果仅供参考，不构成任何人生决策依据。'
  };
}

/**
 * 综合分析（第12步）
 * 心性、事业、财运、婚姻、健康、子女 六个维度
 */
function generateComprehensiveAnalysis(paipan, wangShuai, yongShen) {
  const { pillars, dayGan } = paipan;
  const dayWx = WUXING_GAN[dayGan];
  const wuxingDist = countWuxing(paipan);

  return {
    xinXing: analyzeXinXing(dayGan, pillars, wangShuai),
    shiYe: analyzeShiYe(paipan, dayGan, wangShuai),
    caiYun: analyzeCaiYun(paipan, dayGan, wangShuai),
    hunYin: analyzeHunYin(paipan, dayGan, wangShuai),
    jianKang: analyzeJianKang(paipan, dayWx, wuxingDist),
    ziNv: analyzeZiNv(paipan, dayGan, wangShuai)
  };
}

/**
 * 心性分析 - 日干五行之性 + 十神心性
 */
function analyzeXinXing(dayGan, pillars, wangShuai) {
  const dayWx = WUXING_GAN[dayGan];
  const wxXing = WUXING_XING[dayWx];
  const dayMasterState = wangShuai.result;

  // 找出命局中最旺的十神
  const shishenCount = {};
  ['year', 'month', 'time'].forEach(pos => {
    const ss = pillars[pos].shishenGan;
    if (ss && ss !== '日主') {
      shishenCount[ss] = (shishenCount[ss] || 0) + 1;
    }
    // shishenZhi 可能是数组（如 ["七杀","偏印"]），需展开
    const ssZhi = pillars[pos].shishenZhi;
    if (ssZhi) {
      if (Array.isArray(ssZhi)) {
        ssZhi.forEach(s => {
          if (s && typeof s === 'string') {
            shishenCount[s] = (shishenCount[s] || 0) + 0.5;
          }
        });
      } else if (typeof ssZhi === 'string') {
        shishenCount[ssZhi] = (shishenCount[ssZhi] || 0) + 0.5;
      }
    }
  });

  const topShiShen = Object.entries(shishenCount).sort((a, b) => b[1] - a[1])[0];
  const topSSName = topShiShen ? topShiShen[0] : null;
  const topSSXinXing = topSSName ? SHISHEN_XINXING[topSSName] : null;

  return {
    dayWx, wxXing, dayMasterState,
    topShiShen: topSSName,
    topSSXinXing,
    summary: `日干${dayGan}属${dayWx}，${dayWx}主${wxXing.de}，性格偏${wxXing.traits}。` +
      (topSSXinXing ? `命局中${topSSName}较旺，心性表现：${topSSXinXing.positive}。` : '') +
      `日干${dayMasterState}，${dayMasterState === '身旺' ? '个性较强，主观意识重' : '性格偏柔，容易受环境影响'}。`
  };
}

/**
 * 事业分析 - 官星旺衰
 */
function analyzeShiYe(paipan, dayGan, wangShuai) {
  const dayWx = WUXING_GAN[dayGan];
  const guanWx = Object.entries(KE).find(([k, v]) => v === dayWx)[0]; // 克我者

  let guanCount = 0;
  let guanDetails = [];
  ['year', 'month', 'day', 'time'].forEach(pos => {
    const p = paipan.pillars[pos];
    if (WUXING_GAN[p.gan] === guanWx) { guanCount++; guanDetails.push(`${pos}干${p.gan}`); }
    if (WUXING_ZHI[p.zhi] === guanWx) { guanCount += 0.5; guanDetails.push(`${pos}支${p.zhi}`); }
    p.hideGan.forEach(hg => {
      if (WUXING_GAN[hg] === guanWx) { guanCount += 0.3; }
    });
  });

  let level = '一般';
  let summary = '';
  if (guanCount >= 2) {
    level = '有力';
    summary = `官星（${guanWx}）在命局中较为有力，事业心强，有管理才能，适合从事管理、行政类工作。`;
  } else if (guanCount >= 1) {
    level = '中等';
    summary = `官星（${guanWx}）力量中等，事业稳步发展，适合稳定的职业路径。`;
  } else {
    level = '偏弱';
    summary = `官星（${guanWx}）偏弱，事业上可能缺乏约束力，适合自由职业或创业。`;
  }

  return { guanWx, guanCount, level, guanDetails, summary };
}

/**
 * 财运分析 - 财星旺衰
 */
function analyzeCaiYun(paipan, dayGan, wangShuai) {
  const dayWx = WUXING_GAN[dayGan];
  const caiWx = KE[dayWx]; // 我克者 = 财星

  let caiCount = 0;
  let caiDetails = [];
  ['year', 'month', 'day', 'time'].forEach(pos => {
    const p = paipan.pillars[pos];
    if (WUXING_GAN[p.gan] === caiWx) { caiCount++; caiDetails.push(`${pos}干${p.gan}`); }
    if (WUXING_ZHI[p.zhi] === caiWx) { caiCount += 0.5; caiDetails.push(`${pos}支${p.zhi}`); }
    p.hideGan.forEach(hg => {
      if (WUXING_GAN[hg] === caiWx) { caiCount += 0.3; }
    });
  });

  const canHandleCai = wangShuai.result === '身旺';
  let level, summary;
  if (caiCount >= 2 && canHandleCai) {
    level = '财旺身旺';
    summary = `财星（${caiWx}）有力且身旺能胜任，财运较好，有经商理财才能。`;
  } else if (caiCount >= 2 && !canHandleCai) {
    level = '财旺身弱';
    summary = `财星（${caiWx}）虽多但身弱不胜财，需注意理财，不宜过度追求物质。`;
  } else if (caiCount >= 1) {
    level = '中等';
    summary = `财星（${caiWx}）力量中等，财运平稳，适合稳健理财。`;
  } else {
    level = '偏弱';
    summary = `财星（${caiWx}）偏弱，财运平淡，不宜投机冒险。`;
  }

  return { caiWx, caiCount, level, caiDetails, summary };
}

/**
 * 婚姻分析 - 日支 + 财/官星
 */
function analyzeHunYin(paipan, dayGan, wangShuai) {
  const dayZhi = paipan.pillars.day.zhi;
  const dayZhiWx = WUXING_ZHI[dayZhi];
  const dayWx = WUXING_GAN[dayGan];

  // 日支与日干的关系
  const caiWx = KE[dayWx]; // 财星（男命代表妻）
  const guanWx = Object.entries(KE).find(([k, v]) => v === dayWx)[0]; // 官杀（女命代表夫）

  const isCaiZhi = dayZhiWx === caiWx; // 日支为财星
  const isGuanZhi = dayZhiWx === guanWx; // 日支为官星

  let summary = `日支${dayZhi}（${dayZhiWx}）`;
  if (isCaiZhi) {
    summary += `为财星位，男命妻缘较好，配偶能干。`;
  } else if (isGuanZhi) {
    summary += `为官星位，女命夫缘较好，配偶有责任心。`;
  } else if (dayZhiWx === dayWx) {
    summary += `为比劫位，夫妻个性相近，需注意沟通。`;
  } else {
    const relation = SHENG[dayZhiWx] === dayWx ? '印星位，配偶体贴关怀'
      : SHENG[dayWx] === dayZhiWx ? '食伤位，配偶才华横溢'
      : '与日干关系平淡';
    summary += `为${relation}。`;
  }

  return { dayZhi, dayZhiWx, isCaiZhi, isGuanZhi, summary };
}

/**
 * 健康分析 - 五行太过或不及
 */
function analyzeJianKang(paipan, dayWx, wuxingDist) {
  const dist = wuxingDist || countWuxing(paipan);
  const issues = [];

  // 五行太过
  for (const [wx, count] of Object.entries(dist)) {
    if (count >= 5) {
      issues.push(`${wx}过旺（${count}个）：${getHealthIssue(wx, 'tooMuch')}`);
    }
    if (count === 0) {
      issues.push(`${wx}缺失：${getHealthIssue(wx, 'missing')}`);
    }
  }

  const summary = issues.length > 0
    ? issues.join('；')
    : '五行较为均衡，无明显健康隐患。';

  return { dist, issues, summary };
}

function getHealthIssue(wx, type) {
  const issues = {
    '木': { tooMuch: '肝胆系统偏旺，易怒、头痛', missing: '肝胆系统偏弱，注意疏肝理气' },
    '火': { tooMuch: '心血管系统偏旺，失眠、口疮', missing: '心血管系统偏弱，注意保暖' },
    '土': { tooMuch: '脾胃偏旺，消化不良', missing: '脾胃偏弱，注意饮食规律' },
    '金': { tooMuch: '呼吸系统偏旺，皮肤干燥', missing: '呼吸系统偏弱，注意肺部健康' },
    '水': { tooMuch: '肾脏泌尿系统偏旺，水肿', missing: '肾脏泌尿系统偏弱，注意肾气保养' }
  };
  return (issues[wx] && issues[wx][type]) || '注意整体平衡';
}

/**
 * 子女分析 - 食伤 + 时柱
 */
function analyzeZiNv(paipan, dayGan, wangShuai) {
  const dayWx = WUXING_GAN[dayGan];
  const shiShangWx = SHENG[dayWx]; // 我生者 = 食伤

  const timePillar = paipan.pillars.time;
  let shiShangCount = 0;

  ['year', 'month', 'day', 'time'].forEach(pos => {
    const p = paipan.pillars[pos];
    if (WUXING_GAN[p.gan] === shiShangWx) shiShangCount++;
    if (WUXING_ZHI[p.zhi] === shiShangWx) shiShangCount += 0.5;
    p.hideGan.forEach(hg => {
      if (WUXING_GAN[hg] === shiShangWx) shiShangCount += 0.3;
    });
  });

  let level, summary;
  if (shiShangCount >= 2) {
    level = '子女缘厚';
    summary = `食伤（${shiShangWx}）有力，子女缘厚，子女有才华。`;
  } else if (shiShangCount >= 1) {
    level = '中等';
    summary = `食伤（${shiShangWx}）力量中等，子女关系正常。`;
  } else {
    level = '偏弱';
    summary = `食伤（${shiShangWx}）偏弱，子女缘较薄，需注重子女教育。`;
  }

  // 时柱分析
  const timeZhiWx = WUXING_ZHI[timePillar.zhi];
  const timeGanWx = WUXING_GAN[timePillar.gan];

  return {
    shiShangWx, shiShangCount, level,
    timePillar: timePillar.ganzhi,
    timeZhiWx, timeGanWx,
    summary
  };
}

module.exports = { generateReport };
