/**
 * yongshen.js - 用神选取模块
 * 基于邵伟华《四柱预测学》第7章 四柱补救理论
 *
 * 三原则：扶抑、通关、调候
 * 优先级：调候 > 通关 > 扶抑
 */

const { WUXING_GAN, WUXING_ZHI, SHENG, KE, getMotherElement } = require('./constants');
const { countWuxing } = require('./bazi');

/**
 * 主用神选取函数
 */
function selectYongShen(paipanResult, wangShuaiResult) {
  const { dayGan, pillars } = paipanResult;
  const dayWx = WUXING_GAN[dayGan];
  const { result: wangShuai, score } = wangShuaiResult;

  // 1. 调候法判断
  const tiaoHou = checkTiaoHou(paipanResult, dayWx);

  // 2. 通关法判断
  const tongGuan = checkTongGuan(paipanResult, dayWx);

  // 3. 扶抑法判断
  const fuYi = applyFuYi(dayWx, wangShuai);

  // 4. 综合选取用神
  const decision = determineYongShen(tiaoHou, fuYi, tongGuan, wangShuai);

  // 5. 推导喜忌仇神
  const yongshen = decision.element;
  const xishen = getMotherElement(yongshen);  // 喜神 = 生用神者
  const jishen = KE[yongshen] ? Object.entries(KE).find(([k, v]) => v === yongshen)[0] : null; // 忌神 = 克用神者
  const choushen = jishen ? getMotherElement(jishen) : null; // 仇神 = 生忌神者

  return {
    yongshen,
    xishen,
    jishen,
    choushen,
    method: decision.method,
    reasoning: decision.reasoning,
    tiaoHou,
    fuYi,
    tongGuan,
    wangShuai,
    score,
    summary: generateSummary(decision, yongshen, xishen, jishen, choushen)
  };
}

/**
 * 调候法：根据月令判断寒暖燥湿
 * 邵伟华：夏月生人偏暖过燥，取水调候；冬月生人过寒偏湿，取火调候
 */
function checkTiaoHou(paipanResult, dayWx) {
  const monthZhi = paipanResult.pillars.month.zhi;
  // 夏月（巳午未）：火旺，取水调候
  const isHot = ['巳', '午', '未'].includes(monthZhi);
  // 冬月（亥子丑）：水旺，取火调候
  const isCold = ['亥', '子', '丑'].includes(monthZhi);

  if (isHot) {
    return {
      needed: true,
      element: '水',
      reason: `月支${monthZhi}属夏月，火旺偏燥，取水调候降温`,
      monthZhi
    };
  }
  if (isCold) {
    return {
      needed: true,
      element: '火',
      reason: `月支${monthZhi}属冬月，水旺偏寒，取火调候暖局`,
      monthZhi
    };
  }
  return {
    needed: false,
    element: null,
    reason: `月支${monthZhi}属春秋季节，寒暖适候，无需特别调候`,
    monthZhi
  };
}

/**
 * 扶抑法：根据旺衰取用
 * 身弱：取印星（生我）和比劫（同我）为用
 * 身旺：取官杀（克我）、食伤（我生）、财星（我克）为用
 */
function applyFuYi(dayWx, wangShuai) {
  const yinWx = getMotherElement(dayWx); // 印星五行 = 生我者
  const shiShangWx = SHENG[dayWx];       // 食伤五行 = 我生者
  const caiWx = KE[dayWx];               // 财星五行 = 我克者
  const guanWx = Object.entries(KE).find(([k, v]) => v === dayWx)[0]; // 官杀五行 = 克我者

  if (wangShuai === '身旺') {
    // 身旺：取克泄耗
    return {
      wangShuai: '身旺',
      direction: '抑',
      options: [
        { element: guanWx, method: '克（官杀）', priority: 1, reason: `官杀（${guanWx}）克身，抑制日干过旺` },
        { element: shiShangWx, method: '泄（食伤）', priority: 2, reason: `食伤（${shiShangWx}）泄日干之气` },
        { element: caiWx, method: '耗（财星）', priority: 3, reason: `财星（${caiWx}）耗日干之力` }
      ]
    };
  } else {
    // 身弱：取生扶
    return {
      wangShuai: '身弱',
      direction: '扶',
      options: [
        { element: yinWx, method: '生（印星）', priority: 1, reason: `印星（${yinWx}）生扶日干` },
        { element: dayWx, method: '扶（比劫）', priority: 2, reason: `比劫（${dayWx}）帮身助日干` }
      ]
    };
  }
}

/**
 * 通关法：命局两种五行对立相战时，取能化解的五行通关
 * 火金相战→土通关；水火相战→木通关；金木相战→水通关；土水相战→金通关；木土相战→火通关
 */
function checkTongGuan(paipanResult, dayWx) {
  const wxCount = countWuxing(paipanResult);
  // 相克的对
  const opposingPairs = [
    ['木', '土'], ['水', '火'], ['金', '木'], ['土', '水'], ['火', '金']
  ];

  for (const [a, b] of opposingPairs) {
    // 两五行都较多时才算对立
    if (wxCount[a] >= 3 && wxCount[b] >= 3) {
      // 找通关五行：a生X、X生b 或 b生X、X生a
      const bridge = findBridge(a, b);
      if (bridge) {
        return {
          needed: true,
          element: bridge,
          pair: [a, b],
          reason: `${a}与${b}相战（${a}=${wxCount[a]}，${b}=${wxCount[b]}），取${bridge}通关化解`
        };
      }
    }
  }
  return {
    needed: false,
    element: null,
    reason: '命局无明显五行对立，无需通关'
  };
}

/**
 * 找通关五行
 * a克b时，找X使 a生X、X生b
 */
function findBridge(a, b) {
  // 检查所有五行
  for (const wx of ['木', '火', '土', '金', '水']) {
    if (wx === a || wx === b) continue;
    // a生wx 且 wx生b
    if (SHENG[a] === wx && SHENG[wx] === b) return wx;
    // b生wx 且 wx生a
    if (SHENG[b] === wx && SHENG[wx] === a) return wx;
  }
  return null;
}

/**
 * 综合确定用神
 * 优先级：调候 > 通关 > 扶抑
 */
function determineYongShen(tiaoHou, fuYi, tongGuan, wangShuai) {
  // 调候优先
  if (tiaoHou.needed) {
    return {
      element: tiaoHou.element,
      method: '调候法',
      reason: tiaoHou.reason
    };
  }
  // 通关次之
  if (tongGuan.needed) {
    return {
      element: tongGuan.element,
      method: '通关法',
      reason: tongGuan.reason
    };
  }
  // 扶抑兜底
  const first = fuYi.options[0];
  return {
    element: first.element,
    method: '扶抑法',
    reason: `${wangShuai}，${first.reason}，取${first.element}为用神`
  };
}

/**
 * 生成用神选取摘要
 */
function generateSummary(decision, yongshen, xishen, jishen, choushen) {
  return `选取方法：${decision.method}。${decision.reason}。` +
    `用神：${yongshen}，喜神：${xishen}，忌神：${jishen || '无'}，仇神：${choushen || '无'}。`;
}

module.exports = { selectYongShen, checkTiaoHou, applyFuYi, checkTongGuan, findBridge, determineYongShen };
