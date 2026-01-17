const view = document.getElementById("view");

let dados = {};
let civAtual = null;

// indice = qual texto está sendo exibido agora
let indice = 0;

// concluido = quantos textos já foram concluídos (progresso real salvo)
let concluido = 0;

fetch("./dados.json")
  .then(r => r.json())
  .then(d => {
    dados = d;
    renderHome();
  })
  .catch(() => {
    view.innerHTML = `
      <div class="card">
        <h2>Não foi possível carregar os dados 😕</h2>
        <p class="muted">Verifique se o arquivo <b>dados.json</b> está na raiz do repositório.</p>
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

function renderHome() {
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

function iniciar(civ) {
  civAtual = civ;
  const total = dados[civAtual].textos.length;

  concluido = clamp(getProgresso(civAtual), 0, total);

  // ao abrir, mostra o "próximo não concluído"
  indice = clamp(concluido, 0, total);

  renderLeitura();
}

function renderLeitura() {
  const total = dados[civAtual].textos.length;

  // Se já concluiu tudo
  if (indice >= total) {
    finalizar();
    return;
  }

  const percent = calcPercent(concluido, total);
  const textoCru = dados[civAtual].textos[indice];

  view.innerHTML = `
    <div class="card">
      <div class="read-top">
        <h2 class="read-title">${dados[civAtual].titulo}</h2>

        <div class="pill-row">
          <div class="pill">Texto ${indice + 1} de ${total}</div>
          <div class="pill">${percent}%</div>
        </div>
      </div>

      <div class="progress"><span style="width:${percent}%"></span></div>

      <div style="height:14px;"></div>

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

function proximo() {
  const total = dados[civAtual].textos.length;

  // Marca o texto atual como concluído ao avançar (progresso nunca “anda pra trás”)
  concluido = Math.max(concluido, indice + 1);
  setProgresso(civAtual, concluido);

  indice = clamp(indice + 1, 0, total);

  // micro transição suave
  view.style.opacity = "0.65";
  setTimeout(() => {
    view.style.opacity = "1";
    renderLeitura();
  }, 120);
}

function anterior() {
  if (indice <= 0) return;
  indice = indice - 1;

  view.style.opacity = "0.75";
  setTimeout(() => {
    view.style.opacity = "1";
    renderLeitura();
  }, 90);
}

function voltarHome() {
  civAtual = null;
  indice = 0;
  concluido = 0;
  renderHome();
}

function finalizar() {
  const total = dados[civAtual].textos.length;
  concluido = total;
  setProgresso(civAtual, total);

  soltarConfete();

  view.innerHTML = `
    <div class="card">
      <h2 style="margin:0;">🎉 Parabéns!</h2>
      <p class="muted" style="margin-top:6px;">
        Você concluiu <b>${dados[civAtual].titulo}</b>.
      </p>

      <div class="actions" style="grid-template-columns: 1fr 1fr; margin-top:16px;">
        <button class="btn btn-ghost" onclick="reiniciarCivilizacao()">Rever do início</button>
        <button class="btn btn-primary" onclick="voltarHome()">Voltar</button>
      </div>
    </div>
  `;
}

function reiniciarCivilizacao() {
  setProgresso(civAtual, 0);
  concluido = 0;
  indice = 0;
  renderLeitura();
}

/* Confete leve */
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

  const start = Date.now();
  const dur = 2800;

  const tick = () => {
    const t = Date.now() - start;
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

    if (t < dur) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, c.width, c.height);
  };

  tick();
}

/* Converte texto com \\n em parágrafos com margem de 8px e texto justificado */
function toParagraphs(texto) {
  const safe = escapeHtml(String(texto));
  const parts = safe.split(/\n+/).map(p => p.trim()).filter(Boolean);
  return parts.map(p => `<p>${p}</p>`).join("");
}

/* Segurança básica */
function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* expõe funções usadas no onclick inline */
window.iniciar = iniciar;
window.voltarHome = voltarHome;
window.proximo = proximo;
window.anterior = anterior;
window.reiniciarCivilizacao = reiniciarCivilizacao;