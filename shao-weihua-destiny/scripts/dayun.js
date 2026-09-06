/**
 * dayun.js - 大运流年排列模块
 * 基于邵伟华《四柱预测学》第8章 四柱岁运理论
 *
 * 排大运规则：
 * - 阳年男命顺排，阳年女命逆排
 * - 阴年女命顺排，阴年男命逆排
 * - 起运数：三天折一岁
 * 使用 lunar-javascript 内置的大运计算
 */

/**
 * 获取大运列表
 * @param {object} ec - EightChar 对象
 * @param {string} gender - 'male' 或 'female'
 * @returns {array} 大运数组
 */
function getDaYunList(ec, gender) {
  const genderCode = gender === 'male' ? 1 : 0;
  const yun = ec.getYun(genderCode, 2); // sect=2 按节气
  const daYunArr = yun.getDaYun();

  return daYunArr.map((dy, i) => {
    var ganzhi = null;
    var xun = null, xunKong = null;
    var liuNian = [];

    try {
      ganzhi = dy.getGanZhi();
      if (ganzhi && ganzhi.length >= 2) {
        xun = dy.getXun();
        xunKong = dy.getXunKong();
      }
    } catch(e) {
      // 第一步大运起运前无干支，跳过
    }

    try {
      liuNian = dy.getLiuNian().map(ln => {
        var lnGz = ln.getGanZhi();
        var lnXun = null, lnXunKong = null;
        if (lnGz && lnGz.length >= 2) {
          try {
            lnXun = ln.getXun();
            lnXunKong = ln.getXunKong();
          } catch(e2) {}
        }
        return {
          year: ln.getYear(),
          age: ln.getAge(),
          ganzhi: lnGz,
          xun: lnXun,
          xunKong: lnXunKong
        };
      });
    } catch(e3) {
      // 流年获取失败
    }

    return {
      index: i,
      ganzhi: ganzhi,
      startAge: dy.getStartAge(),
      endAge: dy.getEndAge(),
      startYear: dy.getStartYear(),
      endYear: dy.getEndYear(),
      xun: xun,
      xunKong: xunKong,
      liuNian: liuNian
    };
  });
}

/**
 * 获取当前大运
 */
function getCurrentDaYun(daYunList, currentYear) {
  for (const dy of daYunList) {
    if (currentYear >= dy.startYear && currentYear <= dy.endYear) {
      return dy;
    }
  }
  return null;
}

/**
 * 获取当前流年
 */
function getCurrentLiuNian(daYun, currentYear) {
  if (!daYun || !daYun.liuNian) return null;
  return daYun.liuNian.find(ln => ln.year === currentYear) || null;
}

module.exports = { getDaYunList, getCurrentDaYun, getCurrentLiuNian };
