/**
 * translator.js - 通俗化翻译引擎（核心模块）
 * 将专业命理字段翻译成普通人能懂的白话
 *
 * 纯函数模块，不依赖 lunar-javascript
 */

// ============ 映射表 ============

/**
 * 十神 → 人格角色（10种）
 */
const SHISHEN_ROLE = {
  '正官': {
    name: '规则管理者',
    desc: '你天生守纪律、重责任，适合体制内和管理岗。你是那种"说到做到"的人，别人放心把事交给你。',
    overStrong: '过度则刻板、墨守成规，容易错过创新机会',
    radarDim: '责任'
  },
  '七杀': {
    name: '挑战者',
    desc: '你果断有魄力、不服输，危机中爆发力极强。越是逆境越能激发你的潜能。',
    overStrong: '需防偏激霸道，学会听取不同声音',
    radarDim: '魄力'
  },
  '正印': {
    name: '守护者',
    desc: '你善良重感情，喜欢照顾别人，贵人缘好。学习能力强，适合教育和关怀类工作。',
    overStrong: '过度则缺乏进取，容易依赖他人',
    radarDim: '包容'
  },
  '偏印': {
    name: '独立思考者',
    desc: '你敏感多疑、洞察力强，常有独到见解。适合研究、艺术、玄学等需要深度的领域。',
    overStrong: '需防孤独冷漠，多与人交流',
    radarDim: '洞察'
  },
  '食神': {
    name: '享乐主义者',
    desc: '你温和有才艺、懂生活，福气厚。擅长表达和创造，人际关系融洽。',
    overStrong: '需防懒散迂腐，保持行动力',
    radarDim: '才情'
  },
  '伤官': {
    name: '颠覆创造者',
    desc: '你聪明叛逆、锋芒毕露、爱表达。适合创意、媒体、技术等需要突破常规的领域。',
    overStrong: '需防桀骜任性，学会在规则内发挥',
    radarDim: '创造'
  },
  '正财': {
    name: '稳健实干家',
    desc: '你勤俭务实、可靠踏实，理财有一套。适合稳定的职业路径，靠积累获得财富。',
    overStrong: '需防苟且懦弱，适当冒险',
    radarDim: '务实'
  },
  '偏财': {
    name: '社交达人',
    desc: '你慷慨豪爽、人脉广、善抓机会。适合经商、销售、投资等需要社交和判断力的领域。',
    overStrong: '需防浮华无节制，做好风控',
    radarDim: '社交'
  },
  '比肩': {
    name: '独立战士',
    desc: '你自尊刚健、独行侠性格、能扛事。适合独立作业或创业，不依赖他人也能成事。',
    overStrong: '需防孤僻不合群，学会合作',
    radarDim: '独立'
  },
  '劫财': {
    name: '冲动冒险家',
    desc: '你好胜敢拼、投机性强、行动力强。适合竞争激烈的领域，能在乱局中找到机会。',
    overStrong: '需防盲目蛮横，三思而后行',
    radarDim: '冒险'
  }
};

/**
 * 身旺/身弱 → 白话解释
 */
const WANGSHUAI_PLAIN = {
  '身旺': {
    title: '你的能量偏强',
    metaphor: '你的"电池容量"偏大',
    strength: '能量足、抗压强、爱主导，闲着反而憋屈',
    advice: '你需要"放电"——多做事、多运动、多扛责任反而顺。学会倾听与放权，别事事亲力亲为。',
    workplace: '适合主导型岗位、创业、高压行业',
    caution: '注意别太固执，听不进劝会错失良机'
  },
  '身弱': {
    title: '你的能量偏柔',
    metaphor: '你的"电池容量"偏小',
    strength: '敏感共情、灵活善借力，人缘通常不错',
    advice: '你需要"充电"——休息、学习、靠近支持你的人反而顺。聚焦少数要事，善用团队与贵人，规律作息。',
    workplace: '适合协作型岗位、专业细分领域、有靠山的平台',
    caution: '别硬扛，易透支；学会说不，保护自己的精力'
  }
};

/**
 * 用神 → 生活方式建议
 */
const YONGSHEN_LIFESTYLE = {
  '木': {
    summary: '你适合"木属性"的生活方式——生长、向上、自然',
    habits: ['多接触自然，养绿植', '穿绿色系衣物', '晨起散步，呼吸新鲜空气', '读书写作，保持学习', '办公桌面向东方'],
    avoid: '少熬夜、少待在密闭空间'
  },
  '火': {
    summary: '你适合"火属性"的生活方式——热情、明亮、表达',
    habits: ['多晒太阳，保持温暖', '穿红橙紫色系衣物', '参与热闹场合，保持社交', '午间活动，保持热情', '办公桌面向南方'],
    avoid: '少独处、少接触阴冷环境'
  },
  '土': {
    summary: '你适合"土属性"的生活方式——稳定、厚重、积累',
    habits: ['规律作息，三餐定时', '亲近土地，园艺或徒步', '穿大地色系衣物', '整理收纳，保持环境整洁', '稳扎稳打，不急于求成'],
    avoid: '少奔波、少频繁变动'
  },
  '金': {
    summary: '你适合"金属性"的生活方式——自律、规则、锋芒',
    habits: ['自律锻炼，保持规律', '穿白银灰色系衣物', '善用金属工具和规则', '断舍离，保持精简', '办公桌面向西方'],
    avoid: '少拖泥带水、少优柔寡断'
  },
  '水': {
    summary: '你适合"水属性"的生活方式——流动、灵活、深度',
    habits: ['多喝水，保持水分', '近水活动，游泳或临水散步', '穿蓝黑色系衣物', '冥想阅读，保持内心流动', '办公桌面向北方'],
    avoid: '少固执、少钻牛角尖'
  }
};

/**
 * 五行 → 幸运色(三场景)/数字/方位/行业/体质
 */
const WUXING_LUCKY = {
  '木': {
    colors: { outfit: '青绿色、草绿色', home: '绿植、原木家具', workplace: '森林绿、薄荷绿' },
    numbers: [3, 8],
    direction: '东方',
    industries: ['教育', '出版', '文创', '园艺', '医药', '家具', '纺织', '环保'],
    health: { organ: '肝胆', avoid: '酗酒、动怒', recommend: '多吃绿叶菜、早睡早起' },
    accessories: ['檀木手串', '沉香念珠', '绿幽灵水晶', '翡翠', '橄榄石', '绿松石', '木质佛珠'],
    fengshui: { items: '书桌放小型绿植（如文竹、富贵竹）', layout: '东方保持通透，多放木质家具', avoid: '少放金属利器在东方' }
  },
  '火': {
    colors: { outfit: '红色、橙色、紫色', home: '暖光、红色软装', workplace: '正红、砖红色' },
    numbers: [2, 7],
    direction: '南方',
    industries: ['能源', '电力', '餐饮', '影视', '传媒', '美容', '电子', '照明'],
    health: { organ: '心血管', avoid: '熬夜、过劳', recommend: '红色食物、午休养心' },
    accessories: ['红玛瑙', '石榴石', '紫水晶', '红纹石', '朱砂', '南红', '红宝石'],
    fengshui: { items: '南面窗台放红色摆件或暖色台灯', layout: '保持南向采光充足', avoid: '南方不宜堆放杂物遮挡光线' }
  },
  '土': {
    colors: { outfit: '卡其、焦糖、大地色', home: '陶瓷、黄褐色软装', workplace: '驼色、米黄色' },
    numbers: [5, 0],
    direction: '东北方/西南方',
    industries: ['房地产', '建筑', '农业', '陶瓷', '仓储', '物业', '矿产'],
    health: { organ: '脾胃', avoid: '生冷、暴饮暴食', recommend: '黄色食物、细嚼慢咽' },
    accessories: ['黄水晶', '琥珀', '蜜蜡', '虎眼石', '黄玉', '陶瓷饰品', '和田玉'],
    fengshui: { items: '客厅中央放黄色地毯或陶瓷花瓶', layout: '家中中央保持整洁空旷', avoid: '中央不宜放太多金属或水景物品' }
  },
  '金': {
    colors: { outfit: '白色、银色、金属灰', home: '金属质感、白色', workplace: '纯白、银灰色' },
    numbers: [4, 9],
    direction: '西方',
    industries: ['金融', '机械', '汽车', '五金', '珠宝', '法律', '军警', 'IT硬件'],
    health: { organ: '肺呼吸系统', avoid: '燥热、吸烟', recommend: '白色食物、深呼吸练习' },
    accessories: ['白水晶', '银手镯', '金属手表', '铜钱', '白玉', '月光石', '钛晶'],
    fengshui: { items: '西面放金属风铃或铜器摆件', layout: '西方宜整洁干净，可放白色收纳', avoid: '西方不宜放太多红色或木质物品' }
  },
  '水': {
    colors: { outfit: '蓝色、黑色、深灰', home: '水景、蓝色软装', workplace: '海军蓝、藏青色' },
    numbers: [1, 6],
    direction: '北方',
    industries: ['航运', '水产', '旅游', '物流', '贸易', '饮料', '酒店', '信息技术'],
    health: { organ: '肾泌尿系统', avoid: '寒凉', recommend: '黑色食物、保暖腰部' },
    accessories: ['黑曜石', '海蓝宝', '月光石', '青金石', '黑玛瑙', '蓝砂石', '海纹石'],
    fengshui: { items: '北方放小鱼缸或流水摆件', layout: '北方宜安静阴暗，适合做书房或卧室', avoid: '北方不宜放太多红色或燥热物品' }
  }
};

/**
 * 当前运势（大运流年吉凶）→ 白话
 */
const YUNSHI_PLAIN = {
  '大吉': '这段日子是顺势期，适合推进重要计划、主动出击。好运来了要接住。',
  '吉': '这段日子整体不错，适合推进重要计划、主动出击。',
  '多吉少凶': '整体偏好，抓住主要机会，小事可以放一放。',
  '小吉': '小有助力，稳扎稳打会有收获，别贪大。',
  '平': '平稳过渡期，蓄力为主，不冒进也不躺平。',
  '小凶': '收紧防守期，重大决策缓一缓，做好风控。',
  '多凶少吉': '偏紧的一段日子，保守为主，避免大动作。',
  '凶': '低能量期，保健康保关系为主，避免大动作。',
  '大凶': '低能量期，以守为主，保健康保关系，避免任何大动作。'
};

// ============ 翻译函数 ============

/**
 * 翻译心性分析 → 多维度人格画像
 *
 * 不再用"十神→人格角色"的简单映射。
 * 改用四层模型（邵伟华+子平真诠+穷通宝鉴融合）：
 *   Layer 1: 日干本性（先天底色——五行之德）
 *   Layer 2: 格局定位（人生赛道——月令格局）
 *   Layer 3: 五行平衡（性格偏执——太过/不及）
 *   Layer 4: 十神配置（关系模式——你如何与世界互动）
 */
function translateXinXing(report) {
  var c = report.comprehensive;
  if (!c || !c.xinXing) return null;

  var dayGan = report.basic.dayGan;
  var dayWx = report.basic.dayWx;
  var dayIdx = require('./constants').TIANGAN.indexOf(dayGan);
  var yinYang = dayIdx % 2 === 0 ? '阳' : '阴';
  var wxXing = c.xinXing.wxXing;

  // Layer 1: 日干本性
  var nature = buildDayMasterNature(dayGan, dayWx, yinYang, wxXing, report.wangShuai);

  // Layer 2: 格局定位（月令格局）
  var geju = buildGeJu(report);

  // Layer 3: 五行平衡
  var balance = buildWuxingBalance(report);

  // Layer 4: 十神配置（关系模式，从"角色"变为"模式"）
  var ssFull = countShiShen(report);
  var relation = buildRelationPattern(ssFull, report);

  return {
    dayGan: dayGan, dayWx: dayWx, yinYang: yinYang,
    nature: nature,
    geju: geju,
    balance: balance,
    relation: relation,
    shiShenDist: ssFull,
    summary: nature.summary + geju.summary + balance.summary + relation.summary
  };
}

// ========== Layer 1: 日干本性 ==========
function buildDayMasterNature(dayGan, dayWx, yinYang, wxXing, wangShuai) {
  // 五行之德（邵伟华体系核心）
  var wuDe = { '木':'仁','火':'礼','土':'信','金':'义','水':'智' };
  var de = wuDe[dayWx] || '';

  // 每个天干的独特性格（穷通宝鉴精华）
  var ganPersonality = {
    '甲': { tag: '参天大树', desc: '正直向上、有领导力、敢担当。像一棵大树，站得直、长得高，天生适合带领方向。', traits: '正直、领导、担当、进取' },
    '乙': { tag: '柔韧藤蔓', desc: '温和灵活、善于合作、不硬碰硬。像藤蔓一样懂得借力和转弯，人缘好但有时缺乏主见。', traits: '温和、灵活、合作、善变' },
    '丙': { tag: '太阳之光', desc: '热情开朗、慷慨大方、感染力强。像太阳一样照亮别人，走到哪都是焦点，但有时过于直接。', traits: '热情、开朗、慷慨、张扬' },
    '丁': { tag: '星火之芒', desc: '细腻温暖、有内在光芒、观察力强。不像太阳那么张扬，但持久而深入，善于发现细节。', traits: '细腻、温暖、洞察、持久' },
    '戊': { tag: '厚重城墙', desc: '稳重可靠、实在守信、脚踏实地。像城墙一样厚重，给人安全感，但有时过于保守。', traits: '稳重、可靠、守信、保守' },
    '己': { tag: '田园沃土', desc: '包容温和、善于滋养、有耐心。像田地一样默默培育，善于照顾人，但有时缺乏锋芒。', traits: '包容、温和、滋养、耐心' },
    '庚': { tag: '利刃之锋', desc: '果断刚毅、重义气、敢作敢当。像一把刀，直接干脆不拖泥带水，但有时过于刚硬。', traits: '果断、刚毅、义气、直接' },
    '辛': { tag: '精雕细琢', desc: '精致讲究、有品位、注重细节。像珠宝一样讲究质感，对自己和他人要求高。', traits: '精致、讲究、敏锐、挑剔' },
    '壬': { tag: '江河奔流', desc: '聪明灵活、善于流动、适应力强。像江水一样有大局观，能屈能伸，但有时难以捉摸。', traits: '聪明、灵活、大度、善变' },
    '癸': { tag: '雨露滋润', desc: '细腻敏感、有深度、善思考。像细雨一样润物无声，心思缜密，但有时想太多。', traits: '细腻、敏感、深思、内敛' }
  };

  var gp = ganPersonality[dayGan] || { tag: dayWx, desc: wxXing ? wxXing.traits : '', traits: '' };

  // 阴阳维度
  var yinYangDesc = yinYang === '阳' ? '偏主动、外显、果断' : '偏被动、内敛、谨慎';

  // 身旺身弱修饰
  var wsNote = '';
  if (wangShuai && wangShuai.result === '身旺') {
    wsNote = '你日干偏旺，本性特征会表现得比较充分。';
  } else if (wangShuai && wangShuai.result === '身弱') {
    wsNote = '你日干偏弱，本性特征可能不会全部外显——能量不够时人会"收着"，别人看到的不是你全部。';
  }

  return {
    dayGan: dayGan, dayWx: dayWx, yinYang: yinYang,
    wuDe: de, deDesc: '五德主" ' + de + ' "，代表你的先天底色是' + (wxXing ? wxXing.traits : ''),
    tag: gp.tag,
    personality: gp.desc,
    traits: gp.traits,
    yinYangDesc: yinYangDesc,
    wsNote: wsNote,
    summary: '日干' + dayGan + '（' + dayWx + '，' + yinYang + '），如' + gp.tag + '。' + gp.desc + wsNote
  };
}

// ========== Layer 2: 格局定位（月令格局） ==========
function buildGeJu(report) {
  var monthZhi = report.pillars.month.zhi;
  var dayGan = report.basic.dayGan;

  // 月令地支对应的本气十神（用藏干本气对日干的关系来定格局）
  var { CANGGAN, getShiShen } = require('./constants');
  var benqi = CANGGAN[monthZhi] ? CANGGAN[monthZhi][0] : null;
  if (!benqi) return { summary: '' };

  var geSS = getShiShen(dayGan, benqi);
  var gejuMap = {
    '正官': { name: '正官格', desc: '你的人生倾向于"循规矩、走正路"。适合体制内、管理岗、需要规则和秩序的领域。为人正直负责，但别太刻板。', style: '规则型' },
    '七杀': { name: '七杀格', desc: '你的人生倾向于"迎挑战、破常规"。适合竞争激烈的领域、军警司法、创业赛道。果断有魄力，危机中爆发力强。但注意别偏激。', style: '挑战型' },
    '正印': { name: '正印格', desc: '你的人生倾向于"靠知识、借贵人"。适合教育、研究、文化领域。学习能力强，善良重感情。但别太依赖。', style: '学者型' },
    '偏印': { name: '偏印格', desc: '你的人生倾向于"走偏锋、钻深度"。适合艺术、技术、玄学等需要独特视角的领域。洞察力强但容易孤独。', style: '独创型' },
    '正财': { name: '正财格', desc: '你的人生倾向于"踏实干、稳积累"。适合稳定的职业和理财路径。勤俭务实可靠，是那种"靠得住"的人。', style: '务实型' },
    '偏财': { name: '偏财格', desc: '你的人生倾向于"抓机会、广结缘"。适合经商、投资、销售等需要人脉和判断力的领域。慷慨豪爽但别浮华。', style: '社交型' },
    '食神': { name: '食神格', desc: '你的人生倾向于"用才华、享生活"。适合艺术、表达、服务等需要创意和温度的领域。温文随和福气好。', style: '才艺型' },
    '伤官': { name: '伤官格', desc: '你的人生倾向于"破旧立新、大胆表达"。适合创意、媒体、技术等需要打破常规的领域。聪明叛逆但别太任性。', style: '创造型' },
    '比肩': { name: '建禄格', desc: '你的人生倾向于"靠自己、走独立"。适合创业、自由职业、需要自主权的领域。独立扛事但需学合作。', style: '独立型' },
    '劫财': { name: '月刃格', desc: '你的人生倾向于"敢拼敢闯、不怕竞争"。适合需要魄力和行动力的领域。热诚坦直冲劲足，但要防冲动。', style: '拼搏型' }
  };

  var gj = gejuMap[geSS] || { name: '杂格', desc: '格局偏杂，人生路径较多元，不拘一格。', style: '多元型' };

  return {
    name: gj.name,
    style: gj.style,
    monthZhi: monthZhi,
    benQiSS: geSS,
    desc: gj.desc,
    summary: '格局为' + gj.name + '（月令' + monthZhi + '），' + gj.desc
  };
}

// ========== Layer 3: 五行平衡 ==========
function buildWuxingBalance(report) {
  var dist = report.wuxingDist;
  if (!dist) return { summary: '' };

  var wxs = ['木','火','土','金','水'];
  var total = 0;
  wxs.forEach(function(w){ total += (dist[w] || 0); });

  var dayWx = report.basic.dayWx;
  var excess = []; // 太旺
  var deficit = []; // 太弱

  // 五行太过不及解读（邵伟华体系）
  var balanceNotes = {
    '木': {
      tooMuch: { trait: '固执倔强，认准了不回头', advice: '学火——多点热情灵活，少钻牛角尖' },
      tooLittle: { trait: '缺乏主见和方向感', advice: '多读书、多接触自然、培养一个长期目标' }
    },
    '火': {
      tooMuch: { trait: '急躁冲动，三分钟热度', advice: '学水——深呼吸、冥想、慢下来' },
      tooLittle: { trait: '冷淡寡言，缺乏热情', advice: '多社交、多运动、找个能点燃你的事' }
    },
    '土': {
      tooMuch: { trait: '保守迟钝，过于求稳', advice: '学木——尝试新鲜事物，打破惯性' },
      tooLittle: { trait: '缺乏诚信感，容易摇摆', advice: '建立规律、培养一个稳定习惯' }
    },
    '金': {
      tooMuch: { trait: '好斗刻薄，锋芒太露', advice: '学水——柔和一点，少较劲多包容' },
      tooLittle: { trait: '优柔寡断，缺乏决断力', advice: '设定明确规则、用清单辅助决策' }
    },
    '水': {
      tooMuch: { trait: '飘浮不定，难以捉摸', advice: '学士——扎根一件事，别同时追太多目标' },
      tooLittle: { trait: '短视固执，缺乏远见', advice: '多阅读、旅行、接触不同的观点' }
    }
  };

  var avg = total / 5;
  wxs.forEach(function(w) {
    var cnt = dist[w] || 0;
    if (cnt >= avg * 1.8 && cnt >= 2.5) excess.push({ wx: w, count: cnt, note: balanceNotes[w].tooMuch });
    if (cnt === 0 || (cnt <= 0.5 && avg > 1)) deficit.push({ wx: w, count: cnt, note: balanceNotes[w].tooLittle });
  });

  var ieType = '平衡';
  // 内外向简单判断：火(外)、金(外) 偏外；水(内)、土(内) 偏内；木居中
  var outScore = (dist['火']||0)*1 + (dist['金']||0)*0.5;
  var inScore = (dist['水']||0)*1 + (dist['土']||0)*0.5 + (dist['木']||0)*0.3;
  if (outScore > inScore + 1) ieType = '偏外向(E)';
  else if (inScore > outScore + 1) ieType = '偏内向(I)';
  else ieType = '内外兼修';

  var summary = '';
  if (excess.length > 0) {
    summary += excess.map(function(e){ return e.wx + '偏旺(' + e.note.trait + ')' }).join('；') + '。';
  }
  if (deficit.length > 0) {
    summary += deficit.map(function(d){ return d.wx + '偏弱(' + d.note.trait + ')' }).join('；') + '。';
  }
  if (!summary) summary = '五行较为均衡，性格没有明显的偏执倾向。';

  return {
    dist: dist,
    excess: excess,
    deficit: deficit,
    ieType: ieType,
    outScore: outScore,
    inScore: inScore,
    summary: '五行平衡：' + summary
  };
}

// ========== Layer 4: 十神配置 ==========
function buildRelationPattern(ssCount, report) {
  // 不再用"角色"标签，改为"关系模式"——你如何与外界互动
  var patterns = [];

  // 官杀 = 你的"规则感"
  var guanSha = (ssCount['正官']||0) + (ssCount['七杀']||0);
  // 印星 = 你的"安全感来源"
  var yinXing = (ssCount['正印']||0) + (ssCount['偏印']||0);
  // 食伤 = 你的"表达方式"
  var shiShang = (ssCount['食神']||0) + (ssCount['伤官']||0);
  // 财星 = 你的"目标驱动力"
  var caiXing = (ssCount['正财']||0) + (ssCount['偏财']||0);
  // 比劫 = 你的"竞争/合作模式"
  var biJie = (ssCount['比肩']||0) + (ssCount['劫财']||0);

  var wangShuai = report.wangShuai;

  // 规则感
  if (guanSha >= 2) patterns.push({ dim: '规则感', level: '强', desc: '你很在意外界的规则和期待，做事有底线、讲究规矩。' });
  else if (guanSha >= 1) patterns.push({ dim: '规则感', level: '中', desc: '你大体遵守规则但不僵化，有灵活度。' });
  else patterns.push({ dim: '规则感', level: '弱', desc: '你不喜欢被条条框框束缚，更愿意按自己的方式做事。' });

  // 安全感
  if (yinXing >= 2) patterns.push({ dim: '安全感', level: '强', desc: '你比较需要安全感和支持系统，喜欢有人兜底、有依靠。' });
  else if (yinXing >= 1) patterns.push({ dim: '安全感', level: '中', desc: '有一定的依赖倾向但也算独立。' });
  else patterns.push({ dim: '安全感', level: '弱', desc: '你比较独立，不太依赖别人给安全感，自己搞定。' });

  // 表达方式
  if (shiShang >= 2) patterns.push({ dim: '表达方式', level: '外放', desc: '你善于表达、爱分享、有创造力，想法多且乐于输出。' });
  else if (shiShang >= 1) patterns.push({ dim: '表达方式', level: '中等', desc: '你在表达上比较克制，想好了才说，有选择地分享。' });
  else patterns.push({ dim: '表达方式', level: '内敛', desc: '你不喜欢过多表达，更倾向于观察和思考，话少但准。' });

  // 目标驱动
  if (caiXing >= 2) patterns.push({ dim: '目标驱动', level: '强', desc: '你目标感强，对财富和成就的渴望驱动你行动。' });
  else if (caiXing >= 1) patterns.push({ dim: '目标驱动', level: '中', desc: '有一定的进取心但不会为了目标不顾一切。' });
  else patterns.push({ dim: '目标驱动', level: '弱', desc: '你对物质目标比较淡然，更看重过程和体验本身。' });

  // 竞争合作
  if (biJie >= 2) {
    patterns.push({ dim: '竞争合作', level: '主动', desc: '你独立好胜，不依赖团队也能成事，但需要注意合作。' });
  } else if (biJie >= 1) {
    patterns.push({ dim: '竞争合作', level: '中等', desc: '你能独立也能合作，比较灵活。' });
  } else {
    patterns.push({ dim: '竞争合作', level: '被动', desc: wangShuai && wangShuai.result === '身弱' ? '你更喜欢团队合作，一个人容易累，有人支持更顺。' : '你不太在意竞争关系，做好自己的事就行。' });
  }

  var summary = '在关系模式上：' + patterns.map(function(p){ return p.dim + p.level }).join('，') + '。';

  return {
    patterns: patterns,
    summary: summary,
    // 保留原十神分布给雷达图
    shiShenDist: ssCount
  };
}

/**
 * 统计命局十神分布（用于角色雷达图）
 * 全面统计：天干十神(1.0) + 地支藏干十神(0.5) + 日支藏干(0.5)
 */
function countShiShen(report) {
  var result = {};
  var pillars = report.pillars;
  if (!pillars) return result;

  var { CANGGAN, WUXING_GAN, getShiShen, TIANGAN } = require('./constants');

  // 遍历四柱
  ['year', 'month', 'day', 'time'].forEach(function(pos) {
    var p = pillars[pos];
    if (!p) return;

    // 1. 天干十神（权重1.0，日干本身跳过）
    var ssGan = p.shishenGan;
    if (ssGan && ssGan !== '日主' && SHISHEN_ROLE[ssGan]) {
      result[ssGan] = (result[ssGan] || 0) + 1.0;
    }

    // 2. 地支藏干十神（权重0.5，本气0.5，中气0.3，余气0.2）
    var zhi = p.zhi;
    var hideGan = p.hideGan || [];
    var cangGanList = CANGGAN[zhi] || [];
    // 本气是第一个，权重最高
    hideGan.forEach(function(hg, idx) {
      if (!hg || hg === pillars.day.gan) return; // 跳过日干本身
      var ss = getShiShen(pillars.day.gan, hg);
      if (ss && SHISHEN_ROLE[ss]) {
        var weight = idx === 0 ? 0.5 : (idx === 1 ? 0.3 : 0.2);
        result[ss] = (result[ss] || 0) + weight;
      }
    });
  });

  return result;
}

/**
 * 翻译旺衰分析 → 能量配置白话
 */
function translateWangShuai(report) {
  var ws = report.wangShuai;
  if (!ws) return null;

  var plain = WANGSHUAI_PLAIN[ws.result] || WANGSHUAI_PLAIN['身弱'];
  var confidence = ws.confidence || '';

  return {
    title: plain.title,
    metaphor: plain.metaphor,
    score: ws.score,
    result: ws.result,
    confidence: confidence,
    strength: plain.strength,
    advice: plain.advice,
    workplace: plain.workplace,
    caution: plain.caution,
    summary: plain.metaphor + '，' + plain.strength + '。' + plain.advice
  };
}

/**
 * 翻译用神选取 → 开运方向白话
 */
function translateYongShen(report) {
  var ys = report.yongShen;
  if (!ys) return null;

  var lifestyle = YONGSHEN_LIFESTYLE[ys.yongshen] || null;
  var lucky = WUXING_LUCKY[ys.yongshen] || null;

  return {
    yongshen: ys.yongshen,
    method: ys.method,
    lifestyle: lifestyle,
    lucky: lucky,
    summary: lifestyle
      ? '你的"开运方向"是' + ys.yongshen + '属性。' + lifestyle.summary + '。'
      : '用神为' + ys.yongshen + '。'
  };
}

/**
 * 翻译综合分析 → 生活建议
 */
function translateComprehensive(report) {
  var c = report.comprehensive;
  if (!c) return null;

  return {
    career: translateCareer(c.shiYe, report.wangShuai),
    wealth: translateWealth(c.caiYun, report.wangShuai),
    relationship: translateRelationship(c.hunYin),
    health: translateHealth(c.jianKang)
  };
}

function translateCareer(shiYe, wangShuai) {
  if (!shiYe) return null;
  var level = shiYe.level;
  var advice = '';
  if (level === '有力') {
    advice = '你的事业能量充足，有管理才能。适合在体制内或大平台发展，承担更多责任反而如鱼得水。';
  } else if (level === '中等') {
    advice = '你的事业能量中等，稳步发展是主旋律。选一个方向深耕，比频繁跳槽更适合你。';
  } else {
    advice = '你的事业能量偏弱，不太喜欢被管束。自由职业、创业或专业细分领域可能更适合你。';
  }
  return { level: level, summary: advice, detail: shiYe.summary };
}

function translateWealth(caiYun, wangShuai) {
  if (!caiYun) return null;
  var level = caiYun.level;
  var advice = '';
  if (level === '财旺身旺') {
    advice = '财运不错，身旺能担财。适合主动理财、经商投资，有赚钱的命也有花钱的智慧。';
  } else if (level === '财旺身弱') {
    advice = '财星多但你"担不动"。别贪大，稳健理财为主，过度追求物质反而累身。';
  } else if (level === '中等') {
    advice = '财运平稳，适合稳健理财。定投、储蓄类方式比投机更适合你。';
  } else {
    advice = '财运偏淡，别强求横财。把精力放在提升自己上，财自然来。';
  }
  return { level: level, summary: advice, detail: caiYun.summary };
}

function translateRelationship(hunYin) {
  if (!hunYin) return null;
  return { summary: hunYin.summary, detail: '' };
}

function translateHealth(jianKang) {
  if (!jianKang) return null;
  return { summary: jianKang.summary, issues: jianKang.issues || [] };
}

/**
 * 翻译当前运势 → 白话
 */
function translateDaYun(report) {
  var cd = report.currentDaYun;
  var cl = report.currentLiuNian;
  if (!cd) return null;

  var dyLevel = cd.jixiong ? cd.jixiong.level : '平';
  var combined = cl && cl.jixiong ? cl.jixiong.combined : dyLevel;
  var plain = YUNSHI_PLAIN[combined] || YUNSHI_PLAIN['平'];

  return {
    currentDaYun: {
      ganzhi: cd.ganzhi,
      ageRange: cd.startAge + '-' + cd.endAge + '岁',
      yearRange: cd.startYear + '-' + cd.endYear + '年',
      level: dyLevel,
      plain: plain
    },
    currentLiuNian: cl ? {
      year: cl.year,
      ganzhi: cl.ganzhi,
      combined: combined,
      plain: plain
    } : null,
    summary: '当前大运' + cd.ganzhi + '（' + cd.startAge + '-' + cd.endAge + '岁）。' + plain +
      (cl ? '今年' + cl.year + '年' + cl.ganzhi + '，' + plain : '')
  };
}

/**
 * 聚合：构建完整通俗模式报告
 */
function buildPopularReport(report) {
  return {
    personality: translateXinXing(report),
    energy: translateWangShuai(report),
    kaiyun: translateYongShen(report),
    life: translateComprehensive(report),
    yunshi: translateDaYun(report),
    disclaimer: '命理学属于传统文化研究范畴，非科学。这份解读只是帮你了解自己的"出厂配置"，不是定论。没有不好的命盘，只有需要调整的配比。'
  };
}

module.exports = {
  SHISHEN_ROLE,
  WANGSHUAI_PLAIN,
  YONGSHEN_LIFESTYLE,
  WUXING_LUCKY,
  YUNSHI_PLAIN,
  translateXinXing,
  translateWangShuai,
  translateYongShen,
  translateComprehensive,
  translateDaYun,
  buildPopularReport
};
