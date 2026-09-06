/**
 * suggestions.js - 可执行建议生成器
 * 消费 translator 结果，生成"穿什么/朝哪边/做啥"的可执行清单
 */

var { WUXING_LUCKY, YONGSHEN_LIFESTYLE } = require('./translator');

/**
 * 生成可执行建议
 */
function generateSuggestions(report) {
  var ys = report.yongShen;
  if (!ys || !ys.yongshen) return null;

  var yongshenWx = ys.yongshen;
  var lucky = WUXING_LUCKY[yongshenWx] || {};
  var lifestyle = YONGSHEN_LIFESTYLE[yongshenWx] || {};
  var jishenWx = ys.jishen;

  return {
    luckyColors: buildLuckyColors(lucky),
    luckyNumbers: lucky.numbers || [],
    directions: buildDirections(lucky),
    industries: lucky.industries || [],
    accessories: buildAccessories(lucky),
    fengshui: buildFengshui(lucky),
    health: buildHealthAdvice(lucky, report),
    relationship: buildRelationshipAdvice(report),
    dailyHabits: buildDailyHabits(lifestyle, lucky),
    avoidAdvice: buildAvoidAdvice(jishenWx)
  };
}

/**
 * 幸运色（三场景）
 */
function buildLuckyColors(lucky) {
  if (!lucky.colors) return null;
  var wxColorMap = { '木':'#28a745', '火':'#dc3545', '土':'#ffc107', '金':'#6c757d', '水':'#007bff' };
  // 通过 industries 反推五行色不方便，直接从 lucky 对象外层传
  return {
    outfit: { desc: lucky.colors.outfit, tip: '日常穿搭优先选这些颜色' },
    home: { desc: lucky.colors.home, tip: '家居软装、床品、摆件可用这些色调' },
    workplace: { desc: lucky.colors.workplace, tip: '办公环境、名片、PPT可用这些颜色' }
  };
}

/**
 * 吉利方位
 */
function buildDirections(lucky) {
  return {
    desk: lucky.direction || '—',
    wealth: lucky.direction || '—',
    tip: '书桌、办公桌尽量面向此方位；重要的会议可选此方位入座'
  };
}

/**
 * 配饰建议
 */
function buildAccessories(lucky) {
  if (!lucky.accessories) return null;
  return {
    list: lucky.accessories,
    tip: '日常可佩戴这些材质的饰品，贴身接触用神五行能量'
  };
}

/**
 * 风水优化建议
 */
function buildFengshui(lucky) {
  if (!lucky.fengshui) return null;
  return lucky.fengshui;
}

/**
 * 体质养生建议
 */
function buildHealthAdvice(lucky, report) {
  if (!lucky.health) return null;
  var h = lucky.health;
  return {
    organ: h.organ,
    avoid: h.avoid,
    recommend: h.recommend,
    tip: '你的命局偏' + h.organ + '，日常注意' + h.avoid + '，建议' + h.recommend
  };
}

/**
 * 相处模式建议
 */
function buildRelationshipAdvice(report) {
  var ws = report.wangShuai;
  var hunYin = report.comprehensive && report.comprehensive.hunYin;
  var tips = [];

  if (ws && ws.result === '身旺') {
    tips.push('你个性较强，感情中学会倾听和让步，别总想主导');
    tips.push('找一个能"接住"你能量的人，比找一个顺从你的人更长久');
  } else if (ws && ws.result === '身弱') {
    tips.push('你容易受伴侣影响，选一个支持你、给你能量的人很重要');
    tips.push('感情中别太委曲求全，适当表达自己的需求');
  }

  if (hunYin && hunYin.isCaiZhi) {
    tips.push('日支为财星位，配偶多半能干务实，好好珍惜');
  } else if (hunYin && hunYin.isGuanZhi) {
    tips.push('日支为官星位，配偶有责任心，但可能有点管你');
  }

  return {
    tips: tips,
    summary: tips.length > 0 ? tips.join('；') : '感情中没有标准答案，真诚和沟通最重要'
  };
}

/**
 * 每日开运习惯
 */
function buildDailyHabits(lifestyle, lucky) {
  var habits = [];
  if (lifestyle.habits) {
    habits = lifestyle.habits.slice();
  }
  // 加上幸运数字和颜色的日常应用
  if (lucky.numbers && lucky.numbers.length > 0) {
    habits.push('密码、楼层、座位号可多用幸运数字 ' + lucky.numbers.join('、'));
  }
  if (lucky.colors) {
    habits.push('重要场合穿' + lucky.colors.outfit + '的衣物');
  }
  return {
    habits: habits,
    summary: '每天选1-2条坚持做，比一次性全做更有效。开运是习惯的积累，不是仪式。'
  };
}

/**
 * 忌神规避建议
 */
function buildAvoidAdvice(jishenWx) {
  if (!jishenWx) return null;
  var avoidMap = {
    '木': '少过度接触自然场景（露营过多）、少穿绿色、少在东方久待',
    '火': '少熬夜、少暴晒、少穿红色、少去太热闹嘈杂的场合',
    '土': '少宅家、少暴饮暴食、少穿大地色、少接触泥土类活动',
    '金': '少过度自律到刻板、少穿白色、少在西方久待、少用金属冷感物品',
    '水': '少去阴冷潮湿的地方、少穿蓝黑色、少过度冥想内省、少在北方久待'
  };
  return {
    element: jishenWx,
    advice: avoidMap[jishenWx] || '适度即可',
    tip: '忌神不是"绝对不能碰"，而是"别过度"。偶尔接触无妨，长期沉浸才不利。'
  };
}

module.exports = { generateSuggestions };
