/* 无限恐怖 2.5R · 加值叠算引擎（V1）
 * 依据：规则术语「本质与加值类型」「衍生属性段」「传奇属性」「常用动作」「防御类动作」
 */
(function (global) {
  "use strict";

  var ATTRS = ["力量", "敏捷", "耐力", "智力", "感知", "决心", "风度", "操控", "沉着"];
  var ATTR_GROUP = {
    力量: "生理", 敏捷: "生理", 耐力: "生理",
    智力: "心智", 感知: "心智", 决心: "心智",
    风度: "互动", 操控: "互动", 沉着: "互动"
  };
  var SKILLS = {
    运动: "生理", 肉搏: "生理", 驾驶: "生理", 枪械: "生理",
    手上功夫: "生理", 躲藏: "生理", 求生: "生理", 白刃: "生理",
    学识: "心智", 电脑: "心智", 调查: "心智", 医学: "心智",
    神秘学: "心智", 科学: "心智",
    动物沟通: "互动", 感受: "互动", 胁迫: "互动", 交际: "互动", 掩饰: "互动"
  };
  var SUBSKILL_PARENTS = ["手艺", "表达"];
  var CATEGORIES = ["专长", "血统", "改造", "瞳术", "能力组", "技艺", "能量", "物品", "其他"];
  var ESSENCES = ["自然", "科技", "特异", "魔幻", "无"];

  var BONUS_TYPES = [
    "内在", "修行", "增强", "器械", "士气", "表现", "招式",
    "闪避", "天生防御", "盔甲防御", "洞察", "格挡", "环境",
    "幸运", "力场", "神圣", "亵渎", "掩蔽", "无名", "专业", "专长",
    "表演", "完美", "体积", "瞄准", "盾牌防御"
  ];

  var KINDS = [
    { id: "attr", label: "属性加值" },
    { id: "skillRank", label: "技能等级" },
    { id: "checkDp", label: "判定 DP" },
    { id: "attrReplace", label: "取代判定属性" },
    { id: "extraSuccess", label: "附加成功" },
    { id: "derived", label: "衍生属性" },
    { id: "defense", label: "防御构成" },
    { id: "energyPool", label: "能量池" },
    { id: "misc", label: "其他（DR / 备注）" }
  ];

  var VALUE_SOURCES = [
    { id: "attr", label: "属性值" },
    { id: "legendary", label: "传奇点数" },
    { id: "skill", label: "技能等级" },
    { id: "entryLevel", label: "条目等级" },
    { id: "influence", label: "影响力" },
    { id: "control", label: "控制力" }
  ];

  var CAP_MODES = [
    { id: "none", label: "无上限" },
    { id: "fixed", label: "固定上限" },
    { id: "entryLevel", label: "条目等级 × N" },
    { id: "attr", label: "属性 × N" }
  ];

  var ENERGY_PARTS = [
    { id: "cap", label: "能量池上限" },
    { id: "hourly", label: "每小时回复" },
    { id: "rest8", label: "每8小时回复" }
  ];

  /* 能力组/支线等级：D=1 C=3 B=9 A=27 S=81 SS=243。专长等级若写数字则按数字。 */
  var RANK_STEPS = [
    { key: "SS", n: 243 },
    { key: "S", n: 81 },
    { key: "A", n: 27 },
    { key: "B", n: 9 },
    { key: "C", n: 3 },
    { key: "D", n: 1 }
  ];

  var ENHANCE_RANKS = [
    { id: "", label: "无", cap: 0, hourly: 0 },
    { id: "D", label: "D 基础（上限+10，每小时 1）", cap: 10, hourly: 1 },
    { id: "C", label: "C 次级（上限+30，每小时 2）", cap: 30, hourly: 2 },
    { id: "B", label: "B 中级（上限+70，每小时 4）", cap: 70, hourly: 4 },
    { id: "A", label: "A 高级（上限+150，每小时 8）", cap: 150, hourly: 8 }
  ];

  var ENERGY_TEMPLATES = [
    { id: "custom", name: "自定义", attr1: "智力", attr2: "感知", divisor: 4, rest8: "custom", hourly: "enhance", category: "generic" },
    { id: "spirit", name: "灵力", attr1: "决心", attr2: "沉着", divisor: 4, rest8: "minKey", hourly: "enhance", shortRest: "minKeyLegendary", category: "generic", note: "消耗称灵感疲劳。长休息回复关键属性较低者。" },
    { id: "manaMind", name: "精神魔力", attr1: "智力", attr2: "感知", divisor: 4, rest8: "toMax", hourly: "sumLegendary", category: "generic", note: "长休息回满。冥想每小时回复关键属性传奇之和。" },
    { id: "manaInnate", name: "天生魔力", attr1: "耐力", attr2: "风度", divisor: 4, rest8: "toMaxFrom24x3", hourly: "spread24x3", category: "generic", note: "24 小时回复到三倍上限，分摊到可回复 1 点的时间上。" },
    { id: "manaLife", name: "生命魔力", attr1: "耐力", attr2: "智力", divisor: 4, rest8: "spread24", hourly: "spread24", category: "generic", note: "24 小时回复到上限，分摊到最小可回复时间。" },
    { id: "stamina", name: "精力", attr1: "耐力", attr2: "智力", divisor: 1, rest8: "toMax", hourly: "enhance", shortRest: "maxKeyLegendary", linkedDerived: "energy", category: "generic", note: "上限取衍生精力。长休息回满；短休息回复较高关键属性传奇。" },
    { id: "willpower", name: "意志力", attr1: "决心", attr2: "沉着", divisor: 1, rest8: "toMax", hourly: "enhance", linkedDerived: "willpower", category: "generic", note: "上限取衍生意志力。能量池强化不增加意志值或意志检定。" }
  ];

  var DERIVED_TARGETS = [
    { id: "hp", label: "生命值上限" },
    { id: "speed", label: "移动速度" },
    { id: "initiative", label: "先攻" },
    { id: "willValue", label: "意志值" },
    { id: "willpower", label: "意志力上限" },
    { id: "energy", label: "精力上限" },
    { id: "sense", label: "敏感范围" },
    { id: "blur", label: "模糊范围" },
    { id: "influence", label: "影响力" },
    { id: "control", label: "控制力" },
    { id: "volume", label: "体积" },
    { id: "baseDefense", label: "基础防御" },
    { id: "damageCap", label: "伤害上限" }
  ];

  var DEFENSE_PARTS = [
    { id: "base", label: "基础防御" },
    { id: "dodge", label: "闪避防御" },
    { id: "insight", label: "洞察防御" },
    { id: "armor", label: "盔甲防御" },
    { id: "natural", label: "天生防御" },
    { id: "block", label: "格挡加值" },
    { id: "shield", label: "盾牌防御" },
    { id: "cover", label: "掩蔽防御" },
    { id: "full", label: "全力防御" },
    { id: "other", label: "防御（整体）" }
  ];

  var CHECK_DEFS = [
    { id: "initiative", name: "先攻", attrs: ["敏捷", "沉着"], skill: null, profession: null, contest: "竞争" },
    { id: "willCheck", name: "意志检定", attrs: ["决心", "沉着"], skill: null, profession: null, contest: "对抗", willDp: true },
    { id: "willSave", name: "意志豁免", attrs: ["决心", "沉着"], skill: null, profession: null, contest: "豁免", willDp: true },
    { id: "reflex", name: "反射豁免", attrs: ["敏捷"], skill: "运动", profession: "自我保护", contest: "豁免" },
    { id: "fortitude", name: "强韧豁免", attrs: ["耐力"], skill: "求生", profession: "自我保护", contest: "豁免" },
    { id: "spot", name: "侦查", attrs: ["感知"], skill: "调查", profession: "侦察", contest: "竞争" }
  ];
  var CONTESTS = ["竞争", "对抗", "豁免"];
  var SHEET_CHECK_IDS = ["willCheck", "willSave", "reflex", "fortitude", "spot"];

  var ATTACK_TYPES = [
    { id: "bow", label: "弓箭", defaultAttr: "敏捷", defaultSkill: "运动", rangeMult: 8 },
    { id: "throw", label: "投掷", defaultAttr: "敏捷", defaultSkill: "运动", rangeMult: 1 },
    { id: "gun", label: "枪械/弩", defaultAttr: "敏捷", defaultSkill: "枪械", rangeMult: 5 },
    { id: "cannon", label: "炮", defaultAttr: "智力", defaultSkill: "枪械", rangeMult: 4 },
    { id: "melee", label: "白刃", defaultAttr: "力量", defaultSkill: "白刃", rangeMult: 0 },
    { id: "brawl", label: "肉搏", defaultAttr: "力量", defaultSkill: "肉搏", rangeMult: 0 },
    { id: "custom", label: "自定义", defaultAttr: "敏捷", defaultSkill: "运动", rangeMult: 0 }
  ];

  var APPLY_PRESETS = [
    { id: "allChecks", label: "全部判定" },
    { id: "allAttacks", label: "全部攻击" },
    { id: "defense", label: "防御" },
    { id: "allSaves", label: "三豁免" },
    { id: "allWill", label: "意志检定与豁免" },
    { id: "check:initiative", label: "先攻" },
    { id: "check:willCheck", label: "意志检定" },
    { id: "check:willSave", label: "意志豁免" },
    { id: "check:reflex", label: "反射豁免" },
    { id: "check:fortitude", label: "强韧豁免" },
    { id: "check:spot", label: "侦查" },
    { id: "attackType:bow", label: "弓箭攻击" },
    { id: "attackType:throw", label: "投掷攻击" },
    { id: "attackType:gun", label: "枪械攻击" },
    { id: "attackType:cannon", label: "炮击" },
    { id: "attackType:melee", label: "白刃攻击" },
    { id: "attackType:brawl", label: "肉搏攻击" }
  ];

  var DEFAULT_TYPE_BY_CATEGORY = {
    专长: "专长", 血统: "内在", 改造: "内在", 瞳术: "内在",
    能力组: "修行", 技艺: "修行", 能量: "修行", 物品: "器械", 其他: "无名"
  };

  function uid(prefix) {
    return (prefix || "id") + "_" + Math.random().toString(36).slice(2, 10);
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function emptySkill(rank) {
    return { rank: rank || 0, professions: [] };
  }

  function emptyCharacter() {
    var attrs = {};
    ATTRS.forEach(function (a) { attrs[a] = 1; });
    var skills = {};
    Object.keys(SKILLS).forEach(function (s) { skills[s] = emptySkill(0); });
    return {
      version: 1,
      info: {
        player: "", name: "未命名", gender: "", age: "",
        height: "", race: "人类", language: "",
        appearance: "", personality: "", summary: "",
        virtue: "", vice: ""
      },
      white: { attrs: attrs, skills: skills, subskills: [], volume: 5 },
      entries: [],
      attacks: [],
      checks: [],
      energyPools: [],
      power: emptyPower()
    };
  }

  function emptyEnergyPool(templateId) {
    var tpl = energyTemplate(templateId || "spirit");
    return {
      id: uid("pool"),
      enabled: true,
      name: tpl.name,
      template: tpl.id,
      category: tpl.category || "generic",
      attr1: tpl.attr1 || "决心",
      attr2: tpl.attr2 || "沉着",
      divisor: tpl.divisor || 4,
      extraOpenings: 0,
      enhanceRank: "",
      bonusCap: 0,
      bonusHourly: 0,
      bonusRest8: 0,
      notes: tpl.note || ""
    };
  }

  function energyTemplate(id) {
    var found = ENERGY_TEMPLATES.filter(function (t) { return t.id === id; })[0];
    return found || ENERGY_TEMPLATES[0];
  }

  function enhanceInfo(rank) {
    var found = ENHANCE_RANKS.filter(function (r) { return r.id === rank; })[0];
    return found || ENHANCE_RANKS[0];
  }

  function parseRankLevel(rank, override) {
    if (override !== "" && override != null && !isNaN(Number(override))) return Number(override);
    var s = String(rank == null ? "" : rank).trim();
    if (!s) return 0;
    if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
    var upper = s.toUpperCase();
    var best = 0;
    RANK_STEPS.forEach(function (step) {
      var re = new RegExp("(?:^|[^A-Z])" + step.key + "(?:[^A-Z]|$)");
      if (re.test(upper) && step.n > best) best = step.n;
    });
    return best;
  }

  function formatSkillName(name) {
    var m = String(name || "").match(/^(手艺|表达)-(.+)$/);
    return m ? m[1] + "（" + m[2] + "）" : name;
  }

  function skillSelectNames(ch) {
    var names = Object.keys(SKILLS).slice();
    SUBSKILL_PARENTS.forEach(function (p) {
      if (names.indexOf(p) === -1) names.push(p);
    });
    (ch && ch.white && ch.white.subskills ? ch.white.subskills : []).forEach(function (sub) {
      if (sub && sub.parent && sub.name) {
        var id = sub.parent + "-" + sub.name;
        if (names.indexOf(id) === -1) names.push(id);
      }
    });
    return names;
  }

  function emptyPower() {
    return { d: 0, c: 0, b: 0, a: 0, s: 0, ss: 0, points: 0, xp: 0 };
  }

  function compactRank(n) {
    n = Math.floor(Number(n) || 0);
    if (n <= 0) return n === 0 ? "无支线" : String(n) + "D";
    var units = [["SS", 243], ["S", 81], ["A", 27], ["B", 9], ["C", 3], ["D", 1]];
    var s = "";
    units.forEach(function (u) {
      var k = Math.floor(n / u[1]);
      if (k > 0) {
        for (var i = 0; i < k; i++) s += u[0];
        n -= k * u[1];
      }
    });
    return s || "无支线";
  }

  function fmtPower(n) {
    var x = Number(n);
    if (!isFinite(x)) return "0.00";
    return (Math.round(x * 100) / 100).toFixed(2);
  }

  /* ST指南：建卡战斗力约 1。使用中的支线折成 D，再计 (分数-D个数×1000)/1500（可负，保留小数）与 经验/15（向下取整）。强度为 ND，再加 1 点初始。 */
  function combatPower(p) {
    p = p || emptyPower();
    var branchD = (Number(p.d) || 0)
      + (Number(p.c) || 0) * 3
      + (Number(p.b) || 0) * 9
      + (Number(p.a) || 0) * 27
      + (Number(p.s) || 0) * 81
      + (Number(p.ss) || 0) * 243;
    var points = Number(p.points) || 0;
    var xp = Number(p.xp) || 0;
    var fromPoints = (points - branchD * 1000) / 1500;
    var fromXp = Math.floor(xp / 15);
    var strengthD = branchD + fromPoints + fromXp;
    var nearest = Math.round(strengthD / 9) * 9;
    var near = "";
    if (strengthD > 0 && nearest > 0 && Math.abs(nearest - strengthD) > 0.005 && Math.abs(nearest - strengthD) <= 4) {
      near = "接近 " + compactRank(nearest) + "（" + fmtPower(nearest) + "D）";
    } else if (strengthD > 0 && Math.abs(strengthD % 3) < 0.005) {
      near = compactRank(strengthD);
    }
    return {
      branchD: branchD,
      fromPoints: fromPoints,
      fromXp: fromXp,
      strengthD: strengthD,
      initial: 1,
      total: strengthD + 1,
      compact: compactRank(Math.max(0, strengthD)),
      near: near
    };
  }

  function clampAgain(n) {
    var a = Number(n);
    if (!isFinite(a)) a = 10;
    if (a < 8) a = 8;
    if (a > 10) a = 10;
    return a;
  }

  function rollDie(sides, rng) {
    var r = typeof rng === "function" ? rng : Math.random;
    var n = Number(sides) || 10;
    if (n < 2) n = 2;
    return 1 + Math.floor(r() * n);
  }

  /* 解析 ww16+1 / ww16a8+1 / rd10+1 / 4d10+1 */
  function parseDiceExpr(s) {
    var raw = String(s || "").trim().replace(/\s+/g, "").toLowerCase();
    if (!raw) return { error: "请输入表达式，例如 ww16+1" };
    var ww = raw.match(/^ww(\d+)(?:a(\d+))?(?:([+-]\d+))?$/);
    if (ww) {
      return {
        kind: "ww",
        pool: Number(ww[1]),
        again: ww[2] != null ? clampAgain(ww[2]) : 10,
        extra: ww[3] ? Number(ww[3]) : 0,
        expr: raw
      };
    }
    var rd = raw.match(/^rd(\d+)(?:([+-]\d+))?$/);
    if (rd) {
      return {
        kind: "rd",
        count: 1,
        sides: Number(rd[1]),
        extra: rd[2] ? Number(rd[2]) : 0,
        expr: raw
      };
    }
    var nd = raw.match(/^(\d+)d(\d+)(?:([+-]\d+))?$/);
    if (nd) {
      return {
        kind: "rd",
        count: Number(nd[1]),
        sides: Number(nd[2]),
        extra: nd[3] ? Number(nd[3]) : 0,
        expr: raw
      };
    }
    return { error: "无法解析「" + raw + "」。可用 ww16+1、ww16a8+1、rd10+1" };
  }

  /* 核心规则：8/9/10 各 1 成功；达到加骰阈值再掷；附加成功仅在掷骰成功数 > 0 时加入。 */
  function rollWw(pool, again, extra, rng) {
    pool = Math.max(0, Math.floor(Number(pool) || 0));
    again = clampAgain(again == null ? 10 : again);
    extra = Number(extra) || 0;
    var dice = [];
    var pending = pool;
    var guard = 0;
    while (pending > 0 && guard < 400) {
      pending -= 1;
      guard += 1;
      var face = rollDie(10, rng);
      var success = face >= 8;
      var explode = face >= again;
      dice.push({ face: face, success: success, explode: explode });
      if (explode) pending += 1;
    }
    var rolledSuccess = 0;
    dice.forEach(function (d) { if (d.success) rolledSuccess += 1; });
    var extraApplied = extra > 0 ? (rolledSuccess > 0 ? extra : 0) : extra;
    return {
      kind: "ww",
      pool: pool,
      again: again,
      extra: extra,
      dice: dice,
      rolledSuccess: rolledSuccess,
      extraApplied: extraApplied,
      total: rolledSuccess + extraApplied,
      botched: rolledSuccess <= 0
    };
  }

  /* 自然骰：无加骰。d10 机运：10 视为 1 成功，1 有负面。附加成功仅在已有成功时加入。 */
  function rollRd(count, sides, extra, rng) {
    count = Math.max(1, Math.floor(Number(count) || 1));
    sides = Math.max(2, Math.floor(Number(sides) || 10));
    extra = Number(extra) || 0;
    var dice = [];
    var i;
    for (i = 0; i < count; i++) {
      var face = rollDie(sides, rng);
      dice.push({
        face: face,
        success: sides === 10 && face === 10,
        fumble: face === 1
      });
    }
    var rolledSuccess = 0;
    var sum = 0;
    dice.forEach(function (d) {
      sum += d.face;
      if (d.success) rolledSuccess += 1;
    });
    var extraApplied = extra > 0 ? (rolledSuccess > 0 ? extra : 0) : extra;
    return {
      kind: "rd",
      count: count,
      sides: sides,
      extra: extra,
      dice: dice,
      sum: sum,
      rolledSuccess: rolledSuccess,
      extraApplied: extraApplied,
      total: rolledSuccess + extraApplied,
      botched: rolledSuccess <= 0
    };
  }

  function rollParsed(parsed, rng) {
    if (!parsed || parsed.error) return parsed;
    if (parsed.kind === "ww") return rollWw(parsed.pool, parsed.again, parsed.extra, rng);
    return rollRd(parsed.count, parsed.sides, parsed.extra, rng);
  }

  function allCheckDefs(ch) {
    var extra = (ch && ch.checks ? ch.checks : []).filter(function (c) { return c && c.enabled !== false; });
    return CHECK_DEFS.concat(extra.map(function (c) {
      var attrs = [];
      if (c.attr) attrs.push(c.attr);
      if (c.attr2) attrs.push(c.attr2);
      return {
        id: c.id,
        name: c.name || "自定义检定",
        attrs: attrs.length ? attrs : ["感知"],
        skill: c.skill || null,
        profession: c.profession || null,
        contest: c.contest || "竞争",
        custom: true
      };
    }));
  }

  /* 伤害上限依据「常用动作」。传奇力量仅在以力量进行的近战（白刃/肉搏）上提升 n(n+1)/2。 */
  function damageCapInfo(preset, skills, attrs) {
    var typeInfo = ATTACK_TYPES.filter(function (t) { return t.id === preset.attackType; })[0] || ATTACK_TYPES[0];
    var skillName = preset.skill || typeInfo.defaultSkill;
    var dmg = Number(preset.weaponDamage) || 0;
    var size = Number(preset.weaponSize) || 0;
    var strReq = Number(preset.strReq) || 0;
    var skillRank = skills && skills[skillName] ? skills[skillName].total : 0;
    var str = attrs && attrs.力量 ? attrs.力量.total : 0;
    var nStr = attrs && attrs.力量 ? attrs.力量.legendary : 0;
    var parts = [];
    var formula = "";
    var type = preset.attackType;
    if (type === "bow") {
      formula = "武器伤害×2 + 运动技能 + 弓的力量需求/体积中较高者";
      parts.push({ label: "武器伤害×2", value: dmg * 2 });
      parts.push({ label: skillName || "运动", value: skillRank });
      parts.push({ label: "力量需求/体积（较高）", value: Math.max(strReq, size) });
    } else if (type === "gun" || type === "cannon") {
      formula = "武器伤害×2 + 枪械技能";
      parts.push({ label: "武器伤害×2", value: dmg * 2 });
      parts.push({ label: skillName || "枪械", value: skillRank });
    } else if (type === "throw") {
      formula = "武器伤害 + 运动技能 + 力量";
      parts.push({ label: "武器伤害", value: dmg });
      parts.push({ label: skillName || "运动", value: skillRank });
      parts.push({ label: "力量", value: str });
    } else if (type === "brawl") {
      formula = "天生武器伤害 + 肉搏技能 + 力量";
      parts.push({ label: "天生武器伤害", value: dmg });
      parts.push({ label: skillName || "肉搏", value: skillRank });
      parts.push({ label: "力量", value: str });
      if (nStr) parts.push({ label: "传奇力量", value: triangle(nStr) });
    } else if (type === "melee") {
      formula = "武器伤害 + 白刃技能 + 力量";
      parts.push({ label: "武器伤害", value: dmg });
      parts.push({ label: skillName || "白刃", value: skillRank });
      parts.push({ label: "力量", value: str });
      if (nStr) parts.push({ label: "传奇力量", value: triangle(nStr) });
    } else {
      formula = "自定义：武器伤害 + 技能 + 力量";
      parts.push({ label: "武器伤害", value: dmg });
      parts.push({ label: skillName || "技能", value: skillRank });
      parts.push({ label: "力量", value: str });
    }
    var base = 0;
    parts.forEach(function (p) { base += p.value; });
    return { formula: formula, parts: parts, base: base, skillName: skillName };
  }

  function allSkillNames(ch) {
    var names = Object.keys(SKILLS).slice();
    SUBSKILL_PARENTS.forEach(function (p) {
      if (names.indexOf(p) === -1) names.push(p);
    });
    (ch.white.subskills || []).forEach(function (sub) {
      if (sub && sub.parent && sub.name) names.push(sub.parent + "-" + sub.name);
    });
    return names;
  }

  function getSkill(ch, name) {
    if (ch.white.skills[name]) return ch.white.skills[name];
    var sub = (ch.white.subskills || []).find(function (s) {
      return s.parent + "-" + s.name === name;
    });
    if (sub) return { rank: sub.rank || 0, professions: sub.professions || [] };
    if (name === "手艺" || name === "表达") {
      var best = emptySkill(0);
      (ch.white.subskills || []).forEach(function (s) {
        if (s && s.parent === name && (Number(s.rank) || 0) > (best.rank || 0)) {
          best = { rank: s.rank || 0, professions: s.professions || [] };
        }
      });
      return best;
    }
    return emptySkill(0);
  }

  function skillExtraSuccess(rank) {
    var n = 0;
    [5, 7, 9, 11, 13, 15].forEach(function (th) { if (rank >= th) n += 1; });
    return n;
  }

  function legendaryOf(total) {
    if (total < 6) return 0;
    return Math.floor((total - 1) / 5);
  }

  function triangle(n) {
    return n * (n + 1) / 2;
  }

  function volumeAdjust(vol) {
    if (vol <= 5) return vol - 5;
    var t = 2 * (vol - 5);
    var x = 1;
    while ((x + 1) * (x + 2) <= t) x += 1;
    return x;
  }

  function typeAlwaysAdd(type) {
    return type === "完美" || type === "表演" || type === "闪避" || type === "瞄准";
  }

  function typePenaltyAlwaysAdd(type) {
    return type === "器械" || type === "环境";
  }

  function defaultStackMode(type, kind) {
    if (typeAlwaysAdd(type)) return "increase";
    if ((type === "洞察" || type === "天生防御" || type === "格挡" || type === "盾牌防御" || type === "专业") && kind !== "attr") {
      return "obtain";
    }
    return "obtain";
  }

  /* 同类型叠算：获得=取高；增加/提升=累加；完美/表演/闪避恒累加；器械/环境减值恒累加。
   * 内在/修行在「属性」上：同一强化树累加，不同树取高。 */
  function stackOneType(type, items, isAttr) {
    var used = [];
    var dropped = [];
    if (!items.length) return { type: type, value: 0, used: used, dropped: dropped };

    if ((type === "内在" || type === "修行") && isAttr) {
      var trees = {};
      items.forEach(function (it) {
        var key = it.treeId || it.sourceName || it.sourceId;
        if (!trees[key]) trees[key] = [];
        trees[key].push(it);
      });
      var bestKey = null;
      var bestVal = -Infinity;
      Object.keys(trees).forEach(function (k) {
        var sum = 0;
        trees[k].forEach(function (it) { sum += it.value; });
        if (sum > bestVal) { bestVal = sum; bestKey = k; }
      });
      Object.keys(trees).forEach(function (k) {
        if (k === bestKey) used = used.concat(trees[k]);
        else dropped = dropped.concat(trees[k]);
      });
      return { type: type, value: bestVal === -Infinity ? 0 : bestVal, used: used, dropped: dropped, tree: bestKey };
    }

    var pos = items.filter(function (it) { return it.value >= 0; });
    var neg = items.filter(function (it) { return it.value < 0; });
    var value = 0;

    if (pos.length) {
      if (typeAlwaysAdd(type)) {
        pos.forEach(function (it) { value += it.value; used.push(it); });
      } else {
        var obtain = pos.filter(function (it) { return it.stackMode !== "increase"; });
        var inc = pos.filter(function (it) { return it.stackMode === "increase"; });
        if (obtain.length) {
          var best = obtain[0];
          obtain.forEach(function (it) { if (it.value > best.value) best = it; });
          obtain.forEach(function (it) {
            if (it === best) used.push(it);
            else dropped.push(it);
          });
          value += best.value;
        }
        inc.forEach(function (it) { value += it.value; used.push(it); });
      }
    }

    if (neg.length) {
      if (typePenaltyAlwaysAdd(type)) {
        neg.forEach(function (it) { value += it.value; used.push(it); });
      } else {
        var worst = neg[0];
        neg.forEach(function (it) { if (it.value < worst.value) worst = it; });
        neg.forEach(function (it) {
          if (it === worst) used.push(it);
          else dropped.push(it);
        });
        value += worst.value;
      }
    }

    return { type: type, value: value, used: used, dropped: dropped };
  }

  function cancelSacredProfane(groups) {
    var sacred = groups.神圣;
    var profane = groups.亵渎;
    if (!sacred || !profane) return;
    var sIds = {};
    sacred.used.forEach(function (it) { sIds[it.sourceId] = true; });
    var same = profane.used.some(function (it) { return sIds[it.sourceId]; });
    if (same) return;
    var s = sacred.value;
    var p = profane.value;
    if (s >= p) {
      sacred.value = s - p;
      profane.value = 0;
    } else {
      profane.value = p - s;
      sacred.value = 0;
    }
  }

  function stackByType(items, isAttr) {
    var grouped = {};
    items.forEach(function (it) {
      var t = it.type || "无名";
      if (!grouped[t]) grouped[t] = [];
      grouped[t].push(it);
    });
    var groups = {};
    Object.keys(grouped).forEach(function (t) {
      groups[t] = stackOneType(t, grouped[t], isAttr);
    });
    cancelSacredProfane(groups);
    var total = 0;
    var detail = [];
    var dropped = [];
    Object.keys(groups).forEach(function (t) {
      var g = groups[t];
      total += g.value;
      if (g.value !== 0 || g.used.length) detail.push(g);
      dropped = dropped.concat(g.dropped || []);
    });
    return { total: total, groups: groups, detail: detail, dropped: dropped };
  }

  /* 资源/专长带来的附加成功彼此不叠加；规则（传奇、技能阈值、基因锁）带来的可叠加。 */
  function stackExtraSuccess(items) {
    var rule = items.filter(function (it) { return it.origin === "rule"; });
    var other = items.filter(function (it) { return it.origin !== "rule"; });
    var value = 0;
    var used = [];
    var dropped = [];
    rule.forEach(function (it) { value += it.value; used.push(it); });
    if (other.length) {
      var best = other[0];
      other.forEach(function (it) { if (it.value > best.value) best = it; });
      other.forEach(function (it) {
        if (it === best) { value += it.value; used.push(it); }
        else dropped.push(it);
      });
    }
    return { total: value, used: used, dropped: dropped };
  }

  function enabledEntries(ch) {
    return (ch.entries || []).filter(function (e) { return e.enabled !== false; });
  }

  function flattenBonuses(ch) {
    var out = [];
    enabledEntries(ch).forEach(function (entry) {
      (entry.bonuses || []).forEach(function (b) {
        if (b.enabled === false) return;
        out.push({
          id: b.id,
          sourceId: entry.id,
          sourceName: entry.name,
          category: entry.category,
          treeId: entry.treeId || entry.name,
          type: b.type || DEFAULT_TYPE_BY_CATEGORY[entry.category] || "无名",
          kind: b.kind,
          stackMode: b.stackMode || defaultStackMode(b.type, b.kind),
          value: Number(b.value) || 0,
          attr: b.attr || "",
          skill: b.skill || "",
          derived: b.derived || "",
          defensePart: b.defensePart || "other",
          applies: b.applies || [],
          origin: b.origin || "resource",
          note: b.note || "",
          consume: b.consume || "",
          conditional: !!b.conditional,
          miscType: b.miscType || "",
          miscText: b.miscText || "",
          valueMode: b.valueMode || "fixed",
          valueSrc: b.valueSrc || "attr",
          valueAttr: b.valueAttr || b.attr || "风度",
          valueSkill: b.valueSkill || b.skill || "",
          valueMult: b.valueMult == null || b.valueMult === "" ? 1 : Number(b.valueMult),
          capMode: b.capMode || "none",
          capAttr: b.capAttr || "风度",
          capMult: b.capMult == null || b.capMult === "" ? 1 : Number(b.capMult),
          capValue: Number(b.capValue) || 0,
          replaceFrom: b.replaceFrom || "",
          replaceTo: b.replaceTo || "",
          energyPart: b.energyPart || "cap",
          energyName: b.energyName || "",
          entryRank: entry.rank || "",
          levelValue: entry.levelValue
        });
      });
    });
    return out;
  }

  function matchApplies(applies, ctx) {
    if (!applies || !applies.length) return false;
    return applies.some(function (tag) {
      if (tag === "allChecks" && ctx.isCheck) return true;
      if (tag === "allSaves" && (ctx.checkId === "reflex" || ctx.checkId === "fortitude" || ctx.checkId === "willSave")) return true;
      if (tag === "allWill" && (ctx.checkId === "willCheck" || ctx.checkId === "willSave")) return true;
      if (tag === "allAttacks" && ctx.isAttack) return true;
      if (tag === "defense" && ctx.isDefense) return true;
      if (tag === "check:" + ctx.checkId) return true;
      if (tag === "attackType:" + ctx.attackType) return true;
      if (tag === "preset:" + ctx.presetId) return true;
      if (tag.indexOf("skill:") === 0 && ctx.skill === tag.slice(6)) return true;
      if (tag.indexOf("attr:") === 0 && ctx.attrs && ctx.attrs.indexOf(tag.slice(5)) !== -1) return true;
      return false;
    });
  }

  function resolveBonusValue(b, env) {
    env = env || {};
    if (!b || b.valueMode !== "formula") return Number(b && b.value) || 0;
    var attrs = env.attrs || {};
    var skills = env.skills || {};
    var raw = 0;
    var src = b.valueSrc || "attr";
    if (src === "attr") raw = attrs[b.valueAttr] ? attrs[b.valueAttr].total : 0;
    else if (src === "legendary") raw = attrs[b.valueAttr] ? attrs[b.valueAttr].legendary : 0;
    else if (src === "skill") raw = skills[b.valueSkill] ? skills[b.valueSkill].total : 0;
    else if (src === "entryLevel") raw = parseRankLevel(b.entryRank, b.levelValue);
    else if (src === "influence") raw = Number(env.influence) || 0;
    else if (src === "control") raw = Number(env.control) || 0;
    var mult = b.valueMult == null || b.valueMult === "" ? 1 : Number(b.valueMult);
    if (!isFinite(mult)) mult = 1;
    raw = raw * mult;
    var cap = Infinity;
    var capMode = b.capMode || "none";
    if (capMode === "fixed") cap = Number(b.capValue) || 0;
    else if (capMode === "entryLevel") {
      cap = parseRankLevel(b.entryRank, b.levelValue) * (Number(b.capMult) || 1);
    } else if (capMode === "attr") {
      cap = (attrs[b.capAttr] ? attrs[b.capAttr].total : 0) * (Number(b.capMult) || 1);
    }
    if (raw > cap) raw = cap;
    return Math.floor(raw);
  }

  function withResolved(items, env) {
    return (items || []).map(function (it) {
      if (it.valueMode !== "formula") return it;
      var c = clone(it);
      c.value = resolveBonusValue(it, env);
      var hint = "变量→" + c.value;
      c.note = it.note ? it.note + "（" + hint + "）" : hint;
      return c;
    });
  }

  function computeAttrBlock(white, items, env) {
    var attrs = {};
    ATTRS.forEach(function (name) {
      var whiteVal = Number(white.attrs[name]) || 0;
      var list = withResolved(items.filter(function (b) { return b.kind === "attr" && b.attr === name; }), env);
      var stacked = stackByType(list, true);
      var total = whiteVal + stacked.total;
      var legendary = legendaryOf(total);
      attrs[name] = {
        white: whiteVal,
        bonus: stacked.total,
        total: total,
        legendary: legendary,
        extraSuccess: legendary,
        stacked: stacked
      };
    });
    return attrs;
  }

  function compute(ch) {
    ch = ch || emptyCharacter();
    var white = ch.white || emptyCharacter().white;
    var flat = flattenBonuses(ch);

    var attrs = computeAttrBlock(white, flat.filter(function (b) { return b.kind === "attr" && b.valueMode !== "formula"; }), {});
    attrs = computeAttrBlock(white, flat.filter(function (b) { return b.kind === "attr"; }), { attrs: attrs });

    var volume = Number(white.volume) || 5;
    withResolved(flat.filter(function (b) { return b.kind === "derived" && b.derived === "volume"; }), { attrs: attrs }).forEach(function (b) {
      volume += b.value;
    });
    var sizeAdj = volumeAdjust(volume);

    var skillNames = allSkillNames(ch);
    var skills = {};
    skillNames.forEach(function (name) {
      var base = getSkill(ch, name);
      var whiteRank = Number(base.rank) || 0;
      var items = withResolved(flat.filter(function (b) { return b.kind === "skillRank" && b.skill === name; }), { attrs: attrs });
      var stacked = stackByType(items, false);
      var total = whiteRank + stacked.total;
      skills[name] = {
        white: whiteRank,
        bonus: stacked.total,
        total: total,
        extraSuccess: skillExtraSuccess(total),
        professions: (base.professions || []).slice(),
        group: SKILLS[name] || (name.indexOf("手艺") === 0 ? "心智" : name.indexOf("表达") === 0 ? "互动" : ""),
        stacked: stacked
      };
    });

    var formulaEnv = { attrs: attrs, skills: skills, influence: 0, control: 0 };
    var infItems = withResolved(flat.filter(function (b) { return b.kind === "derived" && b.derived === "influence"; }), formulaEnv);
    var ctrlItems = withResolved(flat.filter(function (b) { return b.kind === "derived" && b.derived === "control"; }), formulaEnv);
    var influence = Math.floor(attrs.风度.total / 2) + attrs.风度.legendary + stackByType(infItems, false).total;
    var control = Math.floor(attrs.操控.total / 2) + attrs.操控.legendary + stackByType(ctrlItems, false).total;
    formulaEnv.influence = influence;
    formulaEnv.control = control;

    function derivedBonus(id) {
      return stackByType(withResolved(flat.filter(function (b) { return b.kind === "derived" && b.derived === id; }), formulaEnv), false);
    }

    var hpB = derivedBonus("hp");
    var spdB = derivedBonus("speed");
    var initB = derivedBonus("initiative");
    var wvB = derivedBonus("willValue");
    var wpB = derivedBonus("willpower");
    var enB = derivedBonus("energy");
    var seB = derivedBonus("sense");
    var blB = derivedBonus("blur");
    var bdB = derivedBonus("baseDefense");

    var nAgi = attrs.敏捷.legendary;
    var nEnd = attrs.耐力.legendary;
    var nPer = attrs.感知.legendary;
    var nRes = attrs.决心.legendary;
    var nCom = attrs.沉着.legendary;

    var speedBase = attrs.力量.total + attrs.敏捷.total + volume + nAgi * (nAgi + 1) * 5;
    var hpBase = attrs.耐力.total + attrs.力量.total + 2 + sizeAdj + triangle(nEnd);
    var willValueBase = attrs.决心.total + attrs.沉着.total;
    var willpowerBase = willValueBase + triangle(nRes) + triangle(nCom);
    var energyBase = attrs.耐力.total + attrs.智力.total + triangle(nEnd);
    var senseBase = attrs.感知.total * 10 + nPer * 20;
    var blurBase = attrs.感知.total * 100 + nPer * 200;
    var baseDefBase = Math.min(attrs.敏捷.total, attrs.感知.total);

    var derived = {
      volume: volume,
      sizeAdj: sizeAdj,
      speed: { base: speedBase, bonus: spdB.total, total: speedBase + spdB.total, stacked: spdB },
      hp: { base: hpBase, bonus: hpB.total, total: Math.max(1, hpBase + hpB.total), raw: hpBase + hpB.total, stacked: hpB },
      willValue: { base: willValueBase, bonus: wvB.total, total: willValueBase + wvB.total, stacked: wvB },
      willpower: { base: willpowerBase, bonus: wpB.total, total: willpowerBase + wpB.total, stacked: wpB },
      energy: { base: energyBase, bonus: enB.total, total: energyBase + enB.total, stacked: enB },
      sense: { base: senseBase, bonus: seB.total, total: senseBase + seB.total, stacked: seB },
      blur: { base: blurBase, bonus: blB.total, total: blurBase + blB.total, stacked: blB },
      influence: influence,
      control: control,
      baseDefense: { base: baseDefBase, bonus: bdB.total, total: baseDefBase + bdB.total, stacked: bdB }
    };

    function synthetic(sourceName, type, kind, value, extra) {
      var b = {
        id: uid("syn"),
        sourceId: "rule",
        sourceName: sourceName,
        category: "规则",
        treeId: sourceName,
        type: type,
        kind: kind,
        stackMode: typeAlwaysAdd(type) ? "increase" : "obtain",
        value: value,
        origin: "rule",
        applies: extra && extra.applies || [],
        attr: extra && extra.attr || "",
        skill: extra && extra.skill || "",
        defensePart: extra && extra.defensePart || "other",
        note: extra && extra.note || ""
      };
      return b;
    }

    var syn = [];
    if (influence) {
      syn.push(synthetic("影响力", "完美", "checkDp", influence, { applies: ["allChecks"], note: "对抗性判定" }));
      syn.push(synthetic("影响力", "完美", "defense", influence, { applies: ["defense"], defensePart: "other", note: "防御" }));
    }
    if (control) {
      syn.push(synthetic("控制力", "完美", "checkDp", control, { applies: ["allChecks"], note: "竞争性判定" }));
    }
    var saveHalf = Math.floor(influence / 2) + Math.floor(control / 2);
    /* 豁免改走一半影响力/控制力，下面在检定里替换，不把全额完美加进豁免。 */
    if (nAgi) {
      syn.push(synthetic("传奇敏捷", "闪避", "defense", nAgi, { applies: ["defense"], defensePart: "dodge", stackMode: "increase" }));
    }
    if (nPer) {
      syn.push(synthetic("传奇感知", "洞察", "defense", nPer, { applies: ["defense"], defensePart: "insight", stackMode: "increase" }));
    }
    syn.forEach(function (b) {
      if (b.defensePart === "dodge") b.stackMode = "increase";
      if (b.defensePart === "insight") b.stackMode = "increase";
    });

    formulaEnv.derived = derived;
    var resolvedFlat = withResolved(flat, formulaEnv);
    var allBonuses = resolvedFlat.concat(syn);

    function checkCtx(def, extra) {
      extra = extra || {};
      var attrsUsed = (def.attrs || []).slice();
      if (extra.attr && attrsUsed.indexOf(extra.attr) === -1) attrsUsed.push(extra.attr);
      return {
        isCheck: true,
        isAttack: !!extra.isAttack,
        isDefense: false,
        checkId: def.id,
        attackType: extra.attackType || "",
        presetId: extra.presetId || "",
        skill: extra.skill || def.skill,
        attrs: attrsUsed,
        contest: extra.contest || def.contest
      };
    }

    function contestAllows(bonus, contest) {
      if (bonus.sourceName === "影响力") {
        if (contest === "对抗") return true;
        if (contest === "豁免") return false;
        if (contest === "竞争") return false;
        return contest === "对抗";
      }
      if (bonus.sourceName === "控制力") {
        if (contest === "竞争") return true;
        if (contest === "豁免") return false;
        if (contest === "对抗") return false;
        return contest === "竞争";
      }
      return true;
    }

    function skillContribution(skillName, profession) {
      if (!skillName) return { rank: 0, halved: false, hasProf: false, extra: 0 };
      var sk = skills[skillName] || { total: 0, professions: [], extraSuccess: 0 };
      var hasProf = false;
      if (profession) {
        hasProf = (sk.professions || []).indexOf(profession) !== -1;
      } else {
        hasProf = true;
      }
      var rank = hasProf ? sk.total : Math.floor(sk.total / 2);
      return { rank: rank, halved: !hasProf && !!profession, hasProf: hasProf, extra: sk.extraSuccess, skill: sk };
    }

    function collectDp(ctx, contest) {
      return allBonuses.filter(function (b) {
        if (b.kind !== "checkDp") return false;
        if (!matchApplies(b.applies, ctx) && !(b.applies && b.applies.length === 0 && b.skill && b.skill === ctx.skill)) return false;
        if (!contestAllows(b, contest)) return false;
        return true;
      });
    }

    function collectExtra(ctx) {
      return allBonuses.filter(function (b) {
        if (b.kind !== "extraSuccess") return false;
        return matchApplies(b.applies, ctx);
      });
    }

    function legendaryDpFor(ctx) {
      var items = [];
      ctx.attrs.forEach(function (a) {
        var n = attrs[a] ? attrs[a].legendary : 0;
        if (!n) return;
        if (a === "力量") items.push(synthetic("传奇力量", "完美", "checkDp", n, { applies: ["attr:力量"], note: "力量相关判定 DP" }));
      });
      if ((ctx.checkId === "willCheck" || ctx.checkId === "willSave") && (ctx.attrs || []).indexOf("决心") !== -1) {
        var nr = attrs.决心.legendary;
        if (nr) items.push(synthetic("传奇决心", "完美", "checkDp", nr, { note: "意志检定 DP" }));
      }
      if (ctx.checkId === "initiative") {
        var nc = attrs.沉着.legendary;
        if (nc) items.push(synthetic("传奇沉着", "完美", "checkDp", triangle(nc), { note: "先攻 DP" }));
      }
      return items;
    }

    function legendaryExtraFor(ctx) {
      var items = [];
      var seen = {};
      (ctx.attrs || []).forEach(function (a) {
        var n = attrs[a] ? attrs[a].legendary : 0;
        if (n && !seen[a]) {
          seen[a] = true;
          items.push(synthetic("传奇" + a, "完美", "extraSuccess", n, { origin: "rule", note: "传奇附加成功" }));
        }
      });
      items.forEach(function (it) { it.origin = "rule"; });
      return items;
    }

    function applyEntryReplaces(ctx) {
      var map = {};
      allBonuses.forEach(function (b) {
        if (b.kind !== "attrReplace") return;
        if (!matchApplies(b.applies, ctx)) return;
        var from = b.replaceFrom;
        var to = b.replaceTo;
        if (!from || !to || !attrs[to]) return;
        if (!map[from] || attrs[to].total > attrs[map[from].to].total) {
          map[from] = { to: to, source: b.sourceName, note: b.note };
        }
      });
      return map;
    }

    function buildCheck(def, extra) {
      extra = extra || {};
      var ctx = checkCtx(def, extra);
      var contest = ctx.contest;
      var lines = [];
      var dpItems = [];
      var replaces = applyEntryReplaces(ctx);
      if (extra.attrReplace && extra.attrReplace.from && extra.attrReplace.to) {
        replaces[extra.attrReplace.from] = {
          to: extra.attrReplace.to,
          source: extra.attrReplace.note || "替换关键属性",
          note: extra.attrReplace.note
        };
      }
      Object.keys(replaces).forEach(function (from) {
        var to = replaces[from].to;
        ctx.attrs = ctx.attrs.filter(function (a) { return a !== from; });
        if (ctx.attrs.indexOf(to) === -1) ctx.attrs.push(to);
      });

      (def.attrs || []).forEach(function (a) {
        var use = replaces[a] ? replaces[a].to : a;
        if (lines.some(function (ln) { return ln.label === use; })) return;
        var note = attrs[use] && attrs[use].bonus ? ("白卡" + attrs[use].white + " +加值" + attrs[use].bonus) : "";
        if (replaces[a]) {
          note = (note ? note + " · " : "") + (replaces[a].source || "") + "：以" + use + "取代" + a;
        }
        lines.push({ label: use, value: attrs[use].total, kind: "base", note: note });
      });
      if (extra.attr) {
        var extraUse = replaces[extra.attr] ? replaces[extra.attr].to : extra.attr;
        if (!lines.some(function (ln) { return ln.label === extraUse; })) {
          lines.push({ label: extraUse, value: attrs[extraUse].total, kind: "base" });
        }
      }

      var skillName = extra.skill || def.skill;
      var profession = extra.profession !== undefined ? extra.profession : def.profession;
      var sc = skillContribution(skillName, profession);
      if (skillName) {
        lines.push({
          label: formatSkillName(skillName) + (sc.halved ? "/2" : ""),
          value: sc.rank,
          kind: "base",
          note: sc.halved ? "无对应专业，级数减半" : (sc.hasProf && profession ? "专业：" + profession : "")
        });
        if (sc.hasProf && profession) {
          dpItems.push({
            type: "专业", kind: "checkDp", value: 1, stackMode: "obtain",
            sourceName: "专业·" + profession, sourceId: "prof", origin: "rule",
            note: "对应专业 +1DP"
          });
        }
      }

      if (extra.weaponDamage) {
        lines.push({ label: "武器伤害", value: extra.weaponDamage, kind: "base" });
      }

      dpItems = dpItems.concat(collectDp(ctx, contest));
      dpItems = dpItems.concat(legendaryDpFor(ctx));

      if (contest === "豁免") {
        dpItems = dpItems.filter(function (b) {
          return b.sourceName !== "影响力" && b.sourceName !== "控制力";
        });
        var halfInf = Math.floor(influence / 2);
        var halfCtrl = Math.floor(control / 2);
        if (halfInf) dpItems.push(synthetic("影响力/2", "完美", "checkDp", halfInf, { note: "豁免取影响力一半" }));
        if (halfCtrl) dpItems.push(synthetic("控制力/2", "完美", "checkDp", halfCtrl, { note: "豁免取控制力一半" }));
      }

      var stacked = stackByType(dpItems, false);
      stacked.used = [];
      stacked.detail.forEach(function (g) { stacked.used = stacked.used.concat(g.used || []); });

      var extraItems = collectExtra(ctx).concat(legendaryExtraFor(ctx));
      if (skillName && sc.extra) {
        extraItems.push(synthetic(skillName + "附加成功", "完美", "extraSuccess", sc.extra, { note: "技能阈值" }));
        extraItems[extraItems.length - 1].origin = "rule";
      }
      extraItems.forEach(function (it) {
        if (it.sourceId === "rule" || it.category === "规则") it.origin = "rule";
      });
      var extraStacked = stackExtraSuccess(extraItems);

      var baseSum = 0;
      lines.forEach(function (ln) { baseSum += ln.value; });
      var dp = baseSum + stacked.total;

      return {
        id: def.id,
        name: extra.name || def.name,
        contest: contest,
        dp: dp,
        extraSuccess: extraStacked.total,
        baseLines: lines,
        stacked: stacked,
        extraStacked: extraStacked,
        halved: sc.halved,
        ctx: ctx
      };
    }

    var checks = {};
    allCheckDefs(ch).forEach(function (def) {
      checks[def.id] = buildCheck(def);
    });
    derived.initiativeCheck = checks.initiative;

    var defItems = allBonuses.filter(function (b) {
      return b.kind === "defense" || (b.kind === "checkDp" && matchApplies(b.applies, { isDefense: true, isCheck: false, isAttack: false }));
    });
    defItems.push({
      type: "闪避", kind: "defense", value: derived.baseDefense.total, stackMode: "increase",
      sourceName: "基础防御", sourceId: "baseDef", origin: "rule",
      defensePart: "base", note: "敏捷与感知较低者"
    });

    var defenseStanding = stackByType(defItems.filter(function (b) {
      return b.defensePart !== "full" && b.defensePart !== "block" && b.defensePart !== "shield" && b.defensePart !== "cover";
    }), false);

    var defExtra = allBonuses.filter(function (b) {
      return b.kind === "extraSuccess" && matchApplies(b.applies, { isDefense: true, isCheck: false, isAttack: false, attrs: ["敏捷", "感知"] });
    });
    defExtra.push(synthetic("传奇敏捷", "完美", "extraSuccess", nAgi, { note: "防御附加成功" }));
    defExtra.push(synthetic("传奇感知", "完美", "extraSuccess", nPer, { note: "防御附加成功" }));
    defExtra.forEach(function (it) { it.origin = "rule"; });
    defExtra = defExtra.filter(function (it) { return it.value; });
    var defExtraStacked = stackExtraSuccess(defExtra);

    var fullDefItems = defItems.concat([{
      type: "闪避", kind: "defense", value: derived.baseDefense.total, stackMode: "increase",
      sourceName: "全力防御", sourceId: "fullDef", origin: "rule",
      defensePart: "full", note: "闪避防御再获得等同基础防御的加值"
    }]);
    var defenseFull = stackByType(fullDefItems.filter(function (b) {
      return b.defensePart !== "block" && b.defensePart !== "shield" && b.defensePart !== "cover";
    }), false);

    var meleeBlock = (skills.肉搏 ? skills.肉搏.total : 0) + ((skills.肉搏 && skills.肉搏.professions.indexOf("格挡") !== -1) ? 1 : 0);
    var bladeBlock = (skills.白刃 ? skills.白刃.total : 0) + ((skills.白刃 && skills.白刃.professions.indexOf("格挡") !== -1) ? 1 : 0);

    var misc = [];
    allBonuses.filter(function (b) { return b.kind === "misc"; }).forEach(function (b) {
      misc.push({
        sourceName: b.sourceName,
        miscType: b.miscType,
        value: b.value,
        text: b.miscText || b.note,
        type: b.type
      });
    });

    var attacks = (ch.attacks || []).filter(function (a) { return a.enabled !== false; }).map(function (preset) {
      var typeInfo = ATTACK_TYPES.filter(function (t) { return t.id === preset.attackType; })[0] || ATTACK_TYPES[0];
      var attrName = preset.attr || typeInfo.defaultAttr;
      var skillName = preset.skill || typeInfo.defaultSkill;
      var def = {
        id: "attack:" + preset.id,
        name: preset.name,
        attrs: [attrName],
        skill: skillName,
        profession: preset.profession || "",
        contest: "竞争"
      };
      var result = buildCheck(def, {
        name: preset.name,
        isAttack: true,
        attackType: preset.attackType,
        presetId: preset.id,
        attr: attrName,
        skill: skillName,
        profession: preset.profession || "",
        weaponDamage: Number(preset.weaponDamage) || 0,
        contest: "竞争"
      });
      var capInfo = damageCapInfo(preset, skills, attrs);
      var capB = stackByType(resolvedFlat.filter(function (b) {
        return b.kind === "derived" && b.derived === "damageCap" && matchApplies(b.applies, result.ctx);
      }), false);
      var capParts = capInfo.parts.slice();
      if (capB.total) capParts.push({ label: "条目加值", value: capB.total });
      return {
        preset: preset,
        check: result,
        damageCap: capInfo.base + capB.total,
        damageCapInfo: { formula: capInfo.formula, parts: capParts, base: capInfo.base },
        range: Number(preset.range) || 0,
        maxRange: (Number(preset.range) || 0) * (typeInfo.rangeMult || 0),
        damageType: preset.damageType || "",
        notes: preset.notes || ""
      };
    });

    function poolBonusPart(pool, part) {
      var items = resolvedFlat.filter(function (b) {
        if (b.kind !== "energyPool" || (b.energyPart || "cap") !== part) return false;
        var n = String(b.energyName || "").trim();
        if (!n) return false;
        return n === pool.name || n === pool.id || n === energyTemplate(pool.template).name;
      });
      return stackByType(items, false);
    }

    function roundRate(n) {
      if (!isFinite(n)) return 0;
      var r = Math.round(n * 100) / 100;
      return r;
    }

    var energyPools = (ch.energyPools || []).filter(function (p) { return p && p.enabled !== false; }).map(function (pool) {
      var tpl = energyTemplate(pool.template);
      var a1 = pool.attr1 || tpl.attr1;
      var a2 = pool.attr2 || tpl.attr2;
      var t1 = a1 && attrs[a1] ? attrs[a1].total : 0;
      var t2 = a2 && attrs[a2] ? attrs[a2].total : 0;
      var n1 = a1 && attrs[a1] ? attrs[a1].legendary : 0;
      var n2 = a2 && attrs[a2] ? attrs[a2].legendary : 0;
      var enh = enhanceInfo(pool.enhanceRank);
      var parts = [];
      var baseCap = 0;
      if (tpl.linkedDerived && derived[tpl.linkedDerived]) {
        baseCap = derived[tpl.linkedDerived].total;
        parts.push({ label: "衍生" + (tpl.linkedDerived === "energy" ? "精力" : "意志力"), value: baseCap });
      } else {
        var div = Number(pool.divisor);
        if (!div) div = tpl.divisor || 4;
        if (div <= 0) div = 1;
        baseCap = Math.floor((t1 + t2) / div);
        parts.push({ label: "(" + (a1 || "") + (a2 ? "+" + a2 : "") + ")/" + div, value: baseCap });
      }
      var cap = baseCap;
      var cat = pool.category || tpl.category || "generic";
      var extraOpen = Number(pool.extraOpenings) || 0;
      if (cat !== "special" && extraOpen > 0) {
        cap += extraOpen * 5;
        parts.push({ label: "重复开启 ×" + extraOpen, value: extraOpen * 5 });
      }
      if (enh.cap) {
        cap += enh.cap;
        parts.push({ label: "能量池强化 " + (pool.enhanceRank || ""), value: enh.cap });
      }
      var extraCap = Number(pool.bonusCap) || 0;
      if (extraCap) {
        cap += extraCap;
        parts.push({ label: "额外上限", value: extraCap });
      }
      var capStacked = poolBonusPart(pool, "cap");
      if (capStacked.total) {
        cap += capStacked.total;
        parts.push({ label: "条目加值", value: capStacked.total });
      }

      var hourly = Number(pool.bonusHourly) || 0;
      var hourlyParts = [];
      if (enh.hourly) {
        hourly += enh.hourly;
        hourlyParts.push({ label: "能量池强化", value: enh.hourly });
      }
      if (tpl.hourly === "sumLegendary") {
        var med = n1 + n2;
        hourly += med;
        hourlyParts.push({ label: "冥想（关键属性传奇之和）", value: med });
      } else if (tpl.hourly === "spread24") {
        var h24 = cap / 24;
        hourly += h24;
        hourlyParts.push({ label: "24小时回满分摊", value: roundRate(h24) });
      } else if (tpl.hourly === "spread24x3") {
        var h3 = (cap * 3) / 24;
        hourly += h3;
        hourlyParts.push({ label: "24小时回复至三倍上限分摊", value: roundRate(h3) });
      }
      var hourStacked = poolBonusPart(pool, "hourly");
      if (hourStacked.total) {
        hourly += hourStacked.total;
        hourlyParts.push({ label: "条目加值", value: hourStacked.total });
      }

      var rest8 = Number(pool.bonusRest8) || 0;
      var restParts = [];
      if (tpl.rest8 === "toMax") {
        rest8 += cap;
        restParts.push({ label: "长休息回满", value: cap });
      } else if (tpl.rest8 === "minKey") {
        var mn = Math.min(t1, t2);
        rest8 += mn;
        restParts.push({ label: "关键属性较低者", value: mn });
        if (enh.hourly) {
          rest8 += enh.hourly * 8;
          restParts.push({ label: "强化 8 小时", value: enh.hourly * 8 });
        }
      } else if (tpl.rest8 === "spread24") {
        var r24 = cap * 8 / 24;
        rest8 += r24;
        restParts.push({ label: "24小时回满分摊 8 小时", value: roundRate(r24) });
      } else if (tpl.rest8 === "toMaxFrom24x3") {
        rest8 += cap;
        restParts.push({ label: "24小时回复三倍上限 → 8小时约一倍", value: cap });
      } else if (enh.hourly) {
        rest8 += enh.hourly * 8;
        restParts.push({ label: "强化 8 小时", value: enh.hourly * 8 });
      }
      var restStacked = poolBonusPart(pool, "rest8");
      if (restStacked.total) {
        rest8 += restStacked.total;
        restParts.push({ label: "条目加值", value: restStacked.total });
      }
      if (tpl.rest8 === "toMax" || tpl.rest8 === "minKey") {
        if (rest8 > cap) rest8 = cap;
      }

      var shortRest = 0;
      var shortNote = "";
      if (tpl.shortRest === "minKeyLegendary") {
        shortRest = Math.min(n1, n2);
        shortNote = "15 分钟精神修炼：较低关键属性传奇";
      } else if (tpl.shortRest === "maxKeyLegendary") {
        shortRest = Math.max(n1, n2);
        shortNote = "15 分钟短休息：较高关键属性传奇";
      }

      var apparent = "无支线";
      if (cap >= 160) apparent = "S";
      else if (cap >= 80) apparent = "A";
      else if (cap >= 40) apparent = "B";
      else if (cap >= 20) apparent = "C";
      else if (cap > 0) apparent = "D";

      return {
        pool: pool,
        name: pool.name || tpl.name,
        template: tpl,
        cap: cap,
        hourly: roundRate(hourly),
        rest8: roundRate(rest8),
        shortRest: shortRest,
        shortNote: shortNote,
        parts: parts,
        hourlyParts: hourlyParts,
        restParts: restParts,
        apparent: apparent,
        keyAttrs: [a1, a2].filter(Boolean),
        stackedCap: capStacked
      };
    });

    return {
      attrs: attrs,
      skills: skills,
      derived: derived,
      checks: checks,
      attacks: attacks,
      energyPools: energyPools,
      defense: {
        standing: defenseStanding,
        full: defenseFull,
        extraSuccess: defExtraStacked.total,
        extraStacked: defExtraStacked,
        meleeBlock: meleeBlock,
        bladeBlock: bladeBlock,
        dodge: nAgi,
        insight: nPer
      },
      misc: misc,
      influence: influence,
      control: control
    };
  }

  function bonusLineText(b) {
    var bits = [b.sourceName, b.type, (b.value >= 0 ? "+" : "") + b.value];
    if (b.stackMode === "increase") bits.push("提升");
    if (b.note) bits.push(b.note);
    if (b.consume) bits.push("消耗：" + b.consume);
    return bits.filter(Boolean).join(" · ");
  }

  global.WXKB = {
    ATTRS: ATTRS,
    ATTR_GROUP: ATTR_GROUP,
    SKILLS: SKILLS,
    SUBSKILL_PARENTS: SUBSKILL_PARENTS,
    CATEGORIES: CATEGORIES,
    ESSENCES: ESSENCES,
    BONUS_TYPES: BONUS_TYPES,
    KINDS: KINDS,
    DERIVED_TARGETS: DERIVED_TARGETS,
    DEFENSE_PARTS: DEFENSE_PARTS,
    CHECK_DEFS: CHECK_DEFS,
    CONTESTS: CONTESTS,
    SHEET_CHECK_IDS: SHEET_CHECK_IDS,
    ATTACK_TYPES: ATTACK_TYPES,
    APPLY_PRESETS: APPLY_PRESETS,
    VALUE_SOURCES: VALUE_SOURCES,
    CAP_MODES: CAP_MODES,
    ENERGY_PARTS: ENERGY_PARTS,
    ENERGY_TEMPLATES: ENERGY_TEMPLATES,
    ENHANCE_RANKS: ENHANCE_RANKS,
    DEFAULT_TYPE_BY_CATEGORY: DEFAULT_TYPE_BY_CATEGORY,
    uid: uid,
    clone: clone,
    emptyCharacter: emptyCharacter,
    emptySkill: emptySkill,
    emptyPower: emptyPower,
    emptyEnergyPool: emptyEnergyPool,
    energyTemplate: energyTemplate,
    parseRankLevel: parseRankLevel,
    formatSkillName: formatSkillName,
    skillSelectNames: skillSelectNames,
    combatPower: combatPower,
    compactRank: compactRank,
    fmtPower: fmtPower,
    parseDiceExpr: parseDiceExpr,
    rollWw: rollWw,
    rollRd: rollRd,
    rollParsed: rollParsed,
    clampAgain: clampAgain,
    allCheckDefs: allCheckDefs,
    damageCapInfo: damageCapInfo,
    compute: compute,
    legendaryOf: legendaryOf,
    skillExtraSuccess: skillExtraSuccess,
    volumeAdjust: volumeAdjust,
    defaultStackMode: defaultStackMode,
    bonusLineText: bonusLineText,
    stackByType: stackByType
  };
})(typeof window !== "undefined" ? window : globalThis);
