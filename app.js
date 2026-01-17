const view = document.getElementById("view");

let dados = {};
let civAtual = null;
let indice = 0;
let concluido = 0;

fetch("./dados.json")
  .then(r => r.json())
  .then(d => {
    dados = d;
    renderHome();
  });

function getProgresso(civ) {
  return Number(localStorage.getItem("prog_" + civ)) || 0;
}

function setProgresso(civ, valor) {
  localStorage.setItem("prog_" + civ, String(valor));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function calcPercent(done, total) {
  if (!total) return 0;
  return Math.floor((done / total) * 100);
}

/* ===== FUNDO HOME ===== */
function setHomeBackground(on) {
  document.body.classList.toggle("home-bg", on);
}

/* ===== HOME ===== */
function renderHome() {
  setHomeBackground(true);
  view.innerHTML = "";

  Object.keys(dados).forEach(civ => {
    const total = dados[civ].textos.length;
    const p = clamp(getProgresso(civ), 0, total);
    const percent = calcPercent(p, total);

    view.innerHTML += `
      <div class="card clickable" onclick="iniciar('${civ}')">
        <h2 style="margin:0 0 10px 0;">${dados[civ].titulo}</h2>
        <div class="progress"><span style="width:${percent}%"></span></div>
        <div class="muted" style="margin-top:8px;">
          ${percent}% concluído • ${p}/${total} textos
        </div>
      </div>
    `;
  });
}

/* ===== INICIAR ===== */
function iniciar(civ) {
  setHomeBackground(false);
  civAtual = civ;

  const total = dados[civAtual].textos.length;
  concluido = clamp(getProgresso(civAtual), 0, total);
  indice = clamp(concluido, 0, total);

  renderLeitura();
}

/* ===== LEITURA ===== */
function renderLeitura() {
  const total = dados[civAtual].textos.length;
  if (indice >= total) return finalizar();

  const percent = calcPercent(concluido, total);
  const texto = dados[civAtual].textos[indice];

  view.innerHTML = `
    <div class="card">
      <div class="read-sticky">
        <div class="read-header">
          <div class="civ-badge">${dados[civAtual].titulo}</div>
          <div class="text-counter">Texto ${indice + 1} de ${total}</div>
          <div class="percent-pill">${percent}%</div>
        </div>
        <div class="progress"><span style="width:${percent}%"></span></div>
      </div>

      <div class="text-body">${toParagraphs(texto)}</div>

      <div class="actions">
        <button class="btn btn-ghost" onclick="voltarHome()">Início</button>
        <button class="btn" onclick="anterior()" ${indice === 0 ? "disabled" : ""}>Anterior</button>
        <button class="btn btn-primary" onclick="proximo()">Próximo</button>
      </div>
    </div>
  `;
}

function proximo() {
  concluido = Math.max(concluido, indice + 1);
  setProgresso(civAtual, concluido);
  indice++;
  renderLeitura();
}

function anterior() {
  if (indice > 0) indice--;
  renderLeitura();
}

function voltarHome() {
  civAtual = null;
  indice = 0;
  concluido = 0;
  renderHome();
}

function finalizar() {
  setProgresso(civAtual, dados[civAtual].textos.length);
  view.innerHTML = `
    <div class="card">
      <h2>🎉 Parabéns!</h2>
      <button class="btn btn-primary" onclick="voltarHome()">Voltar</button>
    </div>
  `;
}

/* ===== TEXTO ===== */
function toParagraphs(texto) {
  return texto
    .split(/\n+/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${p}</p>`)
    .join("");
}

/* ===== EXPOSE ===== */
window.iniciar = iniciar;
window.proximo = proximo;
window.anterior = anterior;
window.voltarHome = voltarHome;