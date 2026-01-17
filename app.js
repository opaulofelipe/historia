const view = document.getElementById("view");

let dados = {};
let civAtual = null;
let indice = 0;      // texto exibido
let concluido = 0;   // progresso real

fetch("./dados.json")
  .then(r => r.json())
  .then(d => {
    dados = d;
    renderHome();
  })
  .catch(() => {
    view.innerHTML = `
      <div class="card">
        <h2>Erro ao carregar</h2>
        <p class="muted">Não foi possível carregar o arquivo <b>dados.json</b>.</p>
      </div>
    `;
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
  return Math.floor((clamp(done, 0, total) / total) * 100);
}

/* ===== fundo da home ===== */
function setHomeBackground(isHome) {
  document.body.classList.toggle("home-bg", !!isHome);
}

/* ===== scroll topo ===== */
function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
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

        <div class="progress">
          <span style="width:${percent}%"></span>
        </div>

        <div class="muted" style="margin-top:8px;">
          ${percent}% concluído • ${p}/${total} textos
        </div>
      </div>
    `;
  });

  scrollToTop();
}

/* ===== INICIAR ===== */
function iniciar(civ) {
  setHomeBackground(false);

  civAtual = civ;
  const total = dados[civAtual].textos.length;

  concluido = clamp(getProgresso(civAtual), 0, total);
  indice = clamp(concluido, 0, total);

  renderLeitura();
  scrollToTop();
}

/* ===== LEITURA ===== */
function renderLeitura() {
  const total = dados[civAtual].textos.length;

  if (indice >= total) {
    finalizar();
    return;
  }

  const percent = calcPercent(concluido, total);
  const textoCru = dados[civAtual].textos[indice];

  view.innerHTML = `
    <div class="card">

      <div class="read-sticky">
        <div class="read-header">
          <div class="civ-badge">${escapeHtml(dados[civAtual].titulo)}</div>
          <div class="text-counter">Texto ${indice + 1} de ${total}</div>
          <div class="percent-pill">${percent}%</div>
        </div>

        <div class="progress">
          <span style="width:${percent}%"></span>
        </div>
      </div>

      <div class="text-body">
        ${toParagraphs(textoCru)}
      </div>

      <div class="actions">
        <button class="btn btn-ghost" onclick="voltarHome()">Início</button>
        <button class="btn" onclick="anterior()" ${indice === 0 ? "disabled" : ""}>Anterior</button>
        <button class="btn btn-primary" onclick="proximo()">Próximo</button>
      </div>

    </div>
  `;
}

/* ===== NAVEGAÇÃO ===== */
function proximo() {
  const total = dados[civAtual].textos.length;

  concluido = Math.max(concluido, indice + 1);
  setProgresso(civAtual, concluido);

  indice = clamp(indice + 1, 0, total);

  renderLeitura();
  scrollToTop();
}

function anterior() {
  if (indice <= 0) return;
  indice -= 1;

  renderLeitura();
  scrollToTop();
}

function voltarHome() {
  civAtual = null;
  indice = 0;
  concluido = 0;

  renderHome();
  scrollToTop();
}

/* ===== FINAL ===== */
function finalizar() {
  const total = dados[civAtual].textos.length;

  concluido = total;
  setProgresso(civAtual, total);

  soltarConfete();

  view.innerHTML = `
    <div class="card">
      <h2 style="margin:0;">🎉 Parabéns!</h2>
      <p class="muted" style="margin-top:6px;">
        Você concluiu <b>${escapeHtml(dados[civAtual].titulo)}</b>.
      </p>

      <div class="actions" style="grid-template-columns: 1fr 1fr; margin-top:16px;">
        <button class="btn btn-ghost" onclick="reiniciarCivilizacao()">Rever do início</button>
        <button class="btn btn-primary" onclick="voltarHome()">Voltar</button>
      </div>
    </div>
  `;

  scrollToTop();
}

function reiniciarCivilizacao() {
  setProgresso(civAtual, 0);
  concluido = 0;
  indice = 0;

  renderLeitura();
  scrollToTop();
}

/* ===== CONFETE ===== */
function soltarConfete() {
  const c = document.getElementById("confetti");
  const ctx = c.getContext("2d");

  c.width = innerWidth;
  c.height = innerHeight;

  const partes = Array.from({ length: 120 }, () => ({
    x: Math.random() * c.width,
    y: -20 - Math.random() * c.height * 0.3,
    s: 2 + Math.random() * 6,
    vx: -1 + Math.random() * 2,
    vy: 2 + Math.random() * 4,
    rot: Math.random() * Math.PI
  }));

  const inicio = Date.now();
  const duracao = 2800;

  function tick() {
    const t = Date.now() - inicio;
    ctx.clearRect(0, 0, c.width, c.height);

    partes.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += 0.08;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
      ctx.restore();
    });

    if (t < duracao) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, c.width, c.height);
  }

  tick();
}

/* ===== TEXTO -> PARÁGRAFOS ===== */
function toParagraphs(texto) {
  const safe = escapeHtml(String(texto));
  const partes = safe.split(/\n+/).map(p => p.trim()).filter(Boolean);
  return partes.map(p => `<p>${p}</p>`).join("");
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* expõe funções */
window.iniciar = iniciar;
window.proximo = proximo;
window.anterior = anterior;
window.voltarHome = voltarHome;
window.reiniciarCivilizacao = reiniciarCivilizacao;