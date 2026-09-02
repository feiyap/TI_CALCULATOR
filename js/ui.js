/* 角色加值计算器界面 */
(function () {
  "use strict";
  var W = window.WXKB;
  var state = W.emptyCharacter();
  var ui = { tab: "white", openEntry: null };
  var selectedPresetId = "";
  var folderApi = false;
  var presetList = [];

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function val(el, fallback) {
    if (!el) return fallback;
    if (el.type === "checkbox") return el.checked;
    if (el.type === "number") return el.value === "" ? fallback : Number(el.value);
    return el.value;
  }

  function persist() {
    try { localStorage.setItem("wxkb-calc-v1", JSON.stringify(state)); } catch (e) {}
  }
  function restore() {
    try {
      var raw = localStorage.getItem("wxkb-calc-v1");
      if (raw) state = JSON.parse(raw);
    } catch (e) {}
  }
  function unwrapCharacter(data) {
    if (data && data.character) return data.character;
    return data;
  }
  function fillPresetSelect() {
    var sel = $("preset-select");
    if (!sel) return;
    if (!folderApi) {
      sel.innerHTML = '<option value="">请用「启动计算器.bat」打开，才能读写 presets 文件夹</option>';
      selectedPresetId = "";
      return;
    }
    if (!presetList.length) {
      sel.innerHTML = '<option value="">（presets 文件夹为空）</option>';
      selectedPresetId = "";
      return;
    }
    sel.innerHTML = presetList.map(function (p) {
      var mark = p.savedAt ? " · " + String(p.savedAt).replace("T", " ").slice(0, 16) : "";
      return '<option value="' + esc(p.file) + '"' + (p.file === selectedPresetId ? " selected" : "") + ">" +
        esc(p.name || p.file) + esc(mark) + "</option>";
    }).join("");
    if (!selectedPresetId || !presetList.some(function (p) { return p.file === selectedPresetId; })) {
      selectedPresetId = sel.value;
    } else {
      sel.value = selectedPresetId;
    }
  }
  function refreshPresets() {
    return fetch("/api/presets", { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("api");
      return r.json();
    }).then(function (list) {
      folderApi = true;
      presetList = list || [];
      fillPresetSelect();
    }).catch(function () {
      folderApi = false;
      presetList = [];
      fillPresetSelect();
    });
  }
  function renderPresetSelect() {
    refreshPresets();
  }

  function setTab(name) {
    ui.tab = name;
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("active", t.getAttribute("data-tab") === name);
    });
    document.querySelectorAll("[id^='pane-']").forEach(function (el) {
      el.classList.toggle("hidden", el.id !== "pane-" + name);
    });
  }

  function renderAll() {
    persist();
    renderWhite();
    renderInfo();
    renderEntries();
    renderChecks();
    var result = W.compute(state);
    renderEnergy(result);
    renderAttacks(result);
    renderSheet(result);
    renderPresetSelect();
  }

  function renderInfo() {
    var i = state.info;
    if (!$("info-name")) return;
    $("info-player").value = i.player || "";
    $("info-name").value = i.name || "";
    $("info-gender").value = i.gender || "";
    $("info-age").value = i.age || "";
    $("info-height").value = i.height || "";
    $("info-race").value = i.race || "";
    $("info-language").value = i.language || "";
    $("info-appearance").value = i.appearance || "";
    $("info-personality").value = i.personality || "";
    $("info-summary").value = i.summary || "";
    $("info-virtue").value = i.virtue || "";
    $("info-vice").value = i.vice || "";
    var p = state.power || W.emptyPower();
    state.power = p;
    ["d", "c", "b", "a", "s", "ss", "points", "xp"].forEach(function (k) {
      var el = $("power-" + k);
      if (el) el.value = p[k] || 0;
    });
    renderPowerResult();
  }

  function readInfo() {
    state.info.player = $("info-player").value;
    state.info.name = $("info-name").value;
    state.info.gender = $("info-gender").value;
    state.info.age = $("info-age").value;
    state.info.height = $("info-height").value;
    state.info.race = $("info-race").value;
    state.info.language = $("info-language").value;
    state.info.appearance = $("info-appearance").value;
    state.info.personality = $("info-personality").value;
    state.info.summary = $("info-summary").value;
    state.info.virtue = $("info-virtue").value;
    state.info.vice = $("info-vice").value;
    if (!state.power) state.power = W.emptyPower();
    ["d", "c", "b", "a", "s", "ss", "points", "xp"].forEach(function (k) {
      var el = $("power-" + k);
      if (el) state.power[k] = Number(el.value) || 0;
    });
  }

  function renderPowerResult() {
    var box = $("power-result");
    if (!box) return;
    var r = W.combatPower(state.power || W.emptyPower());
    box.innerHTML =
      '<div class="n">' + r.total + '<span class="s"> 累计战斗力</span></div>' +
      '<div class="line">支线折合 ' + r.branchD + "D" +
      "　·　分数折算 (" + (state.power && state.power.points || 0) + " − " + r.branchD + "×1000) / 1500 = " + r.fromPoints +
      "　·　XP 折算 " + Math.floor((state.power && state.power.xp || 0) / 15) + "</div>" +
      '<div class="line">资源强度 ' + r.strengthD + "D" + (r.near ? "（" + esc(r.near) + "）" : "") +
      "　+　初始 1　=　" + r.total + "</div>";
  }

  function renderWhite() {
    var box = $("attr-grid");
    if (!box) return;
    box.innerHTML = W.ATTRS.map(function (a) {
      return '<div class="attr-cell"><strong>' + a + "</strong>" +
        '<input type="number" min="0" max="40" data-attr="' + a + '" value="' + (state.white.attrs[a] || 0) + '"></div>';
    }).join("");
    $("white-volume").value = state.white.volume || 5;

    function skillBlock(group) {
      return Object.keys(W.SKILLS).filter(function (s) { return W.SKILLS[s] === group; }).map(function (s) {
        var sk = state.white.skills[s] || W.emptySkill(0);
        return '<div class="skill-row"><strong>' + s + "</strong>" +
          '<input type="number" min="0" max="15" data-skill="' + s + '" value="' + (sk.rank || 0) + '">' +
          '<input type="text" data-prof="' + s + '" placeholder="专业，逗号分隔" value="' + esc((sk.professions || []).join("，")) + '">' +
          "</div>";
      }).join("");
    }
    $("skills-phy").innerHTML = skillBlock("生理");
    $("skills-men").innerHTML = skillBlock("心智");
    $("skills-soc").innerHTML = skillBlock("互动");

    var subs = state.white.subskills || [];
    $("subskills").innerHTML = subs.map(function (sub, idx) {
      return '<div class="skill-row sub-row">' +
        '<select data-sub-parent="' + idx + '">' + W.SUBSKILL_PARENTS.map(function (p) {
          return '<option' + (sub.parent === p ? " selected" : "") + ">" + p + "</option>";
        }).join("") + "</select>" +
        '<input type="number" min="0" max="15" data-sub-rank="' + idx + '" value="' + (sub.rank || 0) + '">' +
        '<input type="text" data-sub-name="' + idx + '" placeholder="子项名，如神乐" value="' + esc(sub.name || "") + '">' +
        '<input type="text" data-sub-prof="' + idx + '" placeholder="专业，逗号分隔" value="' + esc((sub.professions || []).join("，")) + '">' +
        '<button class="btn tiny danger" data-del-sub="' + idx + '">删</button></div>';
    }).join("");
  }

  function readWhite() {
    document.querySelectorAll("[data-attr]").forEach(function (el) {
      state.white.attrs[el.getAttribute("data-attr")] = Number(el.value) || 0;
    });
    document.querySelectorAll("[data-skill]").forEach(function (el) {
      var s = el.getAttribute("data-skill");
      if (!state.white.skills[s]) state.white.skills[s] = W.emptySkill(0);
      state.white.skills[s].rank = Number(el.value) || 0;
    });
    document.querySelectorAll("[data-prof]").forEach(function (el) {
      var s = el.getAttribute("data-prof");
      if (!state.white.skills[s]) state.white.skills[s] = W.emptySkill(0);
      state.white.skills[s].professions = el.value.split(/[,，;；]/).map(function (x) { return x.trim(); }).filter(Boolean);
    });
    state.white.volume = Number($("white-volume").value) || 5;
    (state.white.subskills || []).forEach(function (sub, idx) {
      var p = document.querySelector('[data-sub-parent="' + idx + '"]');
      var n = document.querySelector('[data-sub-name="' + idx + '"]');
      var r = document.querySelector('[data-sub-rank="' + idx + '"]');
      if (p) sub.parent = p.value;
      if (n) sub.name = n.value;
      if (r) sub.rank = Number(r.value) || 0;
      var pf = document.querySelector('[data-sub-prof="' + idx + '"]');
      if (pf) sub.professions = pf.value.split(/[,，;；]/).map(function (x) { return x.trim(); }).filter(Boolean);
    });
  }

  function applyOptions(selected) {
    selected = selected || [];
    var extra = [];
    Object.keys(W.SKILLS).forEach(function (s) { extra.push({ id: "skill:" + s, label: "技能判定·" + s }); });
    (state.white.subskills || []).forEach(function (sub) {
      if (sub && sub.parent && sub.name) {
        extra.push({ id: "skill:" + sub.parent + "-" + sub.name, label: "技能判定·" + W.formatSkillName(sub.parent + "-" + sub.name) });
      }
    });
    W.SUBSKILL_PARENTS.forEach(function (p) {
      extra.push({ id: "skill:" + p, label: "技能判定·" + p + "（最高子项）" });
    });
    W.ATTRS.forEach(function (a) { extra.push({ id: "attr:" + a, label: "属性相关·" + a }); });
    (state.attacks || []).forEach(function (a) { extra.push({ id: "preset:" + a.id, label: "预设·" + a.name }); });
    (state.checks || []).forEach(function (c) { extra.push({ id: "check:" + c.id, label: "检定·" + (c.name || "自定义") }); });
    return W.APPLY_PRESETS.concat(extra).map(function (p) {
      return '<option value="' + esc(p.id) + '"' + (selected.indexOf(p.id) !== -1 ? " selected" : "") + ">" + esc(p.label) + "</option>";
    }).join("");
  }

  function kindsList() {
    var list = (W.KINDS || []).slice();
    var have = {};
    list.forEach(function (k) { have[k.id] = true; });
    [
      { id: "attrReplace", label: "取代判定属性" },
      { id: "energyPool", label: "能量池" }
    ].forEach(function (k) {
      if (have[k.id]) return;
      var insertAt = 3;
      list.splice(Math.min(insertAt, list.length), 0, k);
    });
    return list;
  }

  function skillSelectHtml(selected, includeEmpty) {
    var subs = [];
    var mains = [];
    var names = W.skillSelectNames ? W.skillSelectNames(state) : Object.keys(W.SKILLS);
    if (!W.skillSelectNames) {
      (W.SUBSKILL_PARENTS || ["手艺", "表达"]).forEach(function (p) {
        if (names.indexOf(p) === -1) names.push(p);
      });
      (state.white.subskills || []).forEach(function (sub) {
        if (sub && sub.parent && sub.name) names.push(sub.parent + "-" + sub.name);
      });
    }
    names.forEach(function (s) {
      if (s === "手艺" || s === "表达" || s.indexOf("手艺-") === 0 || s.indexOf("表达-") === 0) subs.push(s);
      else mains.push(s);
    });
    function opts(list) {
      return list.map(function (s) {
        return '<option value="' + esc(s) + '"' + (selected === s ? " selected" : "") + ">" +
          esc(W.formatSkillName ? W.formatSkillName(s) : s) + "</option>";
      }).join("");
    }
    var html = includeEmpty ? '<option value="">（无技能）</option>' : "";
    html += '<optgroup label="手艺 / 表达">' + opts(subs.length ? subs : ["表达", "手艺"]) + "</optgroup>";
    html += '<optgroup label="其他技能">' + opts(mains) + "</optgroup>";
    return html;
  }

  function kindFields(b) {
    if (b.kind === "attr") {
      return '<select data-bf="attr">' + W.ATTRS.map(function (a) {
        return '<option' + (b.attr === a ? " selected" : "") + ">" + a + "</option>";
      }).join("") + "</select>";
    }
    if (b.kind === "skillRank") {
      return '<select data-bf="skill">' + skillSelectHtml(b.skill) + "</select>";
    }
    if (b.kind === "derived") {
      return '<select data-bf="derived">' + W.DERIVED_TARGETS.map(function (d) {
        return '<option value="' + d.id + '"' + (b.derived === d.id ? " selected" : "") + ">" + d.label + "</option>";
      }).join("") + "</select>";
    }
    if (b.kind === "defense") {
      return '<select data-bf="defensePart">' + W.DEFENSE_PARTS.map(function (d) {
        return '<option value="' + d.id + '"' + (b.defensePart === d.id ? " selected" : "") + ">" + d.label + "</option>";
      }).join("") + "</select>";
    }
    if (b.kind === "misc") {
      return '<input data-bf="miscText" placeholder="DR / 免疫 / 备注" value="' + esc(b.miscText || "") + '">';
    }
    if (b.kind === "attrReplace") {
      return '<div class="formula-box">以 <select data-bf="replaceTo">' + W.ATTRS.map(function (a) {
        return '<option' + ((b.replaceTo || "感知") === a ? " selected" : "") + ">" + a + "</option>";
      }).join("") + '</select> 取代 <select data-bf="replaceFrom">' + W.ATTRS.map(function (a) {
        return '<option' + ((b.replaceFrom || "决心") === a ? " selected" : "") + ">" + a + "</option>";
      }).join("") + "</select>" +
        '<select data-bf="applies" multiple size="3">' + applyOptions(b.applies || []) + "</select></div>";
    }
    if (b.kind === "energyPool") {
      return '<div class="formula-box"><input data-bf="energyName" placeholder="池名，如灵力" value="' + esc(b.energyName || "") + '">' +
        '<select data-bf="energyPart">' + W.ENERGY_PARTS.map(function (d) {
          return '<option value="' + d.id + '"' + ((b.energyPart || "cap") === d.id ? " selected" : "") + ">" + d.label + "</option>";
        }).join("") + "</select></div>";
    }
    return '<select data-bf="applies" multiple size="3">' + applyOptions(b.applies || []) + "</select>";
  }

  function valueFields(b) {
    if (b.kind === "attrReplace") {
      return '<span class="muted">—</span>';
    }
    var mode = b.valueMode || "fixed";
    var html = '<select data-bvm="' + esc(b.id || "") + '">' +
      '<option value="fixed"' + (mode !== "formula" ? " selected" : "") + ">固定</option>" +
      '<option value="formula"' + (mode === "formula" ? " selected" : "") + ">变量</option></select>";
    if (mode !== "formula") {
      html += '<input type="number" data-bv-num value="' + (b.value || 0) + '">';
      return '<div class="formula-box">' + html + "</div>";
    }
    html += '<select data-bf="valueSrc">' + W.VALUE_SOURCES.map(function (s) {
      return '<option value="' + s.id + '"' + ((b.valueSrc || "attr") === s.id ? " selected" : "") + ">" + s.label + "</option>";
    }).join("") + "</select>";
    if ((b.valueSrc || "attr") === "attr" || b.valueSrc === "legendary") {
      html += '<select data-bf="valueAttr">' + W.ATTRS.map(function (a) {
        return '<option' + ((b.valueAttr || "风度") === a ? " selected" : "") + ">" + a + "</option>";
      }).join("") + "</select>";
    }
    if (b.valueSrc === "skill") {
      html += '<select data-bf="valueSkill">' + skillSelectHtml(b.valueSkill) + "</select>";
    }
    html += '<label class="tiny-lab">×</label><input type="number" step="0.5" data-bf="valueMult" value="' + (b.valueMult == null ? 1 : b.valueMult) + '">';
    html += '<select data-bf="capMode">' + W.CAP_MODES.map(function (s) {
      return '<option value="' + s.id + '"' + ((b.capMode || "none") === s.id ? " selected" : "") + ">" + s.label + "</option>";
    }).join("") + "</select>";
    if (b.capMode === "fixed") {
      html += '<input type="number" data-bf="capValue" placeholder="上限" value="' + (b.capValue || 0) + '">';
    }
    if (b.capMode === "entryLevel") {
      html += '<label class="tiny-lab">×N</label><input type="number" step="0.5" data-bf="capMult" value="' + (b.capMult == null ? 3 : b.capMult) + '">';
    }
    if (b.capMode === "attr") {
      html += '<select data-bf="capAttr">' + W.ATTRS.map(function (a) {
        return '<option' + ((b.capAttr || "风度") === a ? " selected" : "") + ">" + a + "</option>";
      }).join("") + "</select>" +
        '<input type="number" step="0.5" data-bf="capMult" value="' + (b.capMult == null ? 1 : b.capMult) + '">';
    }
    return '<div class="formula-box">' + html + "</div>";
  }

  function renderEntries() {
    var box = $("entry-list");
    if (!box) return;
    if (!state.entries.length) {
      box.innerHTML = '<p class="muted">还没有条目。添加专长、血统、改造、能力组、技艺或物品，并写入加值类型与数值。</p>';
      return;
    }
    box.innerHTML = state.entries.map(function (e) {
      var open = ui.openEntry === e.id;
      var bonusRows = (e.bonuses || []).map(function (b, bi) {
        return '<tr class="' + (b.enabled === false ? "off" : "") + '">' +
          '<td><input type="checkbox" data-be="' + e.id + '" data-bi="' + bi + '" ' + (b.enabled !== false ? "checked" : "") + '></td>' +
          '<td><select data-bk="' + e.id + '" data-bi="' + bi + '">' + kindsList().map(function (k) {
            return '<option value="' + k.id + '"' + (b.kind === k.id ? " selected" : "") + ">" + k.label + "</option>";
          }).join("") + "</select></td>" +
          '<td><select data-bt="' + e.id + '" data-bi="' + bi + '">' + W.BONUS_TYPES.map(function (t) {
            return '<option' + (b.type === t ? " selected" : "") + ">" + t + "</option>";
          }).join("") + "</select></td>" +
          '<td>' + kindFields(b) + "</td>" +
          '<td><select data-bs="' + e.id + '" data-bi="' + bi + '">' +
            '<option value="obtain"' + (b.stackMode !== "increase" ? " selected" : "") + ">获得（取高）</option>" +
            '<option value="increase"' + (b.stackMode === "increase" ? " selected" : "") + ">增加/提升</option>" +
          "</select></td>" +
          '<td>' + valueFields(b) + "</td>" +
          '<td><input data-bn="' + e.id + '" data-bi="' + bi + '" placeholder="说明" value="' + esc(b.note || "") + '"></td>' +
          '<td><input data-bc="' + e.id + '" data-bi="' + bi + '" placeholder="消耗" value="' + esc(b.consume || "") + '"></td>' +
          '<td><label class="muted"><input type="checkbox" data-bcond="' + e.id + '" data-bi="' + bi + '" ' + (b.conditional ? "checked" : "") + ">条件</label></td>" +
          '<td><button class="btn tiny danger" data-del-bonus="' + e.id + '" data-bi="' + bi + '">删</button></td>' +
        "</tr>";
      }).join("");
      return '<div class="entry-card" data-entry="' + e.id + '">' +
        '<div class="entry-head" data-toggle-entry="' + e.id + '">' +
          '<input type="checkbox" data-en="' + e.id + '" ' + (e.enabled !== false ? "checked" : "") + ">" +
          '<span class="tag">' + esc(e.category) + "</span>" +
          '<span class="entry-title">' + esc(e.name || "未命名") + (e.rank ? " · " + esc(e.rank) : "") + "</span>" +
          '<span class="muted">' + (e.bonuses || []).length + " 条加值</span>" +
        "</div>" +
        (open ? '<div class="entry-body">' +
          '<div class="grid-2">' +
            '<div class="field"><label>名称</label><input data-ef="name" data-eid="' + e.id + '" value="' + esc(e.name) + '"></div>' +
            '<div class="field"><label>分类</label><select data-ef="category" data-eid="' + e.id + '">' +
              W.CATEGORIES.map(function (c) { return '<option' + (e.category === c ? " selected" : "") + ">" + c + "</option>"; }).join("") +
            "</select></div>" +
            '<div class="field"><label>等级（D/C/B/A 或数字）</label><input data-ef="rank" data-eid="' + e.id + '" value="' + esc(e.rank) + '"></div>' +
            '<div class="field"><label>条目等级（变量用，可空）</label><input type="number" data-ef="levelValue" data-eid="' + e.id + '" placeholder="空则按等级换算" value="' + (e.levelValue == null ? "" : esc(e.levelValue)) + '"></div>' +
            '<div class="field"><label>本质</label><select data-ef="essence" data-eid="' + e.id + '">' +
              W.ESSENCES.map(function (c) { return '<option' + (e.essence === c ? " selected" : "") + ">" + c + "</option>"; }).join("") +
            "</select></div>" +
            '<div class="field"><label>强化树（内在/修行属性叠算用）</label><input data-ef="treeId" data-eid="' + e.id + '" value="' + esc(e.treeId || "") + '"></div>' +
            '<div class="field"><label>备注</label><input data-ef="notes" data-eid="' + e.id + '" value="' + esc(e.notes || "") + '"></div>' +
          "</div>" +
          '<div class="row-actions">' +
            '<button class="btn tiny" data-add-bonus="' + e.id + '">添加加值</button>' +
            '<button class="btn tiny danger" data-del-entry="' + e.id + '">删除条目</button>' +
          "</div>" +
          '<table class="bonus-table"><thead><tr>' +
            "<th>开</th><th>种类</th><th>加值类型</th><th>作用对象</th><th>叠法</th><th>数值</th><th>说明</th><th>消耗</th><th></th><th></th>" +
          "</tr></thead><tbody>" + (bonusRows || '<tr><td colspan="10" class="muted">尚未写入加值</td></tr>') +
          "</tbody></table>" +
        "</div>" : "") +
      "</div>";
    }).join("");
  }

  function findEntry(id) {
    return state.entries.filter(function (e) { return e.id === id; })[0];
  }

  function readOpenEntry() {
    if (!ui.openEntry) return;
    var e = findEntry(ui.openEntry);
    if (!e) return;
    document.querySelectorAll('[data-eid="' + e.id + '"]').forEach(function (el) {
      var f = el.getAttribute("data-ef");
      if (!f) return;
      if (f === "levelValue") e.levelValue = el.value === "" ? "" : Number(el.value);
      else e[f] = el.value;
    });
    (e.bonuses || []).forEach(function (b, bi) {
      var row = document.querySelector('[data-entry="' + e.id + '"]');
      if (!row) return;
      var tds = row.querySelectorAll("tbody tr");
      var td = tds[bi];
      if (!td) return;
      var kindEl = td.querySelector("[data-bk]");
      var typeEl = td.querySelector("[data-bt]");
      var stackEl = td.querySelector("[data-bs]");
      var noteEl = td.querySelector("[data-bn]");
      var conEl = td.querySelector("[data-bc]");
      var enEl = td.querySelector("[data-be]");
      var condEl = td.querySelector("[data-bcond]");
      if (kindEl) b.kind = kindEl.value;
      if (typeEl) b.type = typeEl.value;
      if (stackEl) b.stackMode = stackEl.value;
      if (noteEl) b.note = noteEl.value;
      if (conEl) b.consume = conEl.value;
      if (enEl) b.enabled = enEl.checked;
      if (condEl) b.conditional = condEl.checked;
      var modeEl = td.querySelector("[data-bvm]");
      if (modeEl) b.valueMode = modeEl.value;
      var valEl = td.querySelector("[data-bv-num]");
      if (valEl) b.value = Number(valEl.value) || 0;
      td.querySelectorAll("[data-bf]").forEach(function (el) {
        var f = el.getAttribute("data-bf");
        if (!f) return;
        if (el.multiple) {
          b[f] = Array.prototype.map.call(el.selectedOptions, function (o) { return o.value; });
        } else if (el.type === "number") {
          b[f] = el.value === "" ? "" : Number(el.value);
        } else {
          b[f] = el.value;
        }
      });
      if (td.querySelector('[data-bf="miscText"]')) b.miscType = b.miscType || "note";
    });
  }

  function renderChecks() {
    var box = $("check-list");
    if (!box) return;
    state.checks = state.checks || [];
    if (!state.checks.length) {
      box.innerHTML = '<p class="muted">还没有自定义检定。可添加聆听、潜行、交涉等。</p>';
      return;
    }
    box.innerHTML = state.checks.map(function (c) {
      return '<div class="entry-card"><div class="entry-body">' +
        '<div class="grid-2">' +
          '<div class="field"><label>名称</label><input data-cf="name" data-cid="' + c.id + '" value="' + esc(c.name || "") + '"></div>' +
          '<div class="field"><label>判定性质</label><select data-cf="contest" data-cid="' + c.id + '">' +
            W.CONTESTS.map(function (x) { return '<option' + (c.contest === x ? " selected" : "") + ">" + x + "</option>"; }).join("") +
          "</select></div>" +
          '<div class="field"><label>属性一</label><select data-cf="attr" data-cid="' + c.id + '">' +
            W.ATTRS.map(function (a) { return '<option' + (c.attr === a ? " selected" : "") + ">" + a + "</option>"; }).join("") +
          "</select></div>" +
          '<div class="field"><label>属性二（可选）</label><select data-cf="attr2" data-cid="' + c.id + '">' +
            '<option value="">无</option>' +
            W.ATTRS.map(function (a) { return '<option' + (c.attr2 === a ? " selected" : "") + ">" + a + "</option>"; }).join("") +
          "</select></div>" +
          '<div class="field"><label>技能</label><select data-cf="skill" data-cid="' + c.id + '">' +
            skillSelectHtml(c.skill, true) +
          "</select></div>" +
          '<div class="field"><label>对应专业</label><input data-cf="profession" data-cid="' + c.id + '" value="' + esc(c.profession || "") + '"></div>' +
        "</div>" +
        '<div class="row-actions"><label class="muted"><input type="checkbox" data-cf="enabled" data-cid="' + c.id + '" ' + (c.enabled !== false ? "checked" : "") + "> 启用</label>" +
        '<button class="btn tiny danger" data-del-check="' + c.id + '">删除检定</button></div>' +
      "</div></div>";
    }).join("");
  }

  function readChecks() {
    (state.checks || []).forEach(function (c) {
      document.querySelectorAll('[data-cid="' + c.id + '"]').forEach(function (el) {
        var f = el.getAttribute("data-cf");
        if (!f) return;
        if (el.type === "checkbox") c[f] = el.checked;
        else c[f] = el.value;
      });
    });
  }

  function capBoxHtml(info, total) {
    if (!info) return "";
    var lines = (info.parts || []).map(function (p) {
      return '<div class="line">' + esc(p.label) + "　" + p.value + "</div>";
    }).join("");
    return '<div class="cap-box"><div class="k">伤害上限 ' + total + "</div>" +
      '<div class="muted">' + esc(info.formula || "") + "</div>" + lines + "</div>";
  }

  function renderAttacks(result) {
    var box = $("attack-list");
    if (!box) return;
    if (!state.attacks.length) {
      box.innerHTML = '<p class="muted">还没有攻击预设。例如弓箭：敏捷 + 运动 + 武器伤害。</p>';
      return;
    }
    var byId = {};
    (result && result.attacks ? result.attacks : []).forEach(function (a) { byId[a.preset.id] = a; });
    box.innerHTML = state.attacks.map(function (a) {
      var computed = byId[a.id];
      return '<div class="entry-card"><div class="entry-body">' +
        '<div class="grid-2">' +
          '<div class="field"><label>名称</label><input data-af="name" data-aid="' + a.id + '" value="' + esc(a.name) + '"></div>' +
          '<div class="field"><label>攻击方式</label><select data-af="attackType" data-aid="' + a.id + '">' +
            W.ATTACK_TYPES.map(function (t) { return '<option value="' + t.id + '"' + (a.attackType === t.id ? " selected" : "") + ">" + t.label + "</option>"; }).join("") +
          "</select></div>" +
          '<div class="field"><label>关键属性</label><select data-af="attr" data-aid="' + a.id + '">' +
            W.ATTRS.map(function (x) { return '<option' + (a.attr === x ? " selected" : "") + ">" + x + "</option>"; }).join("") +
          "</select></div>" +
          '<div class="field"><label>关键技能</label><select data-af="skill" data-aid="' + a.id + '">' +
            skillSelectHtml(a.skill) +
          "</select></div>" +
          '<div class="field"><label>对应专业</label><input data-af="profession" data-aid="' + a.id + '" value="' + esc(a.profession || "") + '"></div>' +
          '<div class="field"><label>武器伤害</label><input type="number" data-af="weaponDamage" data-aid="' + a.id + '" value="' + (a.weaponDamage || 0) + '"></div>' +
          '<div class="field"><label>武器体积</label><input type="number" data-af="weaponSize" data-aid="' + a.id + '" value="' + (a.weaponSize || 0) + '"></div>' +
          '<div class="field"><label>力量需求</label><input type="number" data-af="strReq" data-aid="' + a.id + '" value="' + (a.strReq || 0) + '"></div>' +
          '<div class="field"><label>基本射程</label><input type="number" data-af="range" data-aid="' + a.id + '" value="' + (a.range || 0) + '"></div>' +
          '<div class="field"><label>伤害类型</label><input data-af="damageType" data-aid="' + a.id + '" value="' + esc(a.damageType || "") + '"></div>' +
        "</div>" +
        '<div class="field"><label>备注</label><input data-af="notes" data-aid="' + a.id + '" value="' + esc(a.notes || "") + '"></div>' +
        (computed ? capBoxHtml(computed.damageCapInfo, computed.damageCap) : "") +
        '<div class="row-actions"><label class="muted"><input type="checkbox" data-af="enabled" data-aid="' + a.id + '" ' + (a.enabled !== false ? "checked" : "") + "> 启用</label>" +
        '<button class="btn tiny danger" data-del-atk="' + a.id + '">删除预设</button></div>' +
      "</div></div>";
    }).join("");
  }

  function readAttacks() {
    (state.attacks || []).forEach(function (a) {
      document.querySelectorAll('[data-aid="' + a.id + '"]').forEach(function (el) {
        var f = el.getAttribute("data-af");
        if (!f) return;
        if (el.type === "checkbox") a[f] = el.checked;
        else if (el.type === "number") a[f] = Number(el.value) || 0;
        else a[f] = el.value;
      });
    });
  }

  function findPool(id) {
    return (state.energyPools || []).filter(function (p) { return p.id === id; })[0];
  }

  function readEnergy() {
    (state.energyPools || []).forEach(function (p) {
      document.querySelectorAll('[data-pid="' + p.id + '"]').forEach(function (el) {
        var f = el.getAttribute("data-pf");
        if (!f) return;
        if (el.type === "checkbox") p[f] = el.checked;
        else if (el.type === "number") p[f] = el.value === "" ? 0 : Number(el.value);
        else p[f] = el.value;
      });
    });
  }

  function renderEnergy(result) {
    var box = $("pool-list");
    if (!box) return;
    state.energyPools = state.energyPools || [];
    if (!state.energyPools.length) {
      box.innerHTML = '<p class="muted">还没有能量池。可添加灵力、魔力、精力等，用于计算上限与回复。</p>';
      return;
    }
    var byName = {};
    (result && result.energyPools ? result.energyPools : []).forEach(function (p) {
      byName[p.pool.id] = p;
    });
    box.innerHTML = state.energyPools.map(function (p) {
      var computed = byName[p.id];
      return '<div class="entry-card"><div class="entry-body">' +
        '<div class="grid-2">' +
          '<div class="field"><label>名称</label><input data-pf="name" data-pid="' + p.id + '" value="' + esc(p.name || "") + '"></div>' +
          '<div class="field"><label>模板</label><select data-pf="template" data-pid="' + p.id + '">' +
            W.ENERGY_TEMPLATES.map(function (t) {
              return '<option value="' + t.id + '"' + (p.template === t.id ? " selected" : "") + ">" + t.name + "</option>";
            }).join("") +
          "</select></div>" +
          '<div class="field"><label>关键属性一</label><select data-pf="attr1" data-pid="' + p.id + '">' +
            W.ATTRS.map(function (a) { return '<option' + (p.attr1 === a ? " selected" : "") + ">" + a + "</option>"; }).join("") +
          "</select></div>" +
          '<div class="field"><label>关键属性二</label><select data-pf="attr2" data-pid="' + p.id + '">' +
            W.ATTRS.map(function (a) { return '<option' + (p.attr2 === a ? " selected" : "") + ">" + a + "</option>"; }).join("") +
          "</select></div>" +
          '<div class="field"><label>基础除数（属性之和÷此数）</label><input type="number" data-pf="divisor" data-pid="' + p.id + '" value="' + (p.divisor || 4) + '"></div>' +
          '<div class="field"><label>分类</label><select data-pf="category" data-pid="' + p.id + '">' +
            '<option value="generic"' + (p.category !== "special" ? " selected" : "") + ">通用能量</option>" +
            '<option value="special"' + (p.category === "special" ? " selected" : "") + ">特殊能量</option>" +
          "</select></div>" +
          '<div class="field"><label>额外开启来源（每次 +5 上限）</label><input type="number" min="0" data-pf="extraOpenings" data-pid="' + p.id + '" value="' + (p.extraOpenings || 0) + '"></div>' +
          '<div class="field"><label>能量池强化</label><select data-pf="enhanceRank" data-pid="' + p.id + '">' +
            W.ENHANCE_RANKS.map(function (r) {
              return '<option value="' + r.id + '"' + ((p.enhanceRank || "") === r.id ? " selected" : "") + ">" + esc(r.label) + "</option>";
            }).join("") +
          "</select></div>" +
          '<div class="field"><label>额外上限</label><input type="number" data-pf="bonusCap" data-pid="' + p.id + '" value="' + (p.bonusCap || 0) + '"></div>' +
          '<div class="field"><label>额外每小时回复</label><input type="number" data-pf="bonusHourly" data-pid="' + p.id + '" value="' + (p.bonusHourly || 0) + '"></div>' +
          '<div class="field"><label>额外每8小时回复</label><input type="number" data-pf="bonusRest8" data-pid="' + p.id + '" value="' + (p.bonusRest8 || 0) + '"></div>' +
        "</div>" +
        '<div class="field"><label>备注</label><input data-pf="notes" data-pid="' + p.id + '" value="' + esc(p.notes || "") + '"></div>' +
        (computed ? energyBoxHtml(computed) : "") +
        '<div class="row-actions"><label class="muted"><input type="checkbox" data-pf="enabled" data-pid="' + p.id + '" ' + (p.enabled !== false ? "checked" : "") + "> 启用</label>" +
        '<button class="btn tiny danger" data-del-pool="' + p.id + '">删除能量池</button></div>' +
      "</div></div>";
    }).join("");
  }

  function energyBoxHtml(p) {
    var lines = (p.parts || []).map(function (x) {
      return '<div class="line">' + esc(x.label) + "　" + x.value + "</div>";
    }).join("");
    var hLines = (p.hourlyParts || []).map(function (x) {
      return '<div class="line">' + esc(x.label) + "　" + x.value + "</div>";
    }).join("");
    var rLines = (p.restParts || []).map(function (x) {
      return '<div class="line">' + esc(x.label) + "　" + x.value + "</div>";
    }).join("");
    return '<div class="cap-box energy-box">' +
      '<div class="k">' + esc(p.name) + "　上限 " + p.cap + (p.apparent && p.apparent !== "无支线" ? "　·　视同 " + p.apparent + " 级" : "") + "</div>" +
      '<div class="stat-cards" style="margin-top:8px">' +
        '<div class="stat-card"><div class="k">上限</div><div class="n">' + p.cap + "</div></div>" +
        '<div class="stat-card"><div class="k">每小时回复</div><div class="n">' + p.hourly + "</div></div>" +
        '<div class="stat-card"><div class="k">每8小时回复</div><div class="n">' + p.rest8 + "</div></div>" +
        (p.shortNote ? '<div class="stat-card"><div class="k">短休息</div><div class="n">' + p.shortRest + '</div><div class="s">' + esc(p.shortNote) + "</div></div>" : "") +
      "</div>" +
      '<details class="break"><summary>构成</summary>' +
        (lines ? '<div class="muted">上限</div>' + lines : "") +
        (hLines ? '<div class="muted">每小时</div>' + hLines : "") +
        (rLines ? '<div class="muted">每8小时</div>' + rLines : "") +
      "</details></div>";
  }

  function addPool() {
    try {
      syncFromDom();
      state.energyPools = state.energyPools || [];
      var pool = W.emptyEnergyPool ? W.emptyEnergyPool("spirit") : {
        id: W.uid("pool"), enabled: true, name: "灵力", template: "spirit",
        category: "generic", attr1: "决心", attr2: "沉着", divisor: 4,
        extraOpenings: 0, enhanceRank: "", bonusCap: 0, bonusHourly: 0, bonusRest8: 0, notes: ""
      };
      state.energyPools.push(pool);
      renderAll();
    } catch (err) {
      alert("无法添加能量池：" + (err && err.message ? err.message : err));
    }
  }

  function syncFromDom() {
    if ($("info-name")) readInfo();
    readWhite();
    readOpenEntry();
    readAttacks();
    readChecks();
    readEnergy();
    var sel = $("preset-select");
    if (sel) selectedPresetId = sel.value;
  }

  function fmtSign(n) { return (n >= 0 ? "+" : "") + n; }

  function breakdownHtml(stacked) {
    if (!stacked) return "";
    var lines = [];
    (stacked.detail || []).forEach(function (g) {
      (g.used || []).forEach(function (b) {
        lines.push('<div class="line">生效 · ' + esc(b.type) + " " + fmtSign(b.value) + " · " + esc(b.sourceName) + (b.note ? "（" + esc(b.note) + "）" : "") + "</div>");
      });
    });
    (stacked.dropped || []).forEach(function (b) {
      lines.push('<div class="line drop">未生效 · ' + esc(b.type) + " " + fmtSign(b.value) + " · " + esc(b.sourceName) + "（同类型取高/未叠）</div>");
    });
    if (!lines.length) return "";
    return '<details class="break"><summary>加值明细</summary>' + lines.join("") + "</details>";
  }

  function checkHtml(c) {
    var lines = (c.baseLines || []).map(function (ln) {
      return '<div class="line">基础 · ' + esc(ln.label) + " " + ln.value + (ln.note ? " · " + esc(ln.note) : "") + "</div>";
    }).join("");
    return '<div class="stat-card">' +
      '<div class="k">' + esc(c.name) + (c.contest ? " · " + c.contest : "") + "</div>" +
      '<div class="n">' + c.dp + '<span class="s"> DP</span>' + (c.extraSuccess ? " +" + c.extraSuccess : "") + "</div>" +
      (c.halved ? '<div class="warn">无对应专业，技能级数已减半</div>' : "") +
      '<details class="break"><summary>构成</summary>' + lines + breakdownHtml(c.stacked) +
      (c.extraStacked && c.extraStacked.used.length ? c.extraStacked.used.map(function (b) {
        return '<div class="line">附加成功 · ' + fmtSign(b.value) + " · " + esc(b.sourceName) + "</div>";
      }).join("") : "") +
      (c.extraStacked ? (c.extraStacked.dropped || []).map(function (b) {
        return '<div class="line drop">附加成功未生效 · ' + fmtSign(b.value) + " · " + esc(b.sourceName) + "</div>";
      }).join("") : "") +
      "</details></div>";
  }

  function renderSheet(r) {
    r = r || W.compute(state);
    $("sheet-title").textContent = (state.info.name || "未命名") + " · 结算总览";
    var conds = [];
    (state.entries || []).forEach(function (e) {
      (e.bonuses || []).forEach(function (b) {
        if (b.conditional) {
          conds.push('<label class="cond-item"><input type="checkbox" data-cond-e="' + e.id + '" data-cond-b="' + b.id + '" ' + (b.enabled !== false ? "checked" : "") + ">" +
            esc(e.name) + " · " + esc(b.note || b.type) + (b.consume ? "（" + esc(b.consume) + "）" : "") + "</label>");
        }
      });
    });
    $("cond-bar").innerHTML = conds.length ? conds.join("") : "";

    $("sheet-attrs").innerHTML = W.ATTRS.map(function (a) {
      var x = r.attrs[a];
      return '<div class="stat-card"><div class="k">' + a + "</div>" +
        '<div class="n">' + x.total + '</div><div class="s">白卡 ' + x.white + (x.bonus ? " · 加值 " + fmtSign(x.bonus) : "") +
        " · 传奇 " + x.legendary + "</div>" + breakdownHtml(x.stacked) + "</div>";
    }).join("");

    $("sheet-skills").innerHTML = Object.keys(r.skills).filter(function (s) {
      if (s === "手艺" || s === "表达") {
        var hasChild = Object.keys(r.skills).some(function (n) {
          return n.indexOf(s + "-") === 0 && r.skills[n].total;
        });
        if (hasChild) return false;
      }
      return r.skills[s].total || (r.skills[s].professions || []).length;
    }).map(function (s) {
      var x = r.skills[s];
      return '<div class="kv"><span>' + W.formatSkillName(s) + (x.professions.length ? "（" + x.professions.join("、") + "）" : "") +
        "</span><span class='v'>" + x.total + (x.extraSuccess ? " · 附加成功 +" + x.extraSuccess : "") + "</span></div>";
    }).join("") || '<p class="muted">技能均为 0</p>';

    var d = r.derived;
    $("sheet-derived").innerHTML = [
      ["体积 / 体调", d.volume + " / " + d.sizeAdj],
      ["速度", d.speed.total + " 米"],
      ["先攻 DP", r.checks.initiative.dp + (r.checks.initiative.extraSuccess ? " +" + r.checks.initiative.extraSuccess : "")],
      ["生命值上限", d.hp.total + (d.hp.raw < 1 ? "（计算值 " + d.hp.raw + "，下限 1）" : "")],
      ["意志值", d.willValue.total],
      ["意志力上限", d.willpower.total],
      ["精力上限", d.energy.total],
      ["敏感范围", d.sense.total + " 米"],
      ["模糊范围", d.blur.total + " 米"],
      ["影响力 / 控制力", d.influence + " / " + d.control],
      ["基础防御", d.baseDefense.total],
      ["累计战斗力", (function () {
        var p = W.combatPower(state.power || W.emptyPower());
        return p.total + "（资源强度 " + p.strengthD + "D + 初始 1）";
      })()]
    ].map(function (row) {
      return '<div class="kv"><span>' + row[0] + '</span><span class="v">' + row[1] + "</span></div>";
    }).join("");

    var energyBox = $("sheet-energy");
    if (energyBox) {
      energyBox.innerHTML = (r.energyPools && r.energyPools.length) ? r.energyPools.map(function (p) {
        return '<div class="kv"><span>' + esc(p.name) + (p.keyAttrs.length ? "（" + p.keyAttrs.join("+") + "）" : "") +
          "</span><span class='v'>上限 " + p.cap + " · 每小时 " + p.hourly + " · 8小时 " + p.rest8 +
          (p.shortRest ? " · 短休息 " + p.shortRest : "") + "</span></div>";
      }).join("") : '<p class="muted">未设置能量池</p>';
    }

    $("sheet-checks").innerHTML = (function () {
      var html = W.SHEET_CHECK_IDS.map(function (id) {
        return r.checks[id] ? checkHtml(r.checks[id]) : "";
      }).join("");
      (state.checks || []).forEach(function (c) {
        if (c.enabled !== false && r.checks[c.id]) html += checkHtml(r.checks[c.id]);
      });
      return html;
    })();

    $("sheet-attacks").innerHTML = r.attacks.length ? r.attacks.map(function (a) {
      return checkHtml(a.check) + capBoxHtml(a.damageCapInfo, a.damageCap) +
        '<div class="muted" style="margin:4px 0 12px 8px;font-size:12px">射程 ' + a.range + (a.maxRange ? " / 最大 " + a.maxRange : "") +
        (a.damageType ? " · " + esc(a.damageType) : "") + (a.notes ? " · " + esc(a.notes) : "") + "</div>";
    }).join("") : '<p class="muted">未设置攻击预设</p>';

    var def = r.defense;
    $("sheet-defense").innerHTML =
      '<div class="stat-cards">' +
        '<div class="stat-card"><div class="k">常驻防御</div><div class="n">' + def.standing.total +
          (def.extraSuccess ? " +" + def.extraSuccess : "") + "</div></div>" +
        '<div class="stat-card"><div class="k">全力防御</div><div class="n">' + def.full.total + "</div></div>" +
        '<div class="stat-card"><div class="k">格挡基本值</div><div class="n">' + def.bladeBlock + '<span class="s"> 白刃</span> / ' + def.meleeBlock + '<span class="s"> 肉搏</span></div></div>' +
      "</div>" +
      breakdownHtml(def.standing) +
      (r.misc.length ? '<div class="section-title">其他</div>' + r.misc.map(function (m) {
        return '<div class="line">' + esc(m.sourceName) + " · " + esc(m.text || (m.miscType + " " + m.value)) + "</div>";
      }).join("") : "");
  }

  function addEntry() {
    syncFromDom();
    var e = {
      id: W.uid("e"),
      category: "专长",
      name: "新条目",
      rank: "",
      essence: "无",
      treeId: "",
      enabled: true,
      notes: "",
      bonuses: []
    };
    state.entries.push(e);
    ui.openEntry = e.id;
    renderAll();
  }

  function addBonus(eid) {
    syncFromDom();
    var e = findEntry(eid);
    if (!e) return;
    e.bonuses = e.bonuses || [];
    e.bonuses.push({
      id: W.uid("b"),
      enabled: true,
      type: W.DEFAULT_TYPE_BY_CATEGORY[e.category] || "无名",
      kind: "checkDp",
      stackMode: "obtain",
      value: 1,
      applies: ["allChecks"],
      attr: "感知",
      skill: "运动",
      derived: "hp",
      defensePart: "other",
      note: "",
      consume: "",
      conditional: false,
      miscType: "",
      miscText: "",
      valueMode: "fixed",
      valueSrc: "attr",
      valueAttr: "风度",
      valueSkill: "",
      valueMult: 1,
      capMode: "none",
      capAttr: "风度",
      capMult: 3,
      capValue: 0,
      replaceFrom: "决心",
      replaceTo: "感知",
      energyPart: "cap",
      energyName: ""
    });
    ui.openEntry = eid;
    renderAll();
  }

  function addCheck() {
    syncFromDom();
    state.checks = state.checks || [];
    state.checks.push({
      id: W.uid("chk"),
      enabled: true,
      name: "新检定",
      attr: "感知",
      attr2: "",
      skill: "调查",
      profession: "",
      contest: "竞争"
    });
    renderAll();
  }

  function addAttack() {
    syncFromDom();
    state.attacks.push({
      id: W.uid("atk"),
      enabled: true,
      name: "新攻击",
      attackType: "bow",
      attr: "敏捷",
      skill: "运动",
      profession: "",
      weaponDamage: 0,
      weaponSize: 0,
      strReq: 0,
      range: 0,
      damageType: "",
      notes: ""
    });
    renderAll();
  }

  function downloadJson() {
    syncFromDom();
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (state.info.name || "character") + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function bind() {
    document.querySelectorAll(".tab").forEach(function (t) {
      t.addEventListener("click", function () { syncFromDom(); setTab(t.getAttribute("data-tab")); renderAll(); });
    });
    $("btn-new").addEventListener("click", function () {
      if (!confirm("清空当前角色，建立空白白卡？")) return;
      state = W.emptyCharacter();
      ui.openEntry = null;
      renderAll();
    });
    $("btn-preset-save").addEventListener("click", function () {
      syncFromDom();
      if (!folderApi) {
        alert("请先运行「启动计算器.bat」打开本页，预设才能写入 presets 文件夹。");
        return;
      }
      var name = window.prompt("预设名称（保存为 presets 文件夹中的 JSON）", state.info.name || "未命名");
      if (name == null) return;
      name = String(name).trim() || "未命名";
      var body = { name: name, character: W.clone(state) };
      if (selectedPresetId) {
        var cur = presetList.filter(function (p) { return p.file === selectedPresetId; })[0];
        if (cur && (cur.name === name || cur.file.replace(/\.json$/i, "") === name)) {
          body.file = selectedPresetId;
        }
      }
      fetch("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(body)
      }).then(function (r) {
        if (!r.ok) throw new Error("保存失败");
        return r.json();
      }).then(function (res) {
        selectedPresetId = res.file || selectedPresetId;
        return refreshPresets();
      }).catch(function (err) {
        alert("保存失败：" + (err && err.message ? err.message : err));
      });
    });
    $("btn-preset-load").addEventListener("click", function () {
      var sel = $("preset-select");
      var id = sel ? sel.value : selectedPresetId;
      if (!id) { alert("请先选择一个预设。"); return; }
      if (!folderApi) { alert("请用「启动计算器.bat」打开后再读取。"); return; }
      var item = presetList.filter(function (p) { return p.file === id; })[0];
      var label = item ? item.name : id;
      if (!confirm("读取「" + label + "」？当前未保存的修改会丢失。")) return;
      fetch("/api/presets/" + encodeURIComponent(id), { cache: "no-store" }).then(function (r) {
        if (!r.ok) throw new Error("读取失败");
        return r.json();
      }).then(function (data) {
        state = unwrapCharacter(data);
        if (!state.checks) state.checks = [];
        if (!state.entries) state.entries = [];
        if (!state.attacks) state.attacks = [];
        if (!state.power) state.power = W.emptyPower();
        if (!state.energyPools) state.energyPools = [];
        selectedPresetId = id;
        ui.openEntry = null;
        renderAll();
      }).catch(function (err) {
        alert("读取失败：" + (err && err.message ? err.message : err));
      });
    });
    $("btn-preset-delete").addEventListener("click", function () {
      var sel = $("preset-select");
      var id = sel ? sel.value : selectedPresetId;
      if (!id) { alert("请先选择一个预设。"); return; }
      if (!folderApi) return;
      var item = presetList.filter(function (p) { return p.file === id; })[0];
      var label = item ? item.name : id;
      if (!confirm("从 presets 文件夹删除「" + label + "」？")) return;
      fetch("/api/presets/" + encodeURIComponent(id), { method: "DELETE" }).then(function (r) {
        if (!r.ok) throw new Error("删除失败");
        return r.json();
      }).then(function () {
        selectedPresetId = "";
        return refreshPresets();
      }).catch(function (err) {
        alert("删除失败：" + (err && err.message ? err.message : err));
      });
    });
    $("preset-select").addEventListener("change", function () {
      selectedPresetId = this.value;
    });
    $("btn-export").addEventListener("click", downloadJson);
    $("btn-import").addEventListener("click", function () { $("file-import").click(); });
    $("file-import").addEventListener("change", function () {
      var file = this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          state = JSON.parse(reader.result);
          ui.openEntry = null;
          renderAll();
        } catch (err) { alert("无法读取 JSON：" + err.message); }
      };
      reader.readAsText(file, "utf-8");
      this.value = "";
    });
    $("btn-add-entry").addEventListener("click", addEntry);
    $("btn-add-attack").addEventListener("click", addAttack);
    $("btn-add-check").addEventListener("click", addCheck);
    $("btn-add-sub").addEventListener("click", function () {
      syncFromDom();
      state.white.subskills = state.white.subskills || [];
      state.white.subskills.push({ parent: "手艺", name: "", rank: 0, professions: [] });
      renderAll();
    });

    document.body.addEventListener("change", function (ev) {
      var t = ev.target;
      if (t.closest("#pane-white") || t.closest("#pane-info") || t.closest("#pane-attacks") || t.closest("#pane-entries") || t.closest("#pane-checks") || t.closest("#pane-energy") || t.closest("#cond-bar")) {
        if (t.hasAttribute("data-cond-e")) {
          var e = findEntry(t.getAttribute("data-cond-e"));
          if (e) {
            e.bonuses.forEach(function (b) {
              if (b.id === t.getAttribute("data-cond-b")) b.enabled = t.checked;
            });
          }
        } else {
          syncFromDom();
        }
        if (t.getAttribute("data-pf") === "template") {
          var pool = findPool(t.getAttribute("data-pid"));
          if (pool) {
            var tpl = W.energyTemplate(pool.template);
            pool.attr1 = tpl.attr1;
            pool.attr2 = tpl.attr2;
            pool.divisor = tpl.divisor || 4;
            pool.category = tpl.category || "generic";
            if (tpl.note) pool.notes = tpl.note;
            var tplNames = W.ENERGY_TEMPLATES.map(function (x) { return x.name; });
            if (!pool.name || tplNames.indexOf(pool.name) !== -1) pool.name = tpl.name;
          }
        }
        var rebuild = t.hasAttribute("data-bk") || t.hasAttribute("data-en") || t.hasAttribute("data-bvm") ||
          t.getAttribute("data-bf") === "valueSrc" || t.getAttribute("data-bf") === "capMode" ||
          t.closest("#pane-attacks") || t.closest("#pane-checks") || t.closest("#pane-energy");
        if (rebuild) {
          if (t.hasAttribute("data-en")) {
            var en = findEntry(t.getAttribute("data-en"));
            if (en) en.enabled = t.checked;
          }
          renderAll();
          return;
        }
        renderSheet();
        renderPowerResult();
        persist();
      }
    });

    document.body.addEventListener("click", function (ev) {
      if (ev.target.closest("#btn-add-pool")) {
        addPool();
        return;
      }
      var t = ev.target.closest("[data-toggle-entry],[data-add-bonus],[data-del-entry],[data-del-bonus],[data-del-atk],[data-del-sub],[data-del-check],[data-del-pool]");
      if (!t) return;
      if (t.hasAttribute("data-toggle-entry")) {
        if (ev.target.matches("input")) return;
        syncFromDom();
        var id = t.getAttribute("data-toggle-entry");
        ui.openEntry = ui.openEntry === id ? null : id;
        renderAll();
      } else if (t.hasAttribute("data-add-bonus")) {
        addBonus(t.getAttribute("data-add-bonus"));
      } else if (t.hasAttribute("data-del-entry")) {
        syncFromDom();
        state.entries = state.entries.filter(function (e) { return e.id !== t.getAttribute("data-del-entry"); });
        ui.openEntry = null;
        renderAll();
      } else if (t.hasAttribute("data-del-bonus")) {
        syncFromDom();
        var ee = findEntry(t.getAttribute("data-del-bonus"));
        if (ee) ee.bonuses.splice(Number(t.getAttribute("data-bi")), 1);
        renderAll();
      } else if (t.hasAttribute("data-del-atk")) {
        syncFromDom();
        state.attacks = state.attacks.filter(function (a) { return a.id !== t.getAttribute("data-del-atk"); });
        renderAll();
      } else if (t.hasAttribute("data-del-check")) {
        syncFromDom();
        state.checks = (state.checks || []).filter(function (c) { return c.id !== t.getAttribute("data-del-check"); });
        renderAll();
      } else if (t.hasAttribute("data-del-pool")) {
        syncFromDom();
        state.energyPools = (state.energyPools || []).filter(function (p) { return p.id !== t.getAttribute("data-del-pool"); });
        renderAll();
      } else if (t.hasAttribute("data-del-sub")) {
        syncFromDom();
        state.white.subskills.splice(Number(t.getAttribute("data-del-sub")), 1);
        renderAll();
      }
    });
  }

  function init() {
    try {
      restore();
      if (!state.info || !state.white) state = W.emptyCharacter();
      if (!state.entries) state.entries = [];
      if (!state.attacks) state.attacks = [];
      if (!state.checks) state.checks = [];
      if (!state.power) state.power = W.emptyPower();
      if (!state.energyPools) state.energyPools = [];
      bind();
      setTab("white");
      renderAll();
    } catch (err) {
      alert("计算器初始化失败：" + (err && err.message ? err.message : err));
      throw err;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
