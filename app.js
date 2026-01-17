const container = document.getElementById("civilizations-container");

// Função para carregar JSON e criar cards
async function loadCivilizations() {
  const response = await fetch("dados.json");
  const data = await response.json();

  data.civilizations.forEach(civ => {
    const card = document.createElement("div");
    card.className = "civilization-card";

    card.innerHTML = `
      <h2>${civ.name}</h2>
      <div class="progress-bar-container">
        <div class="progress-bar" id="progress-${civ.id}"></div>
      </div>
      <p>${civ.pages[0].text.slice(0,200)}...</p>
    `;

    card.addEventListener("click", () => {
      localStorage.setItem(`current_${civ.id}`, 0);
      alert(`Abrir lições de ${civ.name}`);
    });

    container.appendChild(card);

    // Carregar progresso do usuário
    const progress = localStorage.getItem(`progress_${civ.id}`) || 0;
    document.getElementById(`progress-${civ.id}`).style.width = `${progress}%`;
  });
}

// Registrar Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js")
      .then(reg => console.log("Service Worker registrado:", reg))
      .catch(err => console.error("Erro SW:", err));
  });
}

loadCivilizations();
