// Manual add page
// Supabase integration mirrors `script.js` but also supports adding rows.
const STORAGE_KEY = "turnover_manual_v1";
const SUPABASE_TABLE = "consultants";
const isSupabaseReady = () => (typeof window !== "undefined" && !!window.sb);
function waitForSupabaseReady(timeoutMs = 4000){
  return new Promise((resolve) => {
    if (isSupabaseReady()) return resolve(true);
    let done = false;
    const onReady = (e) => {
      if (done) return; done = true;
      window.removeEventListener('supabase:ready', onReady);
      resolve(!!(e && e.detail && e.detail.ready));
    };
    window.addEventListener('supabase:ready', onReady, { once: true });
    setTimeout(() => { if (!done) { window.removeEventListener('supabase:ready', onReady); resolve(isSupabaseReady()); } }, timeoutMs);
  });
}
function saveData(d) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch (e) {}
  if (isSupabaseReady()) queueCloudSync(d);
}
function loadData() {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    return r ? JSON.parse(r) : null;
  } catch (e) {
    return null;
  }
}
function seed() {
  const arr = [];
  for (let i = 1; i <= 10; i++) {
    arr.push({
      name: `Consultant ${i}`,
      company: `Entreprise ${String.fromCharCode(64 + i)}`,
      mailbox: `consultant${i}@entreprise${i}.com`,
      status: "Nouveau",
      lastAction: null,
      active: true,
    });
  }
  return arr;
}
let data = loadData() || seed();

let cloudSyncTimer = null;
function queueCloudSync(d){
  if (!isSupabaseReady()) return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => {
    supaSyncAll(d).catch(() => {});
  }, 400);
}

async function supaFetchAll(){
  if (!isSupabaseReady()) return null;
  const { data: rows, error } = await window.sb
    .from(SUPABASE_TABLE)
    .select("id,name,company,mailbox,status,lastAction,active")
    .order("id", { ascending: true });
  if (error) {
    console.error("Supabase select error:", error);
    return null;
  }
  if (!Array.isArray(rows)) return [];
  return rows.map(r => ({
    name: r.name || "",
    company: r.company || "",
    mailbox: r.mailbox || "",
    status: r.status || "Nouveau",
    lastAction: r.lastAction || null,
    active: typeof r.active === "boolean" ? r.active : true,
  }));
}

async function supaSyncAll(list){
  if (!isSupabaseReady()) return;
  const payload = list.map(item => ({
    name: item.name,
    company: item.company,
    mailbox: item.mailbox || null,
    status: item.status,
    lastAction: item.lastAction || null,
    active: !!item.active,
  }));
  const { error: delErr } = await window.sb.from(SUPABASE_TABLE).delete().neq("id", -1);
  if (delErr) {
    console.error("Supabase delete error:", delErr);
    return;
  }
  if (payload.length === 0) return;
  const { error: insErr } = await window.sb.from(SUPABASE_TABLE).insert(payload);
  if (insErr) {
    console.error("Supabase insert error:", insErr);
  }
}

const tableBody = document.getElementById("table-body");
const countJour = document.getElementById("count-jour");
const countAttention = document.getElementById("count-attention");
const countRetard = document.getElementById("count-retard");
const countAttente = document.getElementById("count-attente");
const countInactifs = document.getElementById("count-inactifs");
const statusCfg = {
  "À jour": { cls: "status-jour", icon: "fa-check-circle" },
  Attention: { cls: "status-attention", icon: "fa-clock" },
  "En retard": { cls: "status-retard", icon: "fa-triangle-exclamation" },
  "En attente": { cls: "status-attente", icon: "fa-arrow-trend-up" },
  Nouveau: { cls: "status-nouveau", icon: "fa-user" },
  Inactif: { cls: "status-inactif", icon: "fa-user-slash" },
};
const fmt = (t) => {
  if (!t) return "N/A";
  const d = new Date(t);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const nn = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${nn}`;
};
const valid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).toLowerCase());
const setBadge = (el, s) => {
  const c = statusCfg[s] || statusCfg["En attente"];
  el.className = `status-badge ${c.cls}`;
  el.innerHTML = `<i class="fa-solid ${c.icon}"></i> ${s}`;
};
function rules(it, btn, badge) {
  if (!it.active) {
    it.status = "Inactif";
    setBadge(badge, it.status);
    btn.classList.remove("highlight");
    return;
  }
  if (!it.lastAction) {
    it.status = it.status === "Nouveau" ? "Nouveau" : "En attente";
    setBadge(badge, it.status);
    btn.classList.add("highlight");
    return;
  }
  const d = (Date.now() - it.lastAction) / 86400000;
  if (d >= 4) {
    it.status = "En retard";
    setBadge(badge, it.status);
    btn.classList.add("highlight");
  } else if (d >= 2) {
    it.status = "Attention";
    setBadge(badge, it.status);
    btn.classList.add("highlight");
  } else {
    it.status = "À jour";
    setBadge(badge, it.status);
    btn.classList.remove("highlight");
  }
}
function counts() {
  let j = 0,
    a = 0,
    r = 0,
    e = 0,
    i = 0;
  data.forEach((c) => {
    if (!c.active) {
      i++;
      return;
    }
    switch (c.status) {
      case "À jour":
        j++;
        break;
      case "Attention":
        a++;
        break;
      case "En retard":
        r++;
        break;
      case "En attente":
      case "Nouveau":
        e++;
        break;
      default:
        e++;
    }
  });
  countJour.textContent = j;
  countAttention.textContent = a;
  countRetard.textContent = r;
  countAttente.textContent = e;
  countInactifs.textContent = i;
}
function build() {
  tableBody.innerHTML = "";
  data.forEach((c, idx) => {
    const tr = document.createElement("tr");
    const tdN = document.createElement("td");
    const wrap = document.createElement("div");
    wrap.className = "name-wrap";
    const name = document.createElement("span");
    name.className = "name editable";
    name.textContent = c.name;
    name.setAttribute("contenteditable", "true");
    name.title = "Cliquez pour renommer";
    name.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        name.blur();
      }
    });
    name.addEventListener("blur", () => {
      const v = name.textContent.trim();
      if (v.length) {
        c.name = v;
        saveData(data);
      } else {
        name.textContent = c.name;
      }
    });
    const comp = document.createElement("div");
    comp.textContent = c.company;
    comp.style.fontSize = "12px";
    comp.style.color = "#6c6f89";
    wrap.appendChild(name);
    tdN.appendChild(wrap);
    tdN.appendChild(comp);
    tr.appendChild(tdN);
    const tdM = document.createElement("td");
    const w = document.createElement("div");
    w.className = "email-wrapper";
    const ic = document.createElement("i");
    ic.className = "fa-solid fa-envelope";
    const inp = document.createElement("input");
    inp.type = "email";
    inp.placeholder = "prenom.nom@domaine.com";
    inp.className = "email-input";
    inp.value = c.mailbox || "";
    inp.autocomplete = "off";
    inp.spellcheck = false;
    inp.autocapitalize = "none";
    inp.autocorrect = "off";
    const valVis = () => {
      const ok = valid(inp.value.trim());
      if (ok) inp.classList.remove("invalid");
      else inp.classList.add("invalid");
    };
    const commit = () => {
      const v = inp.value.trim();
      if (valid(v)) {
        c.mailbox = v;
        inp.classList.remove("invalid");
        saveData(data);
      } else inp.classList.add("invalid");
    };
    inp.addEventListener("input", valVis);
    inp.addEventListener("change", commit);
    inp.addEventListener("blur", commit);
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        inp.blur();
      }
    });
    w.appendChild(ic);
    w.appendChild(inp);
    tdM.appendChild(w);
    tr.appendChild(tdM);
    const tdS = document.createElement("td");
    const b = document.createElement("span");
    b.className = "status-badge";
    b.textContent = c.status;
    tdS.appendChild(b);
    tr.appendChild(tdS);
    const tdL = document.createElement("td");
    const la = document.createElement("span");
    la.className = "last-action";
    la.textContent = fmt(c.lastAction);
    tdL.appendChild(la);
    tr.appendChild(tdL);
    const tdA = document.createElement("td");
    const lbl = document.createElement("label");
    lbl.className = "switch";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!c.active;
    const sl = document.createElement("span");
    sl.className = "slider";
    lbl.appendChild(cb);
    lbl.appendChild(sl);
    cb.addEventListener("change", () => {
      c.active = cb.checked;
      rules(c, btn, b);
      saveData(data);
      counts();
    });
    tdA.appendChild(lbl);
    tr.appendChild(tdA);
    const tdB = document.createElement("td");
    const btn = document.createElement("button");
    btn.className = "action-btn";
    btn.textContent = "Candidater";
    btn.addEventListener("click", () => {
      c.lastAction = Date.now();
      c.status = "À jour";
      la.textContent = fmt(c.lastAction);
      rules(c, btn, b);
      saveData(data);
      counts();
    });
    tdB.appendChild(btn);
    tr.appendChild(tdB);
    rules(c, btn, b);
    tableBody.appendChild(tr);
  });
}
function showForm(s) {
  document.getElementById("add-form").style.display = s ? "block" : "none";
}
document.addEventListener("DOMContentLoaded", async () => {
  if (!isSupabaseReady()) await waitForSupabaseReady();
  try {
    const cloud = await supaFetchAll();
    if (cloud && cloud.length) {
      data = cloud;
      saveData(data);
    }
  } catch (e) {}
  build();
  counts();
  document
    .getElementById("toggle-add")
    .addEventListener("click", () => showForm(true));
  document
    .getElementById("nf-cancel")
    .addEventListener("click", () => showForm(false));
  document.getElementById("nf-save").addEventListener("click", () => {
    const name = document.getElementById("nf-name").value.trim();
    const company = document.getElementById("nf-company").value.trim();
    const mail = document.getElementById("nf-mail").value.trim();
    if (!name || !company || !valid(mail)) {
      alert("Veuillez saisir un nom, une société et un email valide.");
      return;
    }
    data.push({
      name,
      company,
      mailbox: mail,
      status: "Nouveau",
      lastAction: null,
      active: true,
    });
    saveData(data);
    showForm(false);
    build();
    counts();
    document.getElementById("nf-name").value = "";
    document.getElementById("nf-company").value = "";
    document.getElementById("nf-mail").value = "";
  });
  setInterval(() => {
    [...tableBody.children].forEach((row, idx) => {
      const c = data[idx];
      const b = row.querySelector(".status-badge");
      const btn = row.querySelector(".action-btn");
      rules(c, btn, b);
    });
    counts();
    saveData(data);
  }, 3600000);
  document.getElementById("reset-data").addEventListener("click", () => {
    if (confirm("Réinitialiser les données locales ?")) {
      localStorage.removeItem(STORAGE_KEY);
      data = seed();
      build();
      counts();
    }
  });
});
