let mallaData = [];
let progreso = JSON.parse(localStorage.getItem("progreso")) || {};
let modoOscuro = JSON.parse(localStorage.getItem("modoOscuro")) || false;

async function cargarMalla() {
  const res = await fetch("malla.json");
  mallaData = await res.json();
  renderMalla();
  actualizarStats();
  if (modoOscuro) {
    document.body.classList.add("dark");
    document.getElementById("modo-oscuro").checked = true;
  }
}

function renderMalla() {
  const contenedor = document.getElementById("malla");
  contenedor.innerHTML = "";

  mallaData.forEach(grupo => {
    const divGrupo = document.createElement("div");
    divGrupo.className = "grupo";

    const titulo = document.createElement("h2");
    titulo.textContent = grupo.grupo;
    divGrupo.appendChild(titulo);

    grupo.ramos.forEach(ramo => {
      const card = document.createElement("div");
      card.className = "ramo bloqueado";
      card.dataset.sigla = ramo.sigla;
      card.dataset.creditos = ramo.creditos;

      // Nombre + créditos
      const nombre = document.createElement("h3");
      nombre.textContent = `${ramo.asignatura} (${ramo.creditos} CT)`;
      card.appendChild(nombre);

      // Categoría (pastilla de color)
      if (ramo.categoria) {
        const cat = document.createElement("span");
        cat.className = `categoria cat-${ramo.categoria.toLowerCase()}`;
        cat.textContent = ramo.categoria;
        card.appendChild(cat);
      }

      // Estado inicial
      if (progreso[ramo.sigla]) {
        card.classList.remove("bloqueado");
        card.classList.add("aprobado");
      } else if (esDisponible(ramo)) {
        card.classList.remove("bloqueado");
        card.classList.add("disponible");
      }

      // Click para aprobar/desaprobar
      card.addEventListener("click", () => toggleRamo(ramo.sigla));

      divGrupo.appendChild(card);
    });

    contenedor.appendChild(divGrupo);
  });
}

function esDisponible(ramo) {
  if (!ramo.requisitos || ramo.requisitos.length === 0) return true;
  return ramo.requisitos.every(req => progreso[req]);
}

function toggleRamo(sigla) {
  if (progreso[sigla]) {
    delete progreso[sigla];
  } else {
    progreso[sigla] = true;
  }
  localStorage.setItem("progreso", JSON.stringify(progreso));
  renderMalla();
  actualizarStats();
}

function actualizarStats() {
  let totalRamos = 0, aprobados = 0;
  let totalCreditos = 0, aprobCreditos = 0;

  mallaData.forEach(grupo => {
    grupo.ramos.forEach(ramo => {
      totalRamos++;
      totalCreditos += ramo.creditos || 0;
      if (progreso[ramo.sigla]) {
        aprobados++;
        aprobCreditos += ramo.creditos || 0;
      }
    });
  });

  document.getElementById("total-ramos").textContent = `Total ramos: ${totalRamos}`;
  document.getElementById("aprobados").textContent = `Aprobados: ${aprobados}`;
  document.getElementById("creditos").textContent = `Créditos: ${aprobCreditos}/${totalCreditos}`;
  document.getElementById("progreso").textContent = `Progreso: ${((aprobCreditos / totalCreditos) * 100).toFixed(1)}%`;

  const avance = document.getElementById("avance");
  avance.style.width = `${(aprobCreditos / totalCreditos) * 100}%`;
}

// Reiniciar progreso
document.getElementById("reiniciar").addEventListener("click", () => {
  if (confirm("¿Seguro que quieres reiniciar todo el progreso?")) {
    progreso = {};
    localStorage.removeItem("progreso");
    renderMalla();
    actualizarStats();
  }
});

// Toggle modo oscuro
document.getElementById("modo-oscuro").addEventListener("change", (e) => {
  modoOscuro = e.target.checked;
  document.body.classList.toggle("dark", modoOscuro);
  localStorage.setItem("modoOscuro", JSON.stringify(modoOscuro));
});

// Mostrar solo disponibles
document.getElementById("solo-disponibles").addEventListener("click", () => {
  document.querySelectorAll(".ramo").forEach(r => {
    if (!r.classList.contains("disponible") && !r.classList.contains("aprobado")) {
      r.style.display = r.style.display === "none" ? "block" : "none";
    }
  });
});

// Buscador
document.getElementById("buscador").addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase();
  document.querySelectorAll(".ramo").forEach(r => {
    const texto = r.querySelector("h3").textContent.toLowerCase();
    r.style.display = texto.includes(query) ? "block" : "none";
  });
});

cargarMalla();
