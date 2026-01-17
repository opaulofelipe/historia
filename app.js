let dados, civAtual, indice = 0;
const view = document.getElementById('view');

fetch('dados.json').then(r => r.json()).then(d => {
  dados = d;
  renderHome();
});

function progresso(civ) {
  return JSON.parse(localStorage.getItem('prog_' + civ)) || 0;
}

function salvarProgresso(civ, valor) {
  localStorage.setItem('prog_' + civ, JSON.stringify(valor));
}

function renderHome() {
  view.innerHTML = '';
  Object.keys(dados).forEach(civ => {
    const total = dados[civ].perguntas.length;
    const p = progresso(civ);
    const percent = Math.floor((p / total) * 100);

    view.innerHTML += `
      <div class="card" onclick="iniciar('${civ}')">
        <h2>${dados[civ].titulo}</h2>
        <div class="progress"><span style="width:${percent}%"></span></div>
        <small>${percent}% concluído</small>
      </div>`;
  });
}

function iniciar(civ) {
  civAtual = civ;
  indice = progresso(civ);
  renderPergunta();
}

function renderPergunta() {
  const q = dados[civAtual].perguntas[indice];
  if (!q) return finalizar();

  view.innerHTML = `
    <div class="card">
      <h3>${q.pergunta}</h3>
      <div class="answers">
        ${q.opcoes.map((o,i)=>`<button onclick="responder(${i})">${o}</button>`).join('')}
      </div>
    </div>`;
}

function responder(i) {
  const q = dados[civAtual].perguntas[indice];
  const btns = document.querySelectorAll('.answers button');

  if (i === q.correta) {
    btns[i].classList.add('correct');
    setTimeout(() => {
      indice++;
      salvarProgresso(civAtual, indice);
      renderPergunta();
    }, 600);
  } else {
    btns[i].classList.add('wrong');
    document.getElementById('popup').classList.remove('hidden');
  }
}

function finalizar() {
  salvarProgresso(civAtual, dados[civAtual].perguntas.length);
  confete();
  view.innerHTML = `<div class="card"><h2>🎉 Parabéns!</h2><p>Você concluiu ${dados[civAtual].titulo}</p></div>`;
}

function confete() {
  const c = document.getElementById('confetti');
  const ctx = c.getContext('2d');
  c.width = innerWidth; c.height = innerHeight;
  let p = Array.from({length:120},()=>({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*6}));
  let t = setInterval(()=>{
    ctx.clearRect(0,0,c.width,c.height);
    p.forEach(o=>{
      o.y+=2; ctx.fillRect(o.x,o.y,o.r,o.r);
    });
  },16);
  setTimeout(()=>clearInterval(t),3000);
}
