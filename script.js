/* UniBudget ULIMA — script.js
   Prototipo completo sin librerías externas.
   Guarda datos en localStorage (key: unibudget_ulima_v3)
*/

const STORAGE_KEY = "unibudget_ulima_v3";

/* Default sample data (will load on first run) */
const SAMPLE = [
  { id: id(), date: today(-1), category: "Cafetería ULIMA", amount: 25.5, type: "gasto", note: "Almuerzo en cafetería" },
  { id: id(), date: today(-2), category: "Transporte", amount: 5.0, type: "gasto", note: "Pasaje bus" },
  { id: id(), date: today(-4), category: "Ingreso", amount: 500.0, type: "ingreso", note: "Mesada mensual" },
  { id: id(), date: today(-6), category: "Materiales / Libros", amount: 120.0, type: "gasto", note: "Libro de cálculo" },
  { id: id(), date: today(-10), category: "Entretenimiento", amount: 45.0, type: "gasto", note: "Cine con amigos" },
  { id: id(), date: today(-12), category: "Ingreso", amount: 300.0, type: "ingreso", note: "Trabajo freelance" },
];

let txs = [];
let filterMode = "all";

const el = {
  txsList: document.getElementById("txs"),
  totalIncome: document.getElementById("totalIncome"),
  totalExpense: document.getElementById("totalExpense"),
  bigBalance: document.getElementById("bigBalance"),
  search: document.getElementById("search"),
  modal: document.getElementById("modal"),
  txForm: document.getElementById("txForm"),
  btnNew: document.getElementById("btnNew"),
  btnCancel: document.getElementById("btnCancel"),
  chartWrapper: document.getElementById("chartWrapper"),
  segBtns: document.querySelectorAll(".seg-btn"),
  btnTheme: document.getElementById("btnTheme"),
  empezarBtn: document.getElementById("empezar")
};

document.addEventListener("DOMContentLoaded", () => {
  // Get handles (btnCancel may be null if not created yet)
  el.btnCancel = document.getElementById("btnCancel");

  load();
  renderAll();
  attachEvents();
});

function attachEvents() {
  el.btnNew.addEventListener("click", openModalForNew);
  if (el.btnCancel) el.btnCancel.addEventListener("click", closeModal);
  document.getElementById("txForm").addEventListener("submit", onSubmitForm);
  el.search.addEventListener("input", renderTxs);
  el.segBtns.forEach(b => b.addEventListener("click", onFilterClick));
  el.btnTheme.addEventListener("click", toggleTheme);
  if (el.empezarBtn) el.empezarBtn.addEventListener("click", () => {
    document.getElementById("funciones")?.scrollIntoView({ behavior: "smooth" });
  });
}

/* Storage */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      txs = JSON.parse(raw);
    } else {
      txs = SAMPLE.slice();
      save();
    }
  } catch (e) {
    console.error("Error reading storage", e);
    txs = SAMPLE.slice();
  }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(txs));
}

/* Render */
function renderAll() {
  renderTxs();
  renderSummary();
  renderChart();
}
function renderTxs() {
  const q = (el.search.value || "").toLowerCase().trim();
  el.txsList.innerHTML = "";

  const visible = txs.filter(t => {
    if (filterMode === "ingreso" && t.type !== "ingreso") return false;
    if (filterMode === "gasto" && t.type !== "gasto") return false;
    if (!q) return true;
    return (t.note || "").toLowerCase().includes(q) || (t.category || "").toLowerCase().includes(q);
  });

  if (visible.length === 0) {
    el.txsList.innerHTML = `<li class="tx-item"><div class="tx-left"><div class="tx-meta">No hay registros que mostrar</div></div></li>`;
    return;
  }

  visible.forEach(t => {
    const li = document.createElement("li");
    li.className = "tx-item";

    const left = document.createElement("div");
    left.className = "tx-left";

    const icon = document.createElement("div");
    icon.className = "icon-circle";
    icon.textContent = initialsForCategory(t.category);

    const meta = document.createElement("div");
    meta.innerHTML = `<div style="font-weight:700">${t.note || t.category}</div>
                      <div class="tx-meta">${t.category} • ${t.date}</div>`;

    left.appendChild(icon);
    left.appendChild(meta);

    const right = document.createElement("div");
    right.style.textAlign = "right";

    const amount = document.createElement("div");
    amount.className = "tx-amount " + (t.type === "ingreso" ? "income" : "expense");
    amount.textContent = (t.type === "gasto" ? "-S/ " : "+S/ ") + Number(t.amount).toFixed(2);

    const actions = document.createElement("div");
    actions.className = "tx-actions";
    const edit = createLink("Editar", () => openModalForEdit(t.id));
    const del = createLink("Eliminar", () => { if (confirm("Eliminar registro?")) { deleteTx(t.id); } }, true);
    actions.appendChild(edit);
    actions.appendChild(del);

    right.appendChild(amount);
    right.appendChild(actions);

    li.appendChild(left);
    li.appendChild(right);

    el.txsList.appendChild(li);
  });
}

function renderSummary() {
  const income = txs.filter(t => t.type === "ingreso").reduce((s, x) => s + Number(x.amount), 0);
  const expense = txs.filter(t => t.type === "gasto").reduce((s, x) => s + Number(x.amount), 0);
  el.totalIncome.textContent = `+S/ ${income.toFixed(2)}`;
  el.totalExpense.textContent = `-S/ ${expense.toFixed(2)}`;
  el.bigBalance.textContent = `S/ ${Math.round((income - expense) * 100) / 100 .toFixed(2)}`.replace("NaN","S/ 0.00");
}

/* Simple pie-like chart using SVG */
function renderChart() {
  const byCat = {};
  txs.forEach(t => {
    if (t.type !== "gasto") return;
    byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount);
  });
  const data = Object.keys(byCat).map(k => ({ cat: k, v: byCat[k] }));
  const total = data.reduce((s,d)=>s+d.v,0) || 1;

  const size = 160;
  const r = size/2;
  let cumulative = 0;
  const colors = ["#ff7a00","#ff9a42","#ffb77a","#ffd7b0","#ffdede","#cfe8ff","#9fd0ff","#b9f7e4"];

  let svg = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Gastos por categoría">`;
  svg += `<g transform="translate(${r},${r})">`;

  data.forEach((d,i)=>{
    const start = cumulative/total;
    cumulative += d.v;
    const end = cumulative/total;
    const [sx, sy] = polar(start, r-10);
    const [ex, ey] = polar(end, r-10);
    const large = end - start > 0.5 ? 1 : 0;
    const path = `M 0 0 L ${sx} ${sy} A ${r-10} ${r-10} 0 ${large} 1 ${ex} ${ey} Z`;
    svg += `<path d="${path}" fill="${colors[i % colors.length]}" stroke="#fff" stroke-width="1"></path>`;
  });

  svg += `</g></svg>`;

  if (data.length === 0) {
    svg = `<div style="text-align:center;color:#999;padding-top:40px">No hay gastos este mes</div>`;
  } else {
    // add legend
    svg += `<div style="font-size:12px;margin-top:6px">`;
    data.slice(0,6).forEach((d,i)=>{
      svg += `<div style="display:flex;gap:8px;align-items:center;margin:4px 0"><span style="width:12px;height:12px;background:${colors[i%colors.length]};display:inline-block"></span>${d.cat} — S/ ${d.v.toFixed(2)}</div>`;
    });
    svg += `</div>`;
  }

  el.chartWrapper.innerHTML = svg;
}

/* Helpers */
function polar(t, r) {
  const ang = 2*Math.PI*(t-0.25);
  return [r*Math.cos(ang), r*Math.sin(ang)];
}
function id(){ return Math.random().toString(36).slice(2,9) }
function today(offsetDays=0){
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0,10);
}
function initialsForCategory(cat){
  if(!cat) return "•";
  return cat.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
}
function createLink(text, fn, danger=false){
  const a = document.createElement("button");
  a.className = "btn btn-ghost";
  a.style.padding = "6px 8px";
  a.style.fontSize = "0.85rem";
  a.textContent = text;
  if(danger) a.style.color = "var(--danger)";
  a.onclick = fn;
  return a;
}

/* CRUD */
function openModalForNew(){
  openModal();
  fillForm({});
}
function openModalForEdit(id){
  const t = txs.find(x=>x.id===id);
  if(!t) return;
  openModal();
  fillForm(t);
  document.getElementById("modalTitle").textContent = "Editar transacción";
}
function openModal(){
  document.getElementById("modal").classList.remove("hidden");
  document.getElementById("modal").setAttribute("aria-hidden","false");
}
function closeModal(){
  document.getElementById("modal").classList.add("hidden");
  document.getElementById("modal").setAttribute("aria-hidden","true");
  document.getElementById("modalTitle").textContent = "Agregar transacción";
}
function fillForm(t){
  document.getElementById("date").value = t.date || today(0);
  document.getElementById("category").value = t.category || "Cafetería ULIMA";
  document.getElementById("type").value = t.type || "gasto";
  document.getElementById("amount").value = t.amount || "";
  document.getElementById("note").value = t.note || "";
  // attach id to form for edit
  document.getElementById("txForm").dataset.editId = t.id || "";
}

function onSubmitForm(e){
  e.preventDefault();
  const data = {
    id: document.getElementById("txForm").dataset.editId || id(),
    date: document.getElementById("date").value,
    category: document.getElementById("category").value,
    type: document.getElementById("type").value,
    amount: Number(document.getElementById("amount").value),
    note: document.getElementById("note").value
  };
  if(!data.amount || !data.date) { alert("Fecha y monto obligatorios"); return; }

  const existingIndex = txs.findIndex(x=>x.id===data.id);
  if(existingIndex >= 0){
    txs[existingIndex] = data;
  } else {
    txs.unshift(data);
  }
  save();
  closeModal();
  renderAll();
}

function deleteTx(id){
  txs = txs.filter(x=>x.id!==id);
  save();
  renderAll();
}

/* Filters */
function onFilterClick(e){
  el.segBtns.forEach(b=>b.classList.remove("active"));
  const b = e.currentTarget;
  b.classList.add("active");
  filterMode = b.dataset.filter;
  renderTxs();
}

/* Theme toggle (simple invert) */
function toggleTheme(){
  const root = document.documentElement;
  if(root.style.getPropertyValue("--bg")==="#111827"){
    root.style.removeProperty("--bg");
    root.style.removeProperty("--card");
    root.style.removeProperty("--text");
  } else {
    root.style.setProperty("--bg", "#111827");
    root.style.setProperty("--card", "#0b1220");
    root.style.setProperty("--text", "#e6eef8");
  }
}

/* keyboard: ESC to close modal */
document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") closeModal(); });

