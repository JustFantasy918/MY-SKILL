/**
 * chart-render.js - 排盘结果页渲染逻辑
 */

var reportData = null;
var chartsRendered = { radar: false, wuxing: false, role: false };

// 五行颜色映射
var WX_COLOR = { '木': '#28a745', '火': '#dc3545', '土': '#ffc107', '金': '#6c757d', '水': '#007bff' };

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  var params = new URLSearchParams(window.location.search);
  var year = params.get('year');
  var month = params.get('month');
  var day = params.get('day');
  var hour = params.get('hour');
  var gender = params.get('gender');
  var province = params.get('province');
  var city = params.get('city');
  var name = params.get('name');
  var birthMinute = params.get('birthMinute');

  if (!year || !month || !day || hour === null || !gender) {
    alert('参数不完整，请从首页输入生辰信息');
    window.location.href = '/';
    return;
  }

  var reqBody = { year: parseInt(year), month: parseInt(month), day: parseInt(day), hour: parseInt(hour), gender: gender };
  if (province) reqBody.province = province;
  if (city) reqBody.city = city;
  if (name) reqBody.name = name;
  if (birthMinute) reqBody.birthMinute = parseInt(birthMinute);

  fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody)
  })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res.success) {
        reportData = res.data;
        document.getElementById('loadingOverlay').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        renderAll();
      } else {
        throw new Error(res.error || '分析失败');
      }
    })
    .catch(function(err) {
      document.getElementById('loadingOverlay').innerHTML =
        '<div class="text-danger"><p>分析失败: ' + err.message + '</p><a href="/" class="btn btn-primary">返回首页</a></div>';
    });

  // 模式切换
  document.querySelectorAll('input[name="mode"]').forEach(function(radio) {
    radio.addEventListener('change', function() {
      var mode = this.value;
      if (mode === 'popular') {
        document.getElementById('popularMode').style.display = 'block';
        document.getElementById('deepMode').style.display = 'none';
        if (!chartsRendered.role) setTimeout(renderRoleChart, 50);
      } else {
        document.getElementById('popularMode').style.display = 'none';
        document.getElementById('deepMode').style.display = 'block';
      }
      try { localStorage.setItem('mingli_mode', mode); } catch(e) {}
    });
  });

  // 恢复上次模式选择
  try {
    var savedMode = localStorage.getItem('mingli_mode');
    if (savedMode === 'deep') {
      document.getElementById('modeDeep').checked = true;
      document.getElementById('modeDeep').dispatchEvent(new Event('change'));
    }
  } catch(e) {}

  // 深度模式 Tab 切换时延迟渲染图表
  document.querySelectorAll('a[data-bs-toggle="tab"]').forEach(function(tab) {
    tab.addEventListener('shown.bs.tab', function(e) {
      var target = e.target.getAttribute('href');
      if (target === '#tab-wuxing' && !chartsRendered.wuxing) setTimeout(renderWuxingChart, 50);
      if (target === '#tab-wangshuai' && !chartsRendered.radar) setTimeout(renderRadarChart, 50);
    });
  });
});

function renderAll() {
  renderBasicInfo();
  renderTruesolarAlert();
  renderPaipanTable();
  renderExtraInfo();
  renderPopular();
  renderWangShuai();
  renderYongShen();
  renderDaYun();
  renderReport();
  renderWuxing();
}

// 真太阳时校正提示
function renderTruesolarAlert() {
  var ts = reportData.truesolar;
  if (!ts || !ts.longitude) return;
  var el = document.getElementById('truesolarAlert');
  var html = '<div class="alert alert-info py-2 small">';
  html += '📍 已根据出生地（' + (ts.matchedCity || '') + '，经度' + ts.longitude.toFixed(2) + '°）进行真太阳时校正';
  html += '，校正幅度 ' + (ts.deltaMinutes > 0 ? '+' : '') + ts.deltaMinutes + ' 分钟';

  if (ts.hourKept) {
    // 用户只选了时辰，时辰被保留
    html += '。<br>ℹ️ 你选择的时辰已保留（按北京时间判断）';
    html += '。若按真太阳时严格判断，时辰应为 <strong>' + ts.correctedZhi + '时</strong>（当前保留 <strong>' + ts.originalZhi + '时</strong>）';
    html += '。如需精确判断，请在首页"高级选项"中填写出生分钟。';
  } else if (ts.zhiChanged) {
    // 用户填了精确分钟，时辰按真太阳时变化
    html += '，时辰由 <strong>' + ts.originalZhi + '时</strong> 变为 <strong>' + ts.correctedZhi + '时</strong>（按真太阳时精确判断）。';
  } else {
    html += '，时辰未变。';
  }
  html += '</div>';
  el.innerHTML = html;
  el.style.display = 'block';
}

// 基本信息
function renderBasicInfo() {
  var d = reportData;
  var html = '<strong>' + (d.basic.extras.solarDate || '') + '</strong>';
  if (d.basic.extras.lunarDate) html += ' | 农历: ' + d.basic.extras.lunarDate;
  if (d.basic.extras.xingzuo) html += ' | ' + d.basic.extras.xingzuo;
  var genderText = d.basic.gender === 'male' ? '男命' : '女命';
  html += ' | ' + (d.basic.dayGan || '?') + '(' + (d.basic.dayWx || '?') + ')日主 | ' + genderText;
  document.getElementById('basicInfo').innerHTML = html;
}

// 排盘表
function renderPaipanTable() {
  var p = reportData.pillars;
  var order = ['time', 'day', 'month', 'year']; // 从右到左：年月日时

  var rows = [
    { label: '天干十神', key: 'shishenGan' },
    { label: '天干', key: 'gan', isGan: true },
    { label: '地支', key: 'zhi', isZhi: true },
    { label: '藏干', key: 'hideGan', isHideGan: true },
    { label: '地支十神', key: 'shishenZhi', isShiShenZhi: true },
    { label: '纳音', key: 'nayin', isNayin: true },
    { label: '十二长生', key: 'diShi' },
    { label: '空亡', key: 'xunKong' }
  ];

  var html = '';
  for (var r of rows) {
    html += '<tr><td class="pillar-header">' + r.label + '</td>';
    for (var pos of order) {
      var pillar = p[pos];
      var val = '';
      if (r.isGan) {
        var wx = pillar.ganWuxing;
        val = '<span class="wx-' + wxToPinyin(wx) + '">' + pillar.gan + '</span><small class="text-muted">[' + wx + ']</small>';
      } else if (r.isZhi) {
        var zwx = pillar.zhiWuxing;
        val = '<span class="wx-' + wxToPinyin(zwx) + '">' + pillar.zhi + '</span><small class="text-muted">[' + zwx + ']</small>';
      } else if (r.isHideGan) {
        var parts = [];
        var hgs = pillar.hideGan || [];
        for (var hg of hgs) {
          var hwx = getGanWx(hg);
          parts.push('<span class="wx-' + wxToPinyin(hwx) + '">' + hg + '</span>');
        }
        val = parts.join(' ') || '-';
      } else if (r.isShiShenZhi) {
        // shishenZhi 可能是数组或字符串
        var ssz = pillar.shishenZhi;
        if (Array.isArray(ssz)) {
          val = ssz.join('、') || '-';
        } else {
          val = ssz || '-';
        }
      } else if (r.isNayin) {
        val = (reportData.basic.extras.nayin && reportData.basic.extras.nayin[pos]) || '-';
      } else {
        val = pillar[r.key] || '-';
      }
      html += '<td>' + val + '</td>';
    }
    html += '</tr>';
  }

  document.getElementById('paipanBody').innerHTML = html;
}

function renderExtraInfo() {
  var e = reportData.basic.extras;
  var html = '';
  if (e.taiYuan) html += '胎元: ' + e.taiYuan;
  if (e.taiYuanNaYin) html += '(' + e.taiYuanNaYin + ') ';
  if (e.mingGong) html += ' | 命宫: ' + e.mingGong;
  if (e.mingGongNaYin) html += '(' + e.mingGongNaYin + ') ';
  if (e.shenGong) html += ' | 身宫: ' + e.shenGong;
  if (e.shenGongNaYin) html += '(' + e.shenGongNaYin + ')';
  document.getElementById('extraInfo').innerHTML = html;
}

// 旺衰分析
function renderWangShuai() {
  var ws = reportData.wangShuai;
  var html = '<div class="analysis-section">';

  // 评分条
  html += '<h6>旺衰综合评分</h6>';
  html += '<div class="d-flex align-items-center mb-3">';
  html += '<div class="score-bar flex-grow-1 position-relative">';
  var pos = Math.max(0, Math.min(100, ws.score));
  html += '<div class="score-marker" style="left:' + pos + '%;"></div>';
  html += '</div>';
  html += '<span class="ms-3 fs-5 fw-bold">' + ws.score + '/100</span>';
  html += '</div>';
  html += '<div class="alert ' + (ws.result === '身旺' ? 'alert-danger' : 'alert-success') + '">';
  html += '<strong>判断结果：' + ws.confidence + ws.result + '</strong>';
  html += '</div>';

  // 四要素
  html += '<h6>四要素分析</h6>';
  html += '<table class="table table-sm table-bordered">';
  html += '<thead><tr><th>要素</th><th>是否得</th><th>力度</th><th>说明</th></tr></thead><tbody>';
  html += '<tr><td>得令（月令40%）</td><td>' + (ws.deLing.deLing ? '是' : '否') + '</td><td>' + ws.deLing.weight + '</td><td>' + ws.deLing.detail + '</td></tr>';
  html += '<tr><td>得地（根气25%）</td><td>' + (ws.deDi.deDi ? '是' : '否') + '</td><td>' + ws.deDi.weight + '</td><td>' + ws.deDi.detail + '</td></tr>';
  html += '<tr><td>得生（印星20%）</td><td>' + (ws.deSheng.deSheng ? '是' : '否') + '</td><td>' + ws.deSheng.weight + '</td><td>' + ws.deSheng.detail + '</td></tr>';
  html += '<tr><td>得助（比劫15%）</td><td>' + (ws.deZhu.deZhu ? '是' : '否') + '</td><td>' + ws.deZhu.weight + '</td><td>' + ws.deZhu.detail + '</td></tr>';
  html += '</tbody></table>';

  // 克泄耗
  html += '<h6>克泄耗力量</h6>';
  html += '<p>官杀(克身): ' + ws.keXieHao.guanSha + ' | 食伤(泄身): ' + ws.keXieHao.shiShang + ' | 财星(耗身): ' + ws.keXieHao.caiXing + ' | 合计: ' + ws.keXieHao.total + '</p>';

  // 摘要
  html += '<div class="alert alert-light"><strong>分析摘要：</strong>' + ws.summary + '</div>';
  html += '</div>';

  // 雷达图容器
  html += '<div class="analysis-section"><h6>四要素雷达图</h6><div id="radarChart" style="width:100%;height:450px;"></div></div>';

  document.getElementById('wangshuaiContent').innerHTML = html;

  // 旺衰是默认活动 Tab，可以直接渲染
  setTimeout(renderRadarChart, 100);
}

function renderRadarChart() {
  var el = document.getElementById('radarChart');
  if (!el || !reportData) return;
  if (chartsRendered.radar) return;

  var ws = reportData.wangShuai;
  var chart = echarts.init(el);
  chart.setOption({
    tooltip: {
      formatter: function(params) {
        var labels = ['得令(月令)', '得地(根气)', '得生(印星)', '得助(比劫)'];
        var html = '';
        for (var i = 0; i < params.value.length; i++) {
          html += labels[i] + '：' + params.value[i] + '<br>';
        }
        return html;
      }
    },
    radar: {
      indicator: [
        { name: '得令\n(月令40%)', max: 100 },
        { name: '得地\n(根气25%)', max: 100 },
        { name: '得生\n(印星20%)', max: 100 },
        { name: '得助\n(比劫15%)', max: 100 }
      ],
      radius: '65%',
      center: ['50%', '52%'],
      axisName: { fontSize: 13, color: '#2c3e50' }
    },
    series: [{
      type: 'radar',
      data: [{
        value: [
          ws.deLing.deLing ? (ws.deLing.weight === 'strong' ? 90 : 60) : 20,
          ws.deDi.deDi ? (ws.deDi.weight === 'strong' ? 80 : 55) : 15,
          ws.deSheng.deSheng ? (ws.deSheng.weight === 'strong' ? 75 : 50) : 10,
          ws.deZhu.deZhu ? (ws.deZhu.weight === 'strong' ? 70 : 45) : 10
        ],
        name: '旺衰四要素',
        areaStyle: { color: 'rgba(0,123,255,0.2)' },
        lineStyle: { color: '#007bff', width: 2 },
        itemStyle: { color: '#007bff' },
        label: { show: true, fontSize: 12 }
      }]
    }]
  });
  chartsRendered.radar = true;
}

// 用神选取
function renderYongShen() {
  var ys = reportData.yongShen;
  var html = '<div class="analysis-section">';

  html += '<h6>用神选取结果</h6>';
  html += '<div class="yongshen-box">';
  if (ys.yongshen) {
    html += '<div class="yongshen-item wx-bg-' + wxToPinyin(ys.yongshen) + '"><div class="label">用神</div><div class="value wx-' + wxToPinyin(ys.yongshen) + '">' + ys.yongshen + '</div></div>';
  }
  if (ys.xishen) {
    html += '<div class="yongshen-item wx-bg-' + wxToPinyin(ys.xishen) + '"><div class="label">喜神</div><div class="value wx-' + wxToPinyin(ys.xishen) + '">' + ys.xishen + '</div></div>';
  }
  if (ys.jishen) {
    html += '<div class="yongshen-item wx-bg-' + wxToPinyin(ys.jishen) + '"><div class="label">忌神</div><div class="value wx-' + wxToPinyin(ys.jishen) + '">' + ys.jishen + '</div></div>';
  }
  if (ys.choushen) {
    html += '<div class="yongshen-item wx-bg-' + wxToPinyin(ys.choushen) + '"><div class="label">仇神</div><div class="value wx-' + wxToPinyin(ys.choushen) + '">' + ys.choushen + '</div></div>';
  }
  html += '</div>';

  html += '<div class="alert alert-info"><strong>选取方法：</strong>' + (ys.method || '') + '<br><strong>理由：</strong>' + (ys.reasoning || '') + '</div>';

  // 三原则详情
  html += '<h6>三原则分析过程</h6>';
  html += '<table class="table table-sm table-bordered">';
  html += '<thead><tr><th>原则</th><th>是否适用</th><th>推荐五行</th><th>说明</th></tr></thead><tbody>';
  if (ys.tiaoHou) {
    html += '<tr><td>调候法（优先）</td><td>' + (ys.tiaoHou.needed ? '是' : '否') + '</td><td>' + (ys.tiaoHou.element || '-') + '</td><td>' + (ys.tiaoHou.reason || '') + '</td></tr>';
  }
  if (ys.tongGuan) {
    html += '<tr><td>通关法</td><td>' + (ys.tongGuan.needed ? '是' : '否') + '</td><td>' + (ys.tongGuan.element || '-') + '</td><td>' + (ys.tongGuan.reason || '') + '</td></tr>';
  }
  if (ys.fuYi && ys.fuYi.options) {
    var f0 = ys.fuYi.options[0] || {};
    var f1 = ys.fuYi.options[1] || {};
    html += '<tr><td>扶抑法</td><td>是</td><td>' + (f0.element || '-') + '</td><td>' + (f0.reason || '') + '；备选：' + (f1.element || '-') + '</td></tr>';
  }
  html += '</tbody></table>';

  html += '<div class="alert alert-light"><strong>总结：</strong>' + (ys.summary || '') + '</div>';
  html += '</div>';

  document.getElementById('yongshenContent').innerHTML = html;
}

// 大运流年
function renderDaYun() {
  var daYun = reportData.daYun;
  var html = '<div class="analysis-section">';

  // 当前大运
  if (reportData.currentDaYun) {
    var cd = reportData.currentDaYun;
    html += '<div class="alert alert-primary">';
    html += '<strong>当前大运：' + (cd.ganzhi || '?') + '</strong>（' + cd.startAge + '-' + cd.endAge + '岁，' + cd.startYear + '-' + cd.endYear + '年）';
    if (cd.jixiong && cd.jixiong.level) {
      html += ' <span class="badge ' + jixiongBadgeClass(cd.jixiong.level) + '">' + cd.jixiong.level + '</span>';
      if (cd.jixiong.reasons && cd.jixiong.reasons.length) {
        html += '<br><small>' + cd.jixiong.reasons.join('；') + '</small>';
      }
    }
    html += '</div>';
  }

  // 当前流年
  if (reportData.currentLiuNian) {
    var cl = reportData.currentLiuNian;
    html += '<div class="alert alert-secondary">';
    html += '<strong>当前流年：' + cl.year + ' ' + (cl.ganzhi || '?') + '</strong>（' + cl.age + '岁）';
    if (cl.jixiong && cl.jixiong.combined) {
      html += ' <span class="badge ' + combinedBadgeClass(cl.jixiong.combined) + '">' + cl.jixiong.combined + '</span>';
      if (cl.jixiong.reasons && cl.jixiong.reasons.length) {
        html += '<br><small>' + cl.jixiong.reasons.join('；') + '</small>';
      }
    }
    html += '</div>';
  }

  // 大运列表
  html += '<h6>大运排列</h6>';
  for (var i = 0; i < daYun.length; i++) {
    var dy = daYun[i];
    if (!dy.ganzhi || dy.ganzhi.length < 2) continue;
    var jx = dy.jixiong || {};
    var levelClass = jixiongToClass(jx.level);
    html += '<div class="dayun-item ' + levelClass + '">';
    html += '<div style="min-width:80px;"><strong>' + dy.ganzhi + '</strong></div>';
    html += '<div style="min-width:120px;" class="text-muted small">' + dy.startAge + '-' + dy.endAge + '岁 (' + dy.startYear + '-' + dy.endYear + ')</div>';
    html += '<div style="min-width:60px;"><span class="badge ' + jixiongBadgeClass(jx.level) + '">' + (jx.level || '平') + '</span></div>';
    html += '<div class="small text-muted flex-grow-1">' + (jx.reasons ? jx.reasons.join('；') : '') + '</div>';
    html += '</div>';

    // 流年
    if (dy.liuNian && dy.liuNian.length > 0 && dy.startYear <= new Date().getFullYear() + 20) {
      html += '<div class="ps-4 pb-2 small">';
      var lnHtml = [];
      for (var ln of dy.liuNian) {
        var lnJx = ln.jixiong || {};
        var lnBadge = lnJx.combined ? '<span class="badge ' + combinedBadgeClass(lnJx.combined) + ' ms-1">' + lnJx.combined + '</span>' : '';
        lnHtml.push('<span class="me-2">' + ln.year + ' ' + (ln.ganzhi || '?') + lnBadge + '</span>');
      }
      html += lnHtml.join('');
      html += '</div>';
    }
  }

  html += '</div>';

  // 岁运吉凶矩阵说明
  html += '<div class="analysis-section">';
  html += '<h6>岁运吉凶矩阵（邵伟华理论）</h6>';
  html += '<table class="table table-sm table-bordered text-center">';
  html += '<thead><tr><th>大运＼流年</th><th>吉</th><th>平</th><th>凶</th></tr></thead><tbody>';
  html += '<tr><td><strong>吉</strong></td><td class="bg-danger text-white">大吉</td><td>吉</td><td class="bg-light">多吉少凶</td></tr>';
  html += '<tr><td><strong>平</strong></td><td>小吉</td><td class="bg-light">平</td><td>小凶</td></tr>';
  html += '<tr><td><strong>凶</strong></td><td class="bg-light">多凶少吉</td><td>凶</td><td class="bg-success text-white">大凶</td></tr>';
  html += '</tbody></table>';
  html += '<p class="small text-muted">注：吉=红色（好），凶=绿色（不利），遵循中国传统配色</p>';
  html += '</div>';

  document.getElementById('dayunContent').innerHTML = html;
}

// 综合报告
function renderReport() {
  var c = reportData.comprehensive;
  if (!c) {
    document.getElementById('reportContent').innerHTML = '<div class="alert alert-warning">综合报告数据加载失败</div>';
    return;
  }
  var html = '';

  var sections = [
    { title: '心性分析', data: c.xinXing, content: c.xinXing ? c.xinXing.summary : '' },
    { title: '事业分析', data: c.shiYe, content: c.shiYe ? c.shiYe.summary : '' },
    { title: '财运分析', data: c.caiYun, content: c.caiYun ? c.caiYun.summary : '' },
    { title: '婚姻分析', data: c.hunYin, content: c.hunYin ? c.hunYin.summary : '' },
    { title: '健康分析', data: c.jianKang, content: c.jianKang ? c.jianKang.summary : '' },
    { title: '子女分析', data: c.ziNv, content: c.ziNv ? c.ziNv.summary : '' }
  ];

  for (var s of sections) {
    html += '<div class="analysis-section">';
    html += '<h6>' + s.title + '</h6>';
    html += '<p>' + (s.content || '暂无数据') + '</p>';
    html += '</div>';
  }

  html += '<div class="alert alert-warning disclaimer-box"><strong>免责声明：</strong>' + (reportData.disclaimer || '') + '</div>';

  document.getElementById('reportContent').innerHTML = html;
}

// 五行分布
function renderWuxing() {
  var dist = reportData.wuxingDist;
  var html = '<div class="analysis-section">';
  html += '<h6>四柱五行分布</h6>';
  html += '<div id="wuxingChart" style="width:100%;height:350px;"></div>';
  html += '<table class="table table-sm table-bordered mt-2">';
  html += '<thead><tr><th>五行</th><th>木</th><th>火</th><th>土</th><th>金</th><th>水</th></tr></thead><tbody>';
  html += '<tr><td>数量</td>';
  for (var wx of ['木', '火', '土', '金', '水']) {
    html += '<td class="wx-' + wxToPinyin(wx) + ' fw-bold">' + (dist[wx] || 0) + '</td>';
  }
  html += '</tr></tbody></table>';
  html += '</div>';

  document.getElementById('wuxingContent').innerHTML = html;

  // 五行分布 Tab 不是默认活动 Tab，延迟到 Tab 可见时再渲染
  // 如果当前 Tab 已经可见则立即渲染
  var wuxingTab = document.getElementById('tab-wuxing');
  if (wuxingTab && wuxingTab.classList.contains('active')) {
    setTimeout(renderWuxingChart, 100);
  }
}

function renderWuxingChart() {
  var el = document.getElementById('wuxingChart');
  if (!el || !reportData) return;
  if (chartsRendered.wuxing) return;

  var dist = reportData.wuxingDist;
  var chart = echarts.init(el);
  var data = [];
  for (var wx of ['木', '火', '土', '金', '水']) {
    data.push({ value: dist[wx] || 0, name: wx, itemStyle: { color: WX_COLOR[wx] } });
  }
  chart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      label: { formatter: '{b}: {c} ({d}%)' },
      data: data
    }]
  });
  chartsRendered.wuxing = true;
}

// ============ 通俗模式渲染 ============

function renderPopular() {
  var p = reportData.popular;
  var s = reportData.suggestions;
  if (!p) {
    document.getElementById('popularContent').innerHTML = '<div class="alert alert-warning">通俗模式数据加载失败</div>';
    return;
  }
  var html = '';

  // 1. 你的内在角色
  html += renderPopularPersonality(p.personality);

  // 2. 你的能量配置
  html += renderPopularEnergy(p.energy);

  // 3. 你的开运指南
  html += renderPopularKaiyun(p.kaiyun, s);

  // 4. 生活建议
  html += renderPopularLife(p.life);

  // 5. 当前运势
  html += renderPopularYunshi(p.yunshi);

  // 6. 姓名分析（若有）
  if (reportData.nameAnalysis && reportData.nameAnalysis.name) {
    html += renderPopularName(reportData.nameAnalysis);
  }

  // 免责声明
  html += '<div class="alert alert-warning mt-3 disclaimer-box"><strong>一句话：</strong>' + p.disclaimer + '</div>';

  document.getElementById('popularContent').innerHTML = html;

  // 渲染角色雷达图
  setTimeout(renderRoleChart, 100);
}

function renderPopularPersonality(personality) {
  if (!personality) return '';
  var html = '<div class="popular-section">';
  html += '<h5>🎭 你的命盘画像</h5>';
  html += '<p class="text-muted small">从四个维度解读你的命盘——天生底色、人生赛道、性格倾向、以及与人互动的方式。</p>';

  // Layer 1: 日干本性
  var n = personality.nature;
  if (n) {
    html += '<h6>1. 你的天生底色——' + n.tag + '</h6>';
    html += '<div class="role-card">';
    html += '<div class="role-name">' + n.tag + '</div>';
    html += '<div class="role-desc">' + n.personality + '</div>';
    html += '<div class="mt-2">';
    html += '<span class="badge bg-light text-dark me-1">日干' + n.dayGan + '(' + n.dayWx + ')</span>';
    html += '<span class="badge bg-light text-dark me-1">' + n.yinYang + '性</span>';
    html += '<span class="badge bg-light text-dark">主"' + n.wuDe + '"</span>';
    html += '</div></div>';
    if (n.wsNote) html += '<div class="alert alert-light small mt-2">' + n.wsNote + '</div>';
  }

  // Layer 2: 格局定位
  var g = personality.geju;
  if (g) {
    html += '<h6 class="mt-3">2. 你的人生赛道——' + g.name + '</h6>';
    html += '<div class="alert alert-primary">' + g.desc + '</div>';
  }

  // Layer 3: 五行平衡
  var b = personality.balance;
  if (b) {
    html += '<h6 class="mt-3">3. 你的性格倾向</h6>';
    html += '<div class="row mb-2">';
    html += '<div class="col-md-4 text-center">';
    html += '<div class="alert alert-' + (b.ieType.indexOf('内向') >= 0 ? 'info' : (b.ieType.indexOf('外向') >= 0 ? 'warning' : 'secondary')) + ' py-3 mb-0">';
    html += '<div class="fw-bold mb-1">' + b.ieType + '</div>';
    html += '<small class="text-muted">火金偏外 · 水土偏内</small>';
    html += '</div></div>';
    html += '<div class="col-md-8">';
    var wxs = ['木','火','土','金','水'];
    for (var wx of wxs) {
      var cnt = (b.dist && b.dist[wx]) || 0;
      html += '<div class="d-flex align-items-center mb-1">';
      html += '<span class="wx-' + wxToPinyin(wx) + ' small" style="width:60px;">' + wx + '</span>';
      html += '<div class="progress flex-grow-1" style="height:12px;">';
      var pct = Math.max(5, Math.min(100, cnt / 6 * 80));
      html += '<div class="progress-bar" style="width:' + pct + '%;background-color:' + WX_COLOR[wx] + ';"></div>';
      html += '</div>';
      html += '<span class="small ms-2" style="width:30px;">' + cnt + '</span>';
      html += '</div>';
    }
    html += '</div></div>';
    if (b.excess && b.excess.length > 0) {
      html += '<div class="alert alert-warning py-2">' + b.excess.map(function(e) {
        return '<strong>' + e.wx + '偏旺</strong> → ' + e.note.trait + ' | ' + e.note.advice;
      }).join('<br>') + '</div>';
    }
    if (b.deficit && b.deficit.length > 0) {
      html += '<div class="alert alert-info py-2">' + b.deficit.map(function(d) {
        return '<strong>' + d.wx + '偏弱</strong> → ' + d.note.trait + ' | ' + d.note.advice;
      }).join('<br>') + '</div>';
    }
  }

  // Layer 4: 十神配置（关系模式）
  var rel = personality.relation;
  if (rel && rel.patterns) {
    html += '<h6 class="mt-3">4. 你的人际互动模式</h6>';
    html += '<div id="roleChart" style="width:100%;height:350px;"></div>';
    html += '<table class="table table-sm table-bordered mt-2"><thead><tr><th>维度</th><th>程度</th><th>这意味着</th></tr></thead><tbody>';
    for (var p of rel.patterns) {
      html += '<tr><td>' + p.dim + '</td><td>' + levelBadge(p.level) + '</td><td class="small">' + p.desc + '</td></tr>';
    }
    html += '</tbody></table>';
  }

  html += '</div>';
  return html;
}

function levelBadge(level) {
  var map = { '强':'badge bg-danger','中':'badge bg-warning text-dark','弱':'badge bg-info','外放':'badge bg-danger','中等':'badge bg-warning text-dark','内敛':'badge bg-info','主动':'badge bg-danger','被动':'badge bg-info' };
  return '<span class="' + (map[level] || 'badge bg-secondary') + '">' + level + '</span>';
}

function renderPopularEnergy(energy) {
  if (!energy) return '';
  var html = '<div class="popular-section">';
  html += '<h5>⚡ 你的能量配置</h5>';
  html += '<div class="alert alert-light">';
  html += '<strong>' + energy.title + '</strong>（' + energy.confidence + '，评分 ' + energy.score + '/100）<br>';
  html += energy.summary;
  html += '</div>';
  html += '<table class="table table-sm">';
  html += '<tr><td class="text-muted" style="width:30%;">职场建议</td><td>' + energy.workplace + '</td></tr>';
  html += '<tr><td class="text-muted">需要注意</td><td>' + energy.caution + '</td></tr>';
  html += '</table>';
  html += '</div>';
  return html;
}

function renderPopularKaiyun(kaiyun, suggestions) {
  if (!kaiyun) return '';
  var html = '<div class="popular-section">';
  html += '<h5>🍀 你的开运指南</h5>';
  html += '<p>' + kaiyun.summary + '</p>';

  if (suggestions) {
    // 幸运色三场景
    if (suggestions.luckyColors) {
      html += '<h6 class="mt-3">幸运颜色</h6>';
      html += '<div class="row">';
      html += '<div class="col-md-4"><div class="lucky-color-swatch"><strong>穿搭</strong><br>' + suggestions.luckyColors.outfit.desc + '<br><small class="text-muted">' + suggestions.luckyColors.outfit.tip + '</small></div></div>';
      html += '<div class="col-md-4"><div class="lucky-color-swatch"><strong>家居</strong><br>' + suggestions.luckyColors.home.desc + '<br><small class="text-muted">' + suggestions.luckyColors.home.tip + '</small></div></div>';
      html += '<div class="col-md-4"><div class="lucky-color-swatch"><strong>职场</strong><br>' + suggestions.luckyColors.workplace.desc + '<br><small class="text-muted">' + suggestions.luckyColors.workplace.tip + '</small></div></div>';
      html += '</div>';
    }

    // 幸运数字 + 方位
    html += '<div class="row mt-2">';
    if (suggestions.luckyNumbers && suggestions.luckyNumbers.length) {
      html += '<div class="col-md-6"><strong>幸运数字：</strong>' + suggestions.luckyNumbers.join('、') + '</div>';
    }
    if (suggestions.directions) {
      html += '<div class="col-md-6"><strong>吉利方位：</strong>' + suggestions.directions.desk + '<br><small class="text-muted">' + suggestions.directions.tip + '</small></div>';
    }
    html += '</div>';

    // 适合行业
    if (suggestions.industries && suggestions.industries.length) {
      html += '<h6 class="mt-3">适合的行业方向</h6>';
      html += '<div>';
      for (var ind of suggestions.industries) {
        html += '<span class="badge bg-light text-dark me-1 mb-1">' + ind + '</span>';
      }
      html += '</div>';
    }

    // 配饰建议
    if (suggestions.accessories && suggestions.accessories.list) {
      html += '<h6 class="mt-3">💎 适合的配饰</h6>';
      html += '<div>';
      for (var acc of suggestions.accessories.list) {
        html += '<span class="badge bg-info text-white me-1 mb-1">' + acc + '</span>';
      }
      html += '</div>';
      html += '<small class="text-muted">' + suggestions.accessories.tip + '</small>';
    }

    // 风水优化
    if (suggestions.fengshui) {
      html += '<h6 class="mt-3">🏠 风水优化建议</h6>';
      html += '<table class="table table-sm table-bordered">';
      html += '<tr><td class="text-muted" style="width:30%;">推荐物品</td><td>' + suggestions.fengshui.items + '</td></tr>';
      html += '<tr><td class="text-muted">布局建议</td><td>' + suggestions.fengshui.layout + '</td></tr>';
      html += '<tr><td class="text-muted">需要注意</td><td>' + suggestions.fengshui.avoid + '</td></tr>';
      html += '</table>';
    }

    // 每日开运习惯
    if (suggestions.dailyHabits && suggestions.dailyHabits.habits) {
      html += '<h6 class="mt-3">每日开运习惯</h6>';
      html += '<ul class="suggestion-list">';
      for (var h of suggestions.dailyHabits.habits) {
        html += '<li>' + h + '</li>';
      }
      html += '</ul>';
      html += '<small class="text-muted">' + suggestions.dailyHabits.summary + '</small>';
    }

    // 忌神规避
    if (suggestions.avoidAdvice) {
      html += '<div class="alert alert-secondary mt-3 small">';
      html += '<strong>需要适度避免的：</strong>' + suggestions.avoidAdvice.advice + '<br>';
      html += '<small>' + suggestions.avoidAdvice.tip + '</small>';
      html += '</div>';
    }
  }

  html += '</div>';
  return html;
}

function renderPopularLife(life) {
  if (!life) return '';
  var html = '<div class="popular-section">';
  html += '<h5>📋 生活建议</h5>';

  if (life.career) {
    html += '<h6>💼 事业</h6><p>' + life.career.summary + '</p>';
  }
  if (life.wealth) {
    html += '<h6>💰 财运</h6><p>' + life.wealth.summary + '</p>';
  }
  if (life.relationship) {
    html += '<h6>❤️ 感情</h6><p>' + life.relationship.summary + '</p>';
  }
  if (life.health) {
    html += '<h6>🏥 健康</h6><p>' + life.health.summary + '</p>';
  }

  html += '</div>';
  return html;
}

function renderPopularYunshi(yunshi) {
  if (!yunshi) return '';
  var html = '<div class="popular-section">';
  html += '<h5>🔮 当前运势</h5>';
  html += '<p>' + yunshi.summary + '</p>';
  html += '</div>';
  return html;
}

// 姓名分析
function renderPopularName(na) {
  var html = '<div class="popular-section">';
  html += '<h5>📝 姓名五行分析</h5>';
  html += '<p>' + na.summary + '</p>';

  // 逐字分析
  html += '<table class="table table-sm table-bordered mt-2">';
  html += '<thead><tr><th>字</th><th>五行</th><th>与日主关系</th></tr></thead><tbody>';
  for (var ca of na.chars) {
    var wxClass = 'wx-' + wxToPinyin(ca.wuxing);
    html += '<tr><td class="fw-bold">' + ca.char + '</td>';
    html += '<td class="' + wxClass + ' fw-bold">' + ca.wuxing + '</td>';
    html += '<td>' + ca.relation + '</td></tr>';
  }
  html += '</tbody></table>';

  // 补益判断
  var verdictColor = na.verdict === '补益' ? 'success' : (na.verdict === '克泄' ? 'warning' : 'secondary');
  html += '<div class="alert alert-' + verdictColor + '">';
  html += '<strong>姓名对日主：' + na.verdict + '</strong>（补益' + na.beneficial + '字，克泄' + na.harmful + '字）<br>';
  html += na.suggestion;
  html += '</div>';

  if (na.yongshenVerdict) {
    html += '<div class="alert alert-info">' + na.yongshenVerdict + '</div>';
  }

  html += '</div>';
  return html;
}

function renderRoleChart() {
  var el = document.getElementById('roleChart');
  if (!el || !reportData) return;
  if (chartsRendered.role) return;

  var rel = reportData.popular.personality.relation;
  if (!rel || !rel.patterns) return;

  // 5个互动维度，映射到评分
  var levelScore = { '强': 85, '外放': 85, '主动': 85, '中': 50, '中等': 50, '弱': 15, '内敛': 15, '被动': 15 };
  var values = rel.patterns.map(function(p) { return levelScore[p.level] || 50; });
  var indicators = rel.patterns.map(function(p) { return { name: p.dim, max: 100 }; });

  var chart = echarts.init(el);
  chart.setOption({
    tooltip: { formatter: function(params) { return params.name + '：' + params.value; } },
    radar: {
      indicator: indicators,
      radius: '65%',
      center: ['50%', '52%'],
      axisName: { fontSize: 12, color: '#2c3e50' }
    },
    series: [{
      type: 'radar',
      data: [{
        value: values, name: '互动模式',
        areaStyle: { color: 'rgba(0,123,255,0.15)' },
        lineStyle: { color: '#007bff', width: 2 },
        itemStyle: { color: '#007bff' },
        label: { show: true, fontSize: 11 }
      }]
    }]
  });
  chartsRendered.role = true;
}

// ============ 工具函数 ============
function wxToPinyin(wx) {
  var map = { '木': 'mu', '火': 'huo', '土': 'tu', '金': 'jin', '水': 'shui' };
  return map[wx] || '';
}

function getGanWx(gan) {
  var map = { '甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水' };
  return map[gan] || '';
}

function jixiongToClass(level) {
  var map = { '吉': 'ji', '小吉': 'xiaoji', '平': 'ping', '小凶': 'xiaoxiong', '凶': 'xiong' };
  return map[level] || 'ping';
}

function jixiongBadgeClass(level) {
  var map = { '吉': 'badge-ji', '小吉': 'badge-xiaoji', '平': 'badge-ping', '小凶': 'badge-xiaoxiong', '凶': 'badge-xiong' };
  return map[level] || 'badge-ping';
}

function combinedBadgeClass(combined) {
  var map = {
    '大吉': 'badge-da-ji', '多吉少凶': 'badge-duo-ji', '吉': 'badge-ji',
    '小吉': 'badge-xiaoji', '平': 'badge-ping',
    '小凶': 'badge-xiaoxiong', '凶': 'badge-xiong',
    '多凶少吉': 'badge-duo-xiong', '大凶': 'badge-da-xiong'
  };
  return map[combined] || 'badge-ping';
}
