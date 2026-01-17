// Inicial
const container = document.getElementById("container");

async function loadCivilizations() {
  const res = await fetch("dados.json");
  const data = await res.json();

  data.civilizations.forEach(civ => {
    const card = document.createElement("div");
    card.className = "card";

    const progress = localStorage.getItem(`progress_${civ.id}`) || 0;

    card.innerHTML = `
      <h2>${civ.name}</h2>
      <div class="progress-container">
        <div class="progress-bar" id="progress-${civ.id}" style="width:${progress}%"></div>
      </div>
      <p>${civ.pages[0].text.slice(0,200)}...</p>
    `;

    card.addEventListener("click", () => openLesson(civ.id, 0));

    container.appendChild(card);
  });
}

// Abrir lição
async function openLesson(civId, lessonIndex) {
  const res = await fetch("dados.json");
  const data = await res.json();
  const civ = data.civilizations.find(c => c.id === civId);
  const lesson = civ.pages[lessonIndex];

  container.innerHTML = `
    <div class="lesson-page">
      <h2>${civ.name} - Lição ${lessonIndex+1}: ${lesson.title}</h2>
      <p>${lesson.text}</p>
      <button id="nextBtn">${lessonIndex+1 < civ.pages.length ? "Próxima Lição" : "Concluir"}</button>
      <button id="backBtn" style="margin-left:10px;">Voltar</button>
    </div>
  `;

  // Botão próxima lição
  document.getElementById("nextBtn").addEventListener("click", () => {
    const nextIndex = lessonIndex + 1;
    const progressPercent = Math.round((nextIndex / civ.pages.length) * 100);
    localStorage.setItem(`progress_${civ.id}`, progressPercent);

    if(nextIndex < civ.pages.length) {
      openLesson(civId, nextIndex);
    } else {
      loadCivilizations();
    }
  });

  // Botão voltar
  document.getElementById("backBtn").addEventListener("click", loadCivilizations);
}

// Registrar Service Worker
if("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js")
      .then(reg => console.log("SW registrado:", reg))
      .catch(err => console.log("Erro SW:", err));
  });
}

loadCivilizations();
