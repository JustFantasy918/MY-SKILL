/**
 * truesolar.js - 真太阳时校正模块
 *
 * 算法：真太阳时 = 北京时间 + (经度-120°)×4分钟/度 + 均时差(EoT)
 * 均时差经验公式误差 < 0.5 分钟
 */

/**
 * 计算一年中的第几天（积日）
 */
function dayOfYear(date) {
  var start = new Date(date.getFullYear(), 0, 0);
  var diff = date - start;
  return Math.floor(diff / 86400000);
}

/**
 * 均时差 Equation of Time（单位：分钟）
 * 经验公式，误差 < 0.5 分钟
 */
function equationOfTime(date) {
  var N = dayOfYear(date);
  var B = 2 * Math.PI * (N - 81) / 365;
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

/**
 * 真太阳时校正
 * @param {Date} beijingDate - 北京时间的日期对象
 * @param {number} longitude - 出生地经度（东经，如上海121.47）
 * @returns {Date} 校正后的真太阳时日期对象
 */
function toTrueSolarTime(beijingDate, longitude) {
  if (!beijingDate || !longitude) return beijingDate;

  // 经度差校正：每度差 4 分钟
  // 120°E 为北京时间基准（东八区中央经线）
  var longitudeDeltaMinutes = (longitude - 120) * 4;

  // 均时差校正
  var eotMinutes = equationOfTime(beijingDate);

  // 总校正分钟数
  var totalDeltaMs = (longitudeDeltaMinutes + eotMinutes) * 60 * 1000;

  return new Date(beijingDate.getTime() + totalDeltaMs);
}

/**
 * 根据小时获取时辰地支
 * 23-1:子 1-3:丑 3-5:寅 5-7:卯 7-9:辰 9-11:巳
 * 11-13:午 13-15:未 15-17:申 17-19:酉 19-21:戌 21-23:亥
 */
function zhiOfHour(hour) {
  var zhiMap = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  // 23点归子时（次日），用 23%12/2 取索引
  var idx = Math.floor(((hour + 1) % 24) / 2);
  return zhiMap[idx];
}

/**
 * 完整校正流程
 * @param {number} year, month, day, hour, minute - 北京时间
 * @param {number} longitude - 经度
 * @returns {object} { corrected, original, deltaMinutes, zhiChanged, originalZhi, correctedZhi }
 */
function correctTime(year, month, day, hour, minute, longitude) {
  minute = minute || 0;
  var originalDate = new Date(year, month - 1, day, hour, minute, 0);
  var originalZhi = zhiOfHour(hour);

  if (!longitude) {
    return {
      corrected: { year: year, month: month, day: day, hour: hour, minute: minute },
      original: { year: year, month: month, day: day, hour: hour, minute: minute },
      deltaMinutes: 0,
      zhiChanged: false,
      originalZhi: originalZhi,
      correctedZhi: originalZhi,
      longitude: null
    };
  }

  var correctedDate = toTrueSolarTime(originalDate, longitude);
  var correctedHour = correctedDate.getHours();
  var correctedZhi = zhiOfHour(correctedHour);
  var deltaMinutes = Math.round((longitude - 120) * 4 + equationOfTime(originalDate));

  return {
    corrected: {
      year: correctedDate.getFullYear(),
      month: correctedDate.getMonth() + 1,
      day: correctedDate.getDate(),
      hour: correctedHour,
      minute: correctedDate.getMinutes()
    },
    original: { year: year, month: month, day: day, hour: hour, minute: minute },
    deltaMinutes: deltaMinutes,
    zhiChanged: originalZhi !== correctedZhi,
    originalZhi: originalZhi,
    correctedZhi: correctedZhi,
    longitude: longitude
  };
}

module.exports = {
  dayOfYear,
  equationOfTime,
  toTrueSolarTime,
  zhiOfHour,
  correctTime
};
