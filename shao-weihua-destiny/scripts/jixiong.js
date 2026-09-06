/**
 * jixiong.js - 岁运吉凶判断模块
 * 基于邵伟华《四柱预测学》第8章 四柱大运吉凶总论
 *
 * 岁运吉凶矩阵：
 * 大运吉 + 流年吉 = 大吉
 * 大运吉 + 流年凶 = 多吉少凶
 * 大运凶 + 流年吉 = 多凶少吉
 * 大运凶 + 流年凶 = 大凶
 */

const { WUXING_GAN, WUXING_ZHI, SHENG, KE, SUIYUN_MATRIX } = require('./constants');

/**
 * 判断大运吉凶
 * @param {string} daYunGanZhi - 大运干支（如"癸未"）
 * @param {string} yongshen - 用神五行
 * @param {string} jishen - 忌神五行
 * @param {string} dayGan - 日干
 */
function judgeDaYunJiXiong(daYunGanZhi, yongshen, jishen, dayGan) {
  if (!daYunGanZhi || daYunGanZhi.length < 2) {
    return { score: 0, level: '平', reasons: ['起步运'] };
  }

  const dyGan = daYunGanZhi[0];
  const dyZhi = daYunGanZhi[1];
  const dyGanWx = WUXING_GAN[dyGan];
  const dyZhiWx = WUXING_ZHI[dyZhi];

  let score = 0;
  let reasons = [];

  // 与用神关系
  if (dyGanWx === yongshen) {
    score += 20;
    reasons.push(`运干${dyGan}(${dyGanWx})与用神(${yongshen})一致`);
  }
  if (dyZhiWx === yongshen) {
    score += 25;
    reasons.push(`运支${dyZhi}(${dyZhiWx})与用神(${yongshen})一致`);
  }

  // 与忌神关系
  if (jishen && dyGanWx === jishen) {
    score -= 20;
    reasons.push(`运干${dyGan}(${dyGanWx})与忌神(${jishen})一致`);
  }
  if (jishen && dyZhiWx === jishen) {
    score -= 25;
    reasons.push(`运支${dyZhi}(${dyZhiWx})与忌神(${jishen})一致`);
  }

  // 大运干支相生为佳
  if (SHENG[dyGanWx] === dyZhiWx) {
    score += 10;
    reasons.push(`运干支相生（${dyGanWx}生${dyZhiWx}）为佳`);
  }
  // 大运干支相克不利
  if (KE[dyGanWx] === dyZhiWx) {
    score -= 10;
    reasons.push(`运干支相克（${dyGanWx}克${dyZhiWx}）不利`);
  }

  // 运干生扶日干
  const dayWx = WUXING_GAN[dayGan];
  if (SHENG[dyGanWx] === dayWx) {
    score += 5;
    reasons.push(`运干${dyGan}生扶日干`);
  }

  const level = scoreToLevel(score);
  return { score, level, reasons, ganWx: dyGanWx, zhiWx: dyZhiWx };
}

/**
 * 判断流年吉凶
 */
function judgeLiuNianJiXiong(lnGanZhi, yongshen, jishen, daYunLevel, dayGan) {
  if (!lnGanZhi || lnGanZhi.length < 2) {
    return { score: 0, level: '平', combined: '平', reasons: [] };
  }

  const lnGan = lnGanZhi[0];
  const lnZhi = lnGanZhi[1];
  const lnGanWx = WUXING_GAN[lnGan];
  const lnZhiWx = WUXING_ZHI[lnZhi];

  let score = 0;
  let reasons = [];

  if (lnGanWx === yongshen) {
    score += 15;
    reasons.push(`流年干${lnGan}(${lnGanWx})与用神一致`);
  }
  if (lnZhiWx === yongshen) {
    score += 20;
    reasons.push(`流年支${lnZhi}(${lnZhiWx})与用神一致`);
  }
  if (jishen && lnGanWx === jishen) {
    score -= 15;
    reasons.push(`流年干${lnGan}(${lnGanWx})与忌神一致`);
  }
  if (jishen && lnZhiWx === jishen) {
    score -= 20;
    reasons.push(`流年支${lnZhi}(${lnZhiWx})与忌神一致`);
  }

  const lnLevel = scoreToLevel(score);
  const combined = combineDaYunLiuNian(daYunLevel, lnLevel);

  return { score, level: lnLevel, combined, reasons, ganWx: lnGanWx, zhiWx: lnZhiWx };
}

/**
 * 评分转等级
 */
function scoreToLevel(score) {
  if (score >= 35) return '吉';
  if (score >= 15) return '小吉';
  if (score >= -15) return '平';
  if (score >= -35) return '小凶';
  return '凶';
}

/**
 * 岁运组合矩阵
 * 邵伟华：大运吉+流年吉=大吉，大运凶+流年凶=大凶
 */
function combineDaYunLiuNian(dyLevel, lnLevel) {
  const key = `${dyLevel}+${lnLevel}`;
  return SUIYUN_MATRIX[key] || '平';
}

module.exports = { judgeDaYunJiXiong, judgeLiuNianJiXiong, combineDaYunLiuNian, scoreToLevel };
