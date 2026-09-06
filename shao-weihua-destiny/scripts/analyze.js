#!/usr/bin/env node
/**
 * analyze.js - 邵伟华命理分析 CLI 入口
 * 
 * 用法:
 *   node analyze.js --year 1990 --month 6 --day 15 --hour 10 --gender male
 *   node analyze.js --year 1990 --month 6 --day 15 --hour 10 --gender male --full
 *   node analyze.js --year 1990 --month 6 --day 15 --hour 10 --gender male --basic
 */

// 设置 NODE_PATH 以找到 lunar-javascript
var path = require('path');
var fs = require('fs');

// 尝试多个可能的 node_modules 路径
var possiblePaths = [
  path.join(__dirname, 'node_modules'),
  path.join(__dirname, '..', '..', '..', '..', 'WorkBuddy', '2026-07-03-21-53-51', 'node_modules'),
  path.join(process.env.HOME || process.env.USERPROFILE || '', 'WorkBuddy', '2026-07-03-21-53-51', 'node_modules')
];

for (var p of possiblePaths) {
  if (fs.existsSync(p)) {
    require('module').globalPaths.push(p);
    break;
  }
}

var { paipan } = require('./bazi');
var { generateReport } = require('./report');

// 解析命令行参数
function parseArgs() {
  var args = process.argv.slice(2);
  var params = {};
  for (var i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      var key = args[i].slice(2);
      var next = args[i + 1];
      if (next && !next.startsWith('--')) {
        params[key] = next;
        i++;
      } else {
        params[key] = true;
      }
    }
  }
  return params;
}

var params = parseArgs();

if (!params.year || !params.month || !params.day || params.hour === undefined || !params.gender) {
  console.error('用法: node analyze.js --year YYYY --month MM --day DD --hour HH --gender male|female [--full|--basic]');
  console.error('  --full   完整分析报告（默认）');
  console.error('  --basic  仅排盘信息');
  process.exit(1);
}

try {
  var year = parseInt(params.year);
  var month = parseInt(params.month);
  var day = parseInt(params.day);
  var hour = parseInt(params.hour);
  var gender = params.gender;

  var paipanResult = paipan(year, month, day, hour, gender);

  if (params.basic) {
    // 仅排盘
    var output = {
      success: true,
      data: {
        dayGan: paipanResult.dayGan,
        pillars: paipanResult.pillars,
        extras: paipanResult.extras
      }
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    // 完整分析
    var report = generateReport(paipanResult);
    console.log(JSON.stringify({ success: true, data: report }, null, 2));
  }
} catch (e) {
  console.error(JSON.stringify({ success: false, error: e.message }));
  process.exit(1);
}
