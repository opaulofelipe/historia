const view = document.getElementById("view");
const appContainer = document.getElementById("app");

let dados = {};
let civAtual = null;

let idx = 0;               // pergunta atual (0-based)
let locked = false;        // trava após acerto
let currentShuffle = null; // { options: [...], correctIndex: n }

/* ========= SOM (plim) SEM ARQUIVO ========= */
let audioCtx = null;

function playCorrectSound() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();

    const t0 = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // timbre "plim"
    osc.type = "triangle";

    // envelope curto (ataque + decay)
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);

    // leve "subida" de pitch
    osc.frequency.setValueAtTime(880, t0);
    osc.frequency.exponentialRampToValueAtTime(1320, t0 + 0.09);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(t0);
    osc.stop(t0 + 0.20);
  } catch (_) {
    // não quebra o app se o áudio falhar
  }
}

/* ========= CARREGAMENTO ========= */
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

/* ========= HELPERS ========= */
function setHomeMode(on) {
  document.body.classList.toggle("home-bg", !!on);
  document.body.classList.toggle("home-lock", !!on);
}

function scrollToTop() {
  if (!appContainer) return;
  appContainer.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ========= PROGRESSO POR CIVILIZAÇÃO ========= */
function keyProg(civ) {
  return "quiz_prog_" + civ;
}

function getProg(civ) {
  return Number(localStorage.getItem(keyProg(civ))) || 0;
}

function setProg(civ, val) {
  localStorage.setItem(keyProg(civ), String(val));
}

function percent(done, total) {
  if (!total) return 0;
  return Math.floor((clamp(done, 0, total) / total) * 100);
}

/* ========= HOME ========= */
function renderHome() {
  setHomeMode(true);
  view.innerHTML = "";

  const civs = Object.keys(dados || {});
  if (!civs.length) {
    view.innerHTML = `
      <div class="card">
        <h2>Nenhuma civilização encontrada</h2>
        <p class="muted">Verifique se o <b>dados.json</b> contém pelo menos uma civilização.</p>
      </div>
    `;
    scrollToTop();
    return;
  }

  civs.forEach(civ => {
    const total = (dados[civ]?.perguntas || []).length;
    const p = clamp(getProg(civ), 0, total);
    const pct = percent(p, total);

    view.innerHTML += `
      <div class="card clickable" onclick="iniciar('${civ}')">
        <h2 style="margin:0 0 10px 0;">${escapeHtml(dados[civ].titulo || civ)}</h2>
        <div class="progress"><span style="width:${pct}%"></span></div>
        <div class="muted" style="margin-top:8px;">
          ${pct}% concluído • ${p}/${total} perguntas
        </div>
      </div>
    `;
  });

  scrollToTop();
}

/* ========= QUIZ ========= */
function iniciar(civ) {
  setHomeMode(false);
  civAtual = civ;

  const total = (dados[civAtual]?.perguntas || []).length;
  idx = clamp(getProg(civAtual), 0, total);

  locked = false;
  currentShuffle = null;

  renderQuiz();
  scrollToTop();
}

function renderQuiz() {
  const perguntas = dados[civAtual]?.perguntas || [];
  const total = perguntas.length;

  if (!total) {
    view.innerHTML = `
      <div class="card">
        <h2>Sem perguntas</h2>
        <p class="muted">Esta civilização ainda não tem perguntas no <b>dados.json</b>.</p>
        <div class="actions">
          <button class="btn btn-primary" onclick="voltarHome()">Voltar</button>
        </div>
      </div>
    `;
    scrollToTop();
    return;
  }

  if (idx >= total) {
    finalizar();
    return;
  }

  // progresso salvo = mais longe que já chegou
  const progSalvo = clamp(getProg(civAtual), 0, total);
  const pct = percent(progSalvo, total);

  const q = perguntas[idx];

  // embaralha opções a cada render
  currentShuffle = shuffleQuestion(q);

  view.innerHTML = `
    <div class="card">

      <div class="read-sticky">
        <div class="read-header">
          <div class="civ-badge">${escapeHtml(dados[civAtual].titulo || civAtual)}</div>
          <div class="text-counter">Pergunta ${idx + 1} de ${total}</div>
          <div class="percent-pill">${pct}%</div>
        </div>
        <div class="progress"><span style="width:${pct}%"></span></div>
      </div>

      <p class="question">${escapeHtml(q.pergunta || "")}</p>

      <div class="options">
        ${currentShuffle.options
          .map(
            (opt, i) => `
          <button class="opt" data-i="${i}" onclick="responder(${i})">${escapeHtml(opt)}</button>
        `
          )
          .join("")}
      </div>

      <div class="actions" style="grid-template-columns: 1fr 1fr 1fr;">
        <button class="btn btn-ghost" onclick="voltarHome()">Início</button>
        <button class="btn" onclick="anteriorPergunta()" ${idx === 0 ? "disabled" : ""}>Anterior</button>
        <button class="btn btn-primary" onclick="reiniciarCivilizacao()">Reiniciar</button>
      </div>

    </div>
  `;

  locked = false;
}

function responder(i) {
  if (locked) return;

  const buttons = Array.from(view.querySelectorAll(".opt"));
  const btn = buttons.find(b => Number(b.dataset.i) === i);
  if (!btn) return;

  const isCorrect = i === currentShuffle.correctIndex;

  if (isCorrect) {
    locked = true;

    // efeito de acerto
    btn.classList.remove("wrong");
    btn.classList.add("correct");

    // reinicia e aplica a animação de borda (border-run)
    btn.classList.remove("border-run");
    void btn.offsetWidth; // reflow para reiniciar animação
    btn.classList.add("border-run");

    // som de acerto
    playCorrectSound();

    // trava opções
    buttons.forEach(b => (b.disabled = true));

    const total = (dados[civAtual]?.perguntas || []).length;
    const nextIdx = clamp(idx + 1, 0, total);

    // progresso salvo = máximo atingido (não diminui ao voltar)
    const progAtual = clamp(getProg(civAtual), 0, total);
    setProg(civAtual, Math.max(progAtual, nextIdx));

    setTimeout(() => {
      idx = nextIdx;
      renderQuiz();
      scrollToTop();
    }, 620);
  } else {
    // errado: pisca vermelho e permite tentar novamente
    btn.classList.remove("wrong");
    void btn.offsetWidth; // reinicia animação de erro
    btn.classList.add("wrong");

    setTimeout(() => {
      btn.classList.remove("wrong");
    }, 560);
  }
}

/* ========= VOLTAR PERGUNTA ========= */
function anteriorPergunta() {
  if (locked) return;
  if (idx <= 0) return;

  idx -= 1;
  currentShuffle = null;

  renderQuiz();
  scrollToTop();
}

/* ========= AÇÕES ========= */
function reiniciarCivilizacao() {
  if (!civAtual) return;

  setProg(civAtual, 0);
  idx = 0;
  locked = false;
  currentShuffle = null;

  renderQuiz();
  scrollToTop();
}

function voltarHome() {
  civAtual = null;
  idx = 0;
  locked = false;
  currentShuffle = null;

  renderHome();
  scrollToTop();
}

/* ========= FINAL ========= */
function finalizar() {
  soltarConfete();

  view.innerHTML = `
    <div class="card">
      <h2 style="margin:0;">🎉 Parabéns!</h2>
      <p class="muted" style="margin-top:6px;">
        Você concluiu <b>${escapeHtml(dados[civAtual].titulo || civAtual)}</b>.
      </p>

      <div class="actions">
        <button class="btn btn-ghost" onclick="reiniciarCivilizacao()">Rever</button>
        <button class="btn btn-primary" onclick="voltarHome()">Voltar</button>
      </div>
    </div>
  `;

  scrollToTop();
}

/* ========= EMBARALHAMENTO ========= */
function shuffleQuestion(q) {
  const opcs = Array.isArray(q.opcoes) ? q.opcoes : ["", "", "", ""];
  const correta = Number.isInteger(q.correta) ? q.correta : 0;

  const arr = opcs.map((text, originalIndex) => ({ text, originalIndex }));

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  const options = arr.map(x => x.text);
  const correctIndex = arr.findIndex(x => x.originalIndex === correta);

  return { options, correctIndex };
}

/* ========= CONFETE ========= */
function soltarConfete() {
  const c = document.getElementById("confetti");
  if (!c) return;

  const ctx = c.getContext("2d");
  c.width = window.innerWidth;
  c.height = window.innerHeight;

  const partes = Array.from({ length: 140 }, () => ({
    x: Math.random() * c.width,
    y: -20 - Math.random() * c.height * 0.3,
    s: 2 + Math.random() * 6,
    vx: -1 + Math.random() * 2,
    vy: 2 + Math.random() * 4,
    rot: Math.random() * Math.PI,
    hue: Math.floor(Math.random() * 360)
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
      ctx.fillStyle = `hsl(${p.hue} 80% 60%)`;
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
      ctx.restore();
    });

    if (t < duracao) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, c.width, c.height);
  }

  tick();
}

/* ========= EXPOSE (onclick inline) ========= */
window.iniciar = iniciar;
window.responder = responder;
window.anteriorPergunta = anteriorPergunta;
window.reiniciarCivilizacao = reiniciarCivilizacao;
window.voltarHome = voltarHome;
