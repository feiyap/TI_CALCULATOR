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
    { id: "extraSuccess", label: "附加成功" },
    { id: "derived", label: "衍生属性" },
    { id: "defense", label: "防御构成" },
    { id: "misc", label: "其他（DR / 备注）" }
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
      power: emptyPower()
    };
  }

  function emptyPower() {
    return { d: 0, c: 0, b: 0, a: 0, s: 0, ss: 0, points: 0, xp: 0 };
  }

  function compactRank(n) {
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

  /* ST指南：建卡战斗力约 1。使用中的支线折成 D，再计 (分数-D个数×1000)/1500（可负）与 经验/15（向下取整）。强度为 ND，再加 1 点初始。 */
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
    var fromPoints = Math.floor((points - branchD * 1000) / 1500);
    var fromXp = Math.floor(xp / 15);
    var strengthD = branchD + fromPoints + fromXp;
    var nearest = Math.round(strengthD / 9) * 9;
    var near = "";
    if (strengthD > 0 && nearest > 0 && nearest !== strengthD && Math.abs(nearest - strengthD) <= 4) {
      near = "接近 " + compactRank(nearest) + "（" + nearest + "D）";
    } else if (strengthD > 0 && strengthD % 3 === 0) {
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
    return sub ? { rank: sub.rank || 0, professions: sub.professions || [] } : emptySkill(0);
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
          miscText: b.miscText || ""
        });
      });
    });
    return out;
  }

  function matchApplies(applies, ctx) {
    if (!applies || !applies.length) return false;
    return applies.some(function (tag) {
      if (tag === "allChecks" && ctx.isCheck) return true;
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

  function compute(ch) {
    ch = ch || emptyCharacter();
    var white = ch.white || emptyCharacter().white;
    var flat = flattenBonuses(ch);

    var volume = Number(white.volume) || 5;
    flat.filter(function (b) { return b.kind === "derived" && b.derived === "volume"; }).forEach(function (b) {
      volume += b.value;
    });
    var sizeAdj = volumeAdjust(volume);

    var attrs = {};
    ATTRS.forEach(function (name) {
      var whiteVal = Number(white.attrs[name]) || 0;
      var items = flat.filter(function (b) { return b.kind === "attr" && b.attr === name; });
      var stacked = stackByType(items, true);
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

    var skillNames = allSkillNames(ch);
    var skills = {};
    skillNames.forEach(function (name) {
      var base = getSkill(ch, name);
      var whiteRank = Number(base.rank) || 0;
      var items = flat.filter(function (b) { return b.kind === "skillRank" && b.skill === name; });
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

    var infItems = flat.filter(function (b) { return b.kind === "derived" && b.derived === "influence"; });
    var ctrlItems = flat.filter(function (b) { return b.kind === "derived" && b.derived === "control"; });
    var influence = Math.floor(attrs.风度.total / 2) + attrs.风度.legendary + stackByType(infItems, false).total;
    var control = Math.floor(attrs.操控.total / 2) + attrs.操控.legendary + stackByType(ctrlItems, false).total;

    function derivedBonus(id) {
      return stackByType(flat.filter(function (b) { return b.kind === "derived" && b.derived === id; }), false);
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

    var allBonuses = flat.concat(syn);

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
      if (ctx.checkId === "willCheck" || ctx.checkId === "willSave") {
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

    function buildCheck(def, extra) {
      extra = extra || {};
      var ctx = checkCtx(def, extra);
      var contest = ctx.contest;
      var lines = [];
      var dpItems = [];

      (def.attrs || []).forEach(function (a) {
        lines.push({ label: a, value: attrs[a].total, kind: "base", note: attrs[a].bonus ? ("白卡" + attrs[a].white + (attrs[a].bonus ? " +加值" + attrs[a].bonus : "")) : "" });
      });
      if (extra.attrReplace) {
        lines = lines.filter(function (ln) { return ln.label !== extra.attrReplace.from; });
        if (!lines.some(function (ln) { return ln.label === extra.attrReplace.to; })) {
          lines.unshift({ label: extra.attrReplace.to, value: attrs[extra.attrReplace.to].total, kind: "base", note: extra.attrReplace.note || "替换关键属性" });
        }
        ctx.attrs = ctx.attrs.filter(function (a) { return a !== extra.attrReplace.from; });
        if (ctx.attrs.indexOf(extra.attrReplace.to) === -1) ctx.attrs.push(extra.attrReplace.to);
      }
      if (extra.attr) {
        if (!lines.some(function (ln) { return ln.label === extra.attr; })) {
          lines.push({ label: extra.attr, value: attrs[extra.attr].total, kind: "base" });
        }
      }

      var skillName = extra.skill || def.skill;
      var profession = extra.profession !== undefined ? extra.profession : def.profession;
      var sc = skillContribution(skillName, profession);
      if (skillName) {
        lines.push({
          label: skillName + (sc.halved ? "/2" : ""),
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
      var capB = stackByType(flat.filter(function (b) {
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

    return {
      attrs: attrs,
      skills: skills,
      derived: derived,
      checks: checks,
      attacks: attacks,
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
    DEFAULT_TYPE_BY_CATEGORY: DEFAULT_TYPE_BY_CATEGORY,
    uid: uid,
    clone: clone,
    emptyCharacter: emptyCharacter,
    emptySkill: emptySkill,
    emptyPower: emptyPower,
    combatPower: combatPower,
    compactRank: compactRank,
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
