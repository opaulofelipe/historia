const view = document.getElementById("view");
const popup = document.getElementById("popup");
const btnVoltar = document.getElementById("btn-voltar");

let dados = {};
let civAtual = null;
let indice = 0;

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
  localStorage.setItem("prog_" + civ, valor);
}

function renderHome() {
  popup.classList.add("hidden");
  view.innerHTML = "";

  Object.keys(dados).forEach(civ => {
    const total = dados[civ].perguntas.length;
    const atual = getProgresso(civ);
    const percent = Math.floor((atual / total) * 100);

    view.innerHTML += `
      <div class="card" onclick="iniciar('${civ}')">
        <h2>${dados[civ].titulo}</h2>
        <div class="progress">
          <span style="width:${percent}%"></span>
        </div>
        <small>${percent}% concluído</small>
      </div>
    `;
  });
}

function iniciar(civ) {
  civAtual = civ;
  indice = getProgresso(civ);
  renderPergunta();
}

function renderPergunta() {
  const pergunta = dados[civAtual].perguntas[indice];
  if (!pergunta) {
    finalizar();
    return;
  }

  view.innerHTML = `
    <div class="card">
      <h3>${pergunta.pergunta}</h3>
      <div class="answers">
        ${pergunta.opcoes.map((o,i)=>
          `<button onclick="responder(${i})">${o}</button>`
        ).join("")}
      </div>
    </div>
  `;
}

function responder(i) {
  const pergunta = dados[civAtual].perguntas[indice];
  const botoes = document.querySelectorAll(".answers button");

  if (i === pergunta.correta) {
    botoes[i].classList.add("correct");
    setTimeout(() => {
      indice++;
      setProgresso(civAtual, indice);
      renderPergunta();
    }, 500);
  } else {
    botoes[i].classList.add("wrong");
    popup.classList.remove("hidden");
  }
}

btnVoltar.onclick = () => {
  popup.classList.add("hidden");
  renderHome();
};

function finalizar() {
  setProgresso(civAtual, dados[civAtual].perguntas.length);
  soltarConfete();

  view.innerHTML = `
    <div class="card">
      <h2>🎉 Parabéns!</h2>
      <p>Você concluiu ${dados[civAtual].titulo}</p>
    </div>
  `;
}

function soltarConfete() {
  const c = document.getElementById("confetti");
  const ctx = c.getContext("2d");
  c.width = innerWidth;
  c.height = innerHeight;

  let partes = Array.from({length: 100}, () => ({
    x: Math.random() * c.width,
    y: Math.random() * c.height,
    s: Math.random() * 6 + 2
  }));

  let t = setInterval(() => {
    ctx.clearRect(0,0,c.width,c.height);
    partes.forEach(p => {
      p.y += 2;
      ctx.fillRect(p.x, p.y, p.s, p.s);
    });
  }, 16);

  setTimeout(() => clearInterval(t), 3000);
}