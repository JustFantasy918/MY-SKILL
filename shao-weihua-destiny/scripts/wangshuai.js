/**
 * wangshuai.js - 日干旺衰判断模块
 * 基于邵伟华《四柱预测学》第5章 日干旺衰理论
 *
 * 四要素：得令（月令）、得地（地支根气）、得生（印星）、得助（比劫）
 * 权重：得令40% > 得地25% > 得生20% > 得助15%
 */

const {
  WUXING_GAN, WUXING_ZHI, SHENG, KE,
  CHANGSHENG, WANG_STATES, LU_REN, CANGGAN,
  getShiShen, getMotherElement
} = require('./constants');

/**
 * 主旺衰判断函数
 */
function judgeWangShuai(paipanResult) {
  const { pillars, dayGan } = paipanResult;
  const dayWx = WUXING_GAN[dayGan];

  // 1. 得令判断（月令权重最大）
  const deLing = checkDeLing(dayGan, pillars.month.zhi);

  // 2. 得地判断（其余地支根气）
  const deDi = checkDeDi(dayGan, [pillars.year.zhi, pillars.day.zhi, pillars.time.zhi]);

  // 3. 得生判断（印星生扶）
  const deSheng = checkDeSheng(dayGan, pillars);

  // 4. 得助判断（比劫帮身）
  const deZhu = checkDeZhu(dayGan, pillars);

  // 5. 统筹衡量
  const score = calculateScore(deLing, deDi, deSheng, deZhu);
  const result = score > 50 ? '身旺' : '身弱';
  const confidence = Math.abs(score - 50) < 10 ? '偏' + (score > 50 ? '旺' : '弱') : '明确';

  // 6. 克泄耗力量分析
  const keXieHao = analyzeKeXieHao(dayGan, pillars);

  return {
    dayGan, dayWx,
    deLing, deDi, deSheng, deZhu,
    keXieHao,
    score, result, confidence,
    summary: generateSummary(result, confidence, score, deLing, deDi, deSheng, deZhu)
  };
}

/**
 * 得令：日干在月支的十二长生状态
 * 邵伟华：日干旺于月支，处长生、沐浴、冠带、临官、帝旺之地为得令
 */
function checkDeLing(dayGan, monthZhi) {
  const state = CHANGSHENG[dayGan] ? CHANGSHENG[dayGan][monthZhi] : null;
  const isWang = state ? WANG_STATES.includes(state) : false;
  const isLu = LU_REN[dayGan] && LU_REN[dayGan].lu === monthZhi;
  const isRen = LU_REN[dayGan] && LU_REN[dayGan].ren === monthZhi;

  let weight = 'weak';
  if (isLu || isRen) weight = 'strong';
  else if (isWang) weight = 'medium';

  return {
    state,
    isWang,
    isLu,
    isRen,
    deLing: isWang || isLu || isRen,
    weight,
    detail: isLu ? `月支${monthZhi}为日干${dayGan}之禄，得令力强`
      : isRen ? `月支${monthZhi}为日干${dayGan}之刃，得令力强`
      : isWang ? `日干${dayGan}在月支${monthZhi}处${state}之地，得令`
      : `日干${dayGan}在月支${monthZhi}处${state || '未知'}之地，失令`
  };
}

/**
 * 得地：日干在其余地支的根气
 * 检查年支、日支、时支是否有长生、禄刃、墓库或同类五行藏干
 */
function checkDeDi(dayGan, otherZhis) {
  const dayWx = WUXING_GAN[dayGan];
  let roots = [];

  for (const zhi of otherZhis) {
    const state = CHANGSHENG[dayGan] ? CHANGSHENG[dayGan][zhi] : null;
    const isLu = LU_REN[dayGan] && LU_REN[dayGan].lu === zhi;
    const isRen = LU_REN[dayGan] && LU_REN[dayGan].ren === zhi;
    const isWangState = state && WANG_STATES.includes(state);
    const cangGan = CANGGAN[zhi] || [];
    const hasSameWx = cangGan.some(g => WUXING_GAN[g] === dayWx);

    if (isWangState || isLu || isRen || hasSameWx) {
      roots.push({
        zhi,
        state,
        isLu,
        isRen,
        hasSameWx,
        cangGan,
        detail: isLu ? `${zhi}为禄地`
          : isRen ? `${zhi}为刃地`
          : isWangState ? `${zhi}处${state}`
          : `${zhi}藏${cangGan.filter(g => WUXING_GAN[g] === dayWx).join('')}同五行`
      });
    }
  }

  let weight = 'weak';
  if (roots.length >= 2) weight = 'strong';
  else if (roots.length === 1) weight = 'medium';

  return {
    roots,
    deDi: roots.length >= 1,
    weight,
    detail: roots.length === 0 ? '其余地支无根气，失地'
      : `地支${roots.map(r => r.zhi).join('、')}有根气，得地`
  };
}

/**
 * 得生：印星（生我者）生扶
 * 检查四柱天干和地支藏干中是否有印星
 */
function checkDeSheng(dayGan, pillars) {
  const dayWx = WUXING_GAN[dayGan];
  const yinWx = getMotherElement(dayWx); // 生我者的五行
  let yinStars = [];

  // 检查天干（年干、月干、时干）
  ['year', 'month', 'time'].forEach(pos => {
    const gan = pillars[pos].gan;
    if (WUXING_GAN[gan] === yinWx) {
      yinStars.push({
        position: pos,
        gan,
        type: getShiShen(dayGan, gan),
        isHidden: false
      });
    }
  });

  // 检查地支藏干
  ['year', 'month', 'day', 'time'].forEach(pos => {
    const hideGan = pillars[pos].hideGan;
    hideGan.forEach(g => {
      if (WUXING_GAN[g] === yinWx) {
        yinStars.push({
          position: pos,
          gan: g,
          type: getShiShen(dayGan, g),
          isHidden: true
        });
      }
    });
  });

  // 印星是否有根有力（检查印星所在天干的地支是否有根）
  const yinStarsWithRoot = yinStars.filter(s => !s.isHidden || true); // 藏干本身即在支中

  let weight = 'none';
  const visibleYin = yinStars.filter(s => !s.isHidden);
  const hiddenYin = yinStars.filter(s => s.isHidden);
  if (visibleYin.length >= 1 && hiddenYin.length >= 1) weight = 'strong';
  else if (visibleYin.length >= 1 || hiddenYin.length >= 2) weight = 'medium';
  else if (hiddenYin.length >= 1) weight = 'weak';

  return {
    yinWx,
    yinStars,
    visibleCount: visibleYin.length,
    hiddenCount: hiddenYin.length,
    deSheng: yinStars.length >= 1,
    weight,
    detail: yinStars.length === 0 ? `四柱无印星（${yinWx}），不得生`
      : `印星（${yinWx}）${yinStars.length}个，得生`
  };
}

/**
 * 得助：比劫（同我者）帮身
 * 检查四柱天干和地支藏干中是否有比劫
 */
function checkDeZhu(dayGan, pillars) {
  const dayWx = WUXING_GAN[dayGan];
  let biJie = [];

  // 检查天干
  ['year', 'month', 'time'].forEach(pos => {
    const gan = pillars[pos].gan;
    if (WUXING_GAN[gan] === dayWx) {
      biJie.push({
        position: pos,
        gan,
        type: getShiShen(dayGan, gan),
        isHidden: false
      });
    }
  });

  // 检查地支藏干
  ['year', 'month', 'day', 'time'].forEach(pos => {
    const hideGan = pillars[pos].hideGan;
    hideGan.forEach(g => {
      if (WUXING_GAN[g] === dayWx) {
        biJie.push({
          position: pos,
          gan: g,
          type: getShiShen(dayGan, g),
          isHidden: true
        });
      }
    });
  });

  const visibleBJ = biJie.filter(s => !s.isHidden);
  const hiddenBJ = biJie.filter(s => s.isHidden);
  let weight = 'none';
  if (visibleBJ.length >= 1 && hiddenBJ.length >= 1) weight = 'strong';
  else if (visibleBJ.length >= 1 || hiddenBJ.length >= 2) weight = 'medium';
  else if (hiddenBJ.length >= 1) weight = 'weak';

  return {
    biJie,
    visibleCount: visibleBJ.length,
    hiddenCount: hiddenBJ.length,
    deZhu: biJie.length >= 1,
    weight,
    detail: biJie.length === 0 ? `四柱无比劫（${dayWx}），不得助`
      : `比劫（${dayWx}）${biJie.length}个，得助`
  };
}

/**
 * 克泄耗力量分析（官杀克身、食伤泄身、财星耗身）
 */
function analyzeKeXieHao(dayGan, pillars) {
  const dayWx = WUXING_GAN[dayGan];
  const keWx = KE[dayWx];       // 我克者 = 财星五行
  const xieWx = SHENG[dayWx];   // 我生者 = 食伤五行
  const haoWx = getMotherElement(dayWx); // 克我者... 不对
  // 克我者 = 官杀五行
  const guanWx = Object.entries(KE).find(([k, v]) => v === dayWx)[0];

  const result = { guanSha: 0, shiShang: 0, caiXing: 0, details: [] };

  ['year', 'month', 'day', 'time'].forEach(pos => {
    const p = pillars[pos];
    // 天干
    if (WUXING_GAN[p.gan] === guanWx) { result.guanSha++; result.details.push(`${pos}干${p.gan}为官杀`); }
    if (WUXING_GAN[p.gan] === xieWx) { result.shiShang++; result.details.push(`${pos}干${p.gan}为食伤`); }
    if (WUXING_GAN[p.gan] === keWx) { result.caiXing++; result.details.push(`${pos}干${p.gan}为财星`); }
    // 地支
    if (WUXING_ZHI[p.zhi] === guanWx) { result.guanSha++; result.details.push(`${pos}支${p.zhi}为官杀`); }
    if (WUXING_ZHI[p.zhi] === xieWx) { result.shiShang++; result.details.push(`${pos}支${p.zhi}为食伤`); }
    if (WUXING_ZHI[p.zhi] === keWx) { result.caiXing++; result.details.push(`${pos}支${p.zhi}为财星`); }
    // 藏干
    for (const hg of p.hideGan) {
      if (WUXING_GAN[hg] === guanWx) { result.guanSha += 0.5; }
      if (WUXING_GAN[hg] === xieWx) { result.shiShang += 0.5; }
      if (WUXING_GAN[hg] === keWx) { result.caiXing += 0.5; }
    }
  });

  result.total = result.guanSha + result.shiShang + result.caiXing;
  return result;
}

/**
 * 综合评分（0-100，>50偏旺，<50偏弱）
 * 权重：月令40% + 得地25% + 得生20% + 得助15%
 */
function calculateScore(deLing, deDi, deSheng, deZhu) {
  let score = 50; // 基准

  // 月令权重最大（占40分）
  if (deLing.deLing) {
    score += deLing.weight === 'strong' ? 25 : 15;
  } else {
    score -= 15;
  }

  // 得地权重次之（占25分）
  if (deDi.deDi) {
    score += deDi.weight === 'strong' ? 15 : 10;
  } else {
    score -= 10;
  }

  // 得生（占20分）
  if (deSheng.deSheng) {
    score += deSheng.weight === 'strong' ? 12 : (deSheng.weight === 'medium' ? 8 : 4);
  } else {
    score -= 5;
  }

  // 得助（占15分）
  if (deZhu.deZhu) {
    score += deZhu.weight === 'strong' ? 8 : (deZhu.weight === 'medium' ? 5 : 3);
  } else {
    score -= 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * 生成旺衰判断摘要
 */
function generateSummary(result, confidence, score, deLing, deDi, deSheng, deZhu) {
  const parts = [];
  parts.push(deLing.detail);
  parts.push(deDi.detail);
  parts.push(deSheng.detail);
  parts.push(deZhu.detail);
  parts.push(`综合评分 ${score}/100，判断为${confidence}${result}`);
  return parts.join('；');
}

module.exports = { judgeWangShuai, checkDeLing, checkDeDi, checkDeSheng, checkDeZhu, calculateScore, analyzeKeXieHao };
