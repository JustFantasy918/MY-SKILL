/**
 * bazi.js - 四柱排盘核心模块
 * 基于邵伟华《四柱预测学》排盘方法
 * 使用 lunar-javascript 库进行农历/节气/干支计算
 */

const { Solar } = require('lunar-javascript');
const { WUXING_GAN, WUXING_ZHI, CANGGAN, getShiShen } = require('./constants');

/**
 * 主排盘函数
 * @param {number} year - 公历年
 * @param {number} month - 公历月 (1-12)
 * @param {number} day - 公历日
 * @param {number} hour - 出生时辰 (0-23)
 * @param {string} gender - 'male' 或 'female'
 * @returns {object} 排盘结果
 */
function paipan(year, month, day, hour, gender) {
  // 1. 创建 Solar 对象，通过 lunar 获取八字
  const solar = Solar.fromYmdHms(year, month, day, hour || 12, 0, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();

  // 2. 获取日干（日元/日主）
  const dayGan = ec.getDayGan();
  const dayZhi = ec.getDayZhi();

  // 3. 构建四柱数据
  const pillars = buildPillarData(ec, dayGan);

  // 4. 附加信息
  function safeCall(method) {
    try { return ec[method](); } catch(e) { return null; }
  }
  function safeCallObj(obj, method) {
    try { return obj[method](); } catch(e) { return null; }
  }

  const extras = {
    nayin: {
      year: safeCall('getYearNaYin'),
      month: safeCall('getMonthNaYin'),
      day: safeCall('getDayNaYin'),
      time: safeCall('getTimeNaYin')
    },
    taiYuan: safeCall('getTaiYuan'),
    taiYuanNaYin: safeCall('getTaiYuanNaYin'),
    taiXi: safeCall('getTaiXi'),
    taiXiNaYin: safeCall('getTaiXiNaYin'),
    mingGong: safeCall('getMingGong'),
    mingGongNaYin: safeCall('getMingGongNaYin'),
    shenGong: safeCall('getShenGong'),
    shenGongNaYin: safeCall('getShenGongNaYin'),
    lunarDate: safeCallObj(lunar, 'toString') || '',
    solarDate: safeCallObj(solar, 'toString') || '',
    xingzuo: safeCallObj(solar, 'getXingZuo') || '',
    solarTerm: '',
    dayGanWuxing: WUXING_GAN[dayGan],
    dayZhiWuxing: WUXING_ZHI[dayZhi]
  };
  try { extras.solarTerm = lunar.getJieQi ? lunar.getJieQi() : ''; } catch(e) {}

  return { pillars, dayGan, dayZhi, extras, gender, ec, lunar, solar };
}

/**
 * 构建四柱数据结构
 * 每柱包含：天干、地支、藏干、五行、十神、十二长生、旬、空亡
 */
function buildPillarData(ec, dayGan) {
  const positions = ['year', 'month', 'day', 'time'];
  const labels = { year: '年柱', month: '月柱', day: '日柱', time: '时柱' };

  const getters = {
    year: {
      gz: 'getYear', gan: 'getYearGan', zhi: 'getYearZhi',
      hideGan: 'getYearHideGan', wuxing: 'getYearWuXing',
      shishenGan: 'getYearShiShenGan', shishenZhi: 'getYearShiShenZhi',
      diShi: 'getYearDiShi', xun: 'getYearXun', xunKong: 'getYearXunKong'
    },
    month: {
      gz: 'getMonth', gan: 'getMonthGan', zhi: 'getMonthZhi',
      hideGan: 'getMonthHideGan', wuxing: 'getMonthWuXing',
      shishenGan: 'getMonthShiShenGan', shishenZhi: 'getMonthShiShenZhi',
      diShi: 'getMonthDiShi', xun: 'getMonthXun', xunKong: 'getMonthXunKong'
    },
    day: {
      gz: 'getDay', gan: 'getDayGan', zhi: 'getDayZhi',
      hideGan: 'getDayHideGan', wuxing: 'getDayWuXing',
      shishenGan: 'getDayShiShenGan', shishenZhi: 'getDayShiShenZhi',
      diShi: 'getDayDiShi', xun: 'getDayXun', xunKong: 'getDayXunKong'
    },
    time: {
      gz: 'getTime', gan: 'getTimeGan', zhi: 'getTimeZhi',
      hideGan: 'getTimeHideGan', wuxing: 'getTimeWuXing',
      shishenGan: 'getTimeShiShenGan', shishenZhi: 'getTimeShiShenZhi',
      diShi: 'getTimeDiShi', xun: 'getTimeXun', xunKong: 'getTimeXunKong'
    }
  };

  const pillars = {};
  for (const pos of positions) {
    const g = getters[pos];
    // 安全调用辅助函数
    function safeCall(method) {
      try { return ec[method](); } catch(e) { return null; }
    }
    pillars[pos] = {
      position: pos,
      label: labels[pos],
      ganzhi: safeCall(g.gz),
      gan: safeCall(g.gan),
      zhi: safeCall(g.zhi),
      hideGan: safeCall(g.hideGan) || [],
      ganWuxing: WUXING_GAN[safeCall(g.gan)] || '',
      zhiWuxing: WUXING_ZHI[safeCall(g.zhi)] || '',
      shishenGan: safeCall(g.shishenGan),
      shishenZhi: safeCall(g.shishenZhi),
      diShi: safeCall(g.diShi),
      xun: safeCall(g.xun),
      xunKong: safeCall(g.xunKong)
    };
  }
  // 日柱天干十神标记为"日主"
  pillars.day.shishenGan = '日主';
  return pillars;
}

/**
 * 统计四柱五行分布
 */
function countWuxing(paipanResult) {
  const count = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
  const { pillars } = paipanResult;

  for (const pos of ['year', 'month', 'day', 'time']) {
    const p = pillars[pos];
    count[p.ganWuxing]++;
    count[p.zhiWuxing]++;
    // 藏干也计入
    for (const hg of p.hideGan) {
      const wx = WUXING_GAN[hg];
      if (wx) count[wx]++;
    }
  }
  return count;
}

/**
 * 获取四柱中所有天干（含藏干）
 */
function getAllGans(paipanResult) {
  const { pillars } = paipanResult;
  const result = [];
  for (const pos of ['year', 'month', 'day', 'time']) {
    const p = pillars[pos];
    result.push({ position: pos, type: 'gan', gan: p.gan, wuxing: p.ganWuxing, isHidden: false });
    for (const hg of p.hideGan) {
      result.push({ position: pos, type: 'canggan', gan: hg, wuxing: WUXING_GAN[hg], isHidden: true });
    }
  }
  return result;
}

module.exports = { paipan, buildPillarData, countWuxing, getAllGans };
