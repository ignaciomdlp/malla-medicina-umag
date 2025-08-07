let ramos = [];
let aprobados = new Set();

async function cargarMalla() {
  const res = await fetch('malla.json');
  ramos = await res.json();
  renderizarMalla();
  actualizarProgreso();
}

function renderizarMalla() {
  const contenedor = document.getElementById("malla");
  contenedor.innerHTML = "";

  ramos.forEach(ramo => {
    const div = document.createElement("div");
    div.classList.add("ramo");

    if (aprobados.has(ramo.asignatura)) {
      div.classList.add("aprobado");
    } else if (estaDisponible(ramo)) {
      div.classList.add("disponible");
    } else {
      div.classList.add("bloqueado");
    }

    div.innerText = ramo.asignatura;

    div.addEventListener("click", () => {
      if (!estaDisponible(ramo) && !aprobados.has(ramo.asignatura)) return;

      if (aprobados.has(ramo.asignatura)) {
        aprobados.delete(ramo.asignatura);
      } else {
        aprobados.add(ramo.asignatura);
      }

      renderizarMalla();
      actualizarProgreso();
    });

    contenedor.appendChild(div);
  });
}

function estaDisponible(ramo) {
  return ramo.requisitos.every(req => aprobados.has(req));
}

function actualizarProgreso() {
  const total = ramos.length;
  const completados = aprobados.size;
  const porcentaje = Math.round((completados / total) * 100);

  const barra = document.getElementById("barra-avance");
  barra.style.width = `${porcentaje}%`;

  const texto = document.getElementById("porcentaje");
  texto.innerText = `${porcentaje}%`;
}

document.addEventListener("DOMContentLoaded", cargarMalla);
