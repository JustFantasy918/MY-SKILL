/**
 * routes/api.js - API 路由
 */

var express = require('express');
var router = express.Router();

var { paipan, countWuxing } = require('../lib/bazi');
var { judgeWangShuai } = require('../lib/wangshuai');
var { selectYongShen } = require('../lib/yongshen');
var { getDaYunList } = require('../lib/dayun');
var { generateReport } = require('../lib/report');
var { buildPopularReport } = require('../lib/translator');
var { generateSuggestions } = require('../lib/suggestions');
var { getCityLongitude, listProvinces, listCities, searchCity, smartGetLongitude } = require('../lib/city-data');
var { correctTime } = require('../lib/truesolar');

// 健康检查
router.get('/health', function(req, res) {
  res.json({ status: 'ok', service: 'shao-weihua-destiny' });
});

// 四柱排盘
router.post('/paipan', function(req, res) {
  try {
    var body = req.body;
    var year = parseInt(body.year);
    var month = parseInt(body.month);
    var day = parseInt(body.day);
    var hour = parseInt(body.hour);
    var gender = body.gender;

    if (!year || !month || !day || hour === undefined || !gender) {
      return res.status(400).json({ error: '参数不完整，需要 year, month, day, hour, gender' });
    }

    var result = paipan(year, month, day, hour, gender);
    var wuxingDist = countWuxing(result);

    res.json({
      success: true,
      data: {
        pillars: result.pillars,
        dayGan: result.dayGan,
        extras: result.extras,
        wuxingDist: wuxingDist
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 旺衰分析
router.post('/wangshuai', function(req, res) {
  try {
    var body = req.body;
    var year = parseInt(body.year);
    var month = parseInt(body.month);
    var day = parseInt(body.day);
    var hour = parseInt(body.hour);
    var gender = body.gender;

    var paipanResult = paipan(year, month, day, hour, gender);
    var wangShuai = judgeWangShuai(paipanResult);

    res.json({
      success: true,
      data: wangShuai
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 用神选取
router.post('/yongshen', function(req, res) {
  try {
    var body = req.body;
    var year = parseInt(body.year);
    var month = parseInt(body.month);
    var day = parseInt(body.day);
    var hour = parseInt(body.hour);
    var gender = body.gender;

    var paipanResult = paipan(year, month, day, hour, gender);
    var wangShuai = judgeWangShuai(paipanResult);
    var yongShen = selectYongShen(paipanResult, wangShuai);

    res.json({
      success: true,
      data: yongShen
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 完整分析报告
router.post('/analyze', function(req, res) {
  try {
    var body = req.body;
    var year = parseInt(body.year);
    var month = parseInt(body.month);
    var day = parseInt(body.day);
    var hour = parseInt(body.hour);
    var gender = body.gender;
    var birthMinuteProvided = body.birthMinute !== undefined && body.birthMinute !== '' && body.birthMinute !== null;
    var birthMinute = birthMinuteProvided ? parseInt(body.birthMinute) : 0;
    var province = body.province || (body.birthPlace && body.birthPlace.province);
    var city = body.city || (body.birthPlace && body.birthPlace.city);
    var name = body.name || '';

    if (!year || !month || !day || hour === undefined || !gender) {
      return res.status(400).json({ error: '参数不完整' });
    }

    // 真太阳时校正（有出生地才做）
    var truesolar = null;
    var actualYear = year, actualMonth = month, actualDay = day, actualHour = hour, actualMinute = birthMinute;

    if (province) {
      var matchedCity = null;
      var longitude = null;

      // 优先精确匹配
      if (city) {
        longitude = getCityLongitude(province, city);
        if (longitude !== null) matchedCity = city;
      }

      // 精确匹配失败，用模糊搜索
      if (longitude === null && city) {
        var fuzzy = searchCity(city);
        if (fuzzy.length > 0) {
          longitude = fuzzy[0].longitude;
          matchedCity = fuzzy[0].city;
          // 如果模糊匹配到的省份不同，更新
          if (fuzzy[0].province !== province) {
            province = fuzzy[0].province;
          }
        }
      }

      // 仍失败，用 smartGetLongitude 整体匹配
      if (longitude === null) {
        var smart = smartGetLongitude(province + ' ' + (city || ''));
        if (smart) {
          longitude = smart.longitude;
          matchedCity = smart.city;
          province = smart.province;
        }
      }

      if (longitude !== null) {
        truesolar = correctTime(year, month, day, hour, birthMinute, longitude);
        var c = truesolar.corrected;
        // 日柱按真太阳时校正后的日期（处理跨日）
        actualYear = c.year;
        actualMonth = c.month;
        actualDay = c.day;
        // 时辰处理：
        // - 用户填了精确分钟 → 按真太阳时完整校正时辰
        // - 用户只选时辰 → 保留用户选择的时辰（避免边界抖动）
        //   例如用户选寅时(3点)，校正-15分钟不应改为丑时
        if (birthMinuteProvided) {
          actualHour = c.hour;
        } else {
          actualHour = hour; // 保留用户选择的时辰
          // 但记录真太阳时本应的时辰，供前端提示
          truesolar.suggestedHour = c.hour;
          truesolar.userHour = hour;
          truesolar.hourKept = (c.hour !== hour);
        }
        // 记录匹配信息
        truesolar.matchedCity = matchedCity;
        truesolar.matchedProvince = province;
      }
    }

    var paipanResult = paipan(actualYear, actualMonth, actualDay, actualHour, gender);
    var report = generateReport(paipanResult);

    // 追加通俗模式数据
    report.popular = buildPopularReport(report);
    report.suggestions = generateSuggestions(report);
    report.truesolar = truesolar;
    report.nameAnalysis = name ? { name: name, note: '姓名学分析将在第二阶段上线' } : null;

    res.json({
      success: true,
      data: report
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 城市数据接口（用于首页省市联动 + 自由搜索）
router.get('/cities', function(req, res) {
  var province = req.query.province;
  var search = req.query.search;
  if (search) {
    // 搜索模式：支持自由输入城市名
    res.json({ success: true, results: searchCity(search) });
  } else if (province) {
    res.json({ success: true, cities: listCities(province) });
  } else {
    res.json({ success: true, provinces: listProvinces() });
  }
});

module.exports = router;
