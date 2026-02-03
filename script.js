(() => {
  const stage = document.getElementById("stage");
  const yesBtn = document.getElementById("yesBtn");
  const noBtn = document.getElementById("noBtn");
  const result = document.getElementById("result");

  // Prøv å begrense zoom på PC (ikke 100 prosent mulig å låse i alle nettlesere)
  // Men dette stopper typiske snarveier.
  window.addEventListener("wheel", (e) => {
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    const isZoomKey = (e.ctrlKey || e.metaKey) && (key === "+" || key === "-" || key === "=" || key === "0");
    if (isZoomKey) e.preventDefault();
  });

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // Sett "Nei" som absolutt posisjonert inni scenen
  // Vi plasserer begge knappene fint i starten, så tar vi kontroll på Nei etter layout
  const placeNoAsFloating = () => {
    const stageRect = stage.getBoundingClientRect();
    const noRect = noBtn.getBoundingClientRect();

    // Finn nåværende posisjon relativt til stage
    const left = noRect.left - stageRect.left;
    const top = noRect.top - stageRect.top;

    noBtn.style.position = "absolute";
    noBtn.style.left = `${left}px`;
    noBtn.style.top = `${top}px`;
  };

  const randomWithinStage = () => {
    const stageRect = stage.getBoundingClientRect();
    const noRect = noBtn.getBoundingClientRect();

    const pad = 12;
    const maxX = stageRect.width - noRect.width - pad;
    const maxY = stageRect.height - noRect.height - pad;

    const x = Math.random() * (maxX - pad) + pad;
    const y = Math.random() * (maxY - pad) + pad;

    return { x, y };
  };

  const moveNoAway = (pointerX, pointerY) => {
    const stageRect = stage.getBoundingClientRect();
    const noRect = noBtn.getBoundingClientRect();

    const noCenterX = noRect.left + noRect.width / 2;
    const noCenterY = noRect.top + noRect.height / 2;

    const dx = noCenterX - pointerX;
    const dy = noCenterY - pointerY;

    // Normaliser retning
    const len = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / len;
    const uy = dy / len;

    // Flytt et stykke i motsatt retning, med litt kaos for å gjøre det morsommere
    const baseJump = 130;
    const chaos = 60;

    const currentLeft = parseFloat(noBtn.style.left || "0");
    const currentTop = parseFloat(noBtn.style.top || "0");

    let nextLeft = currentLeft + ux * baseJump + (Math.random() * chaos - chaos / 2);
    let nextTop = currentTop + uy * baseJump + (Math.random() * chaos - chaos / 2);

    // Hold inne i stage
    const pad = 10;
    const maxLeft = stageRect.width - noRect.width - pad;
    const maxTop = stageRect.height - noRect.height - pad;

    nextLeft = clamp(nextLeft, pad, maxLeft);
    nextTop = clamp(nextTop, pad, maxTop);

    // Hvis den sitter fast i et hjørne, gi den et tilfeldig hopp
    const stuck = (Math.abs(nextLeft - currentLeft) < 2 && Math.abs(nextTop - currentTop) < 2);
    if (stuck) {
      const r = randomWithinStage();
      nextLeft = r.x;
      nextTop = r.y;
    }

    noBtn.classList.remove("isSpooked");
    void noBtn.offsetWidth;
    noBtn.classList.add("isSpooked");

    noBtn.style.left = `${nextLeft}px`;
    noBtn.style.top = `${nextTop}px`;

    spawnHearts(noBtn, 7);
    setNoMessage();
  };

  const noLines = [
    "Nei prøver å rømme. Mistenkelig.",
    "Nei har fått panikk og løper videre.",
    "Nei sa: ikke i dag. Og stakk.",
    "Nei er sjenert. Veldig sjenert.",
    "Nei ble plutselig opptatt. Veldig opptatt.",
    "Nei valgte teleportering."
  ];
  let noIndex = 0;

  const setNoMessage = () => {
    noIndex = (noIndex + 1) % noLines.length;
    result.textContent = noLines[noIndex];
  };

  const spawnHearts = (anchorEl, count) => {
    const stageRect = stage.getBoundingClientRect();
    const rect = anchorEl.getBoundingClientRect();

    for (let i = 0; i < count; i++) {
      const h = document.createElement("div");
      h.className = "heart";
      h.style.color = Math.random() > 0.4 ? "#ff2f68" : "#ff7aa0";

      const x = rect.left - stageRect.left + rect.width / 2 + (Math.random() * 30 - 15);
      const y = rect.top - stageRect.top + rect.height / 2 + (Math.random() * 24 - 12);

      h.style.left = `${x}px`;
      h.style.top = `${y}px`;

      const driftX = (Math.random() * 120 - 60);
      const driftY = -(90 + Math.random() * 80);
      const rot = (Math.random() * 140 - 70);
      const scale = 0.85 + Math.random() * 0.6;

      h.animate([
        { transform: `translate(0px, 0px) rotate(45deg) scale(${scale})`, opacity: 0.95 },
        { transform: `translate(${driftX}px, ${driftY}px) rotate(${45 + rot}deg) scale(${scale * 1.08})`, opacity: 0 }
      ], {
        duration: 900 + Math.random() * 500,
        easing: "cubic-bezier(.2,.8,.2,1)",
        fill: "forwards"
      });

      stage.appendChild(h);
      setTimeout(() => h.remove(), 1600);
    }
  };

  const celebrateYes = () => {
    result.innerHTML = `
      <strong>Yesss.</strong> Da er det en avtale.
      <br/>Jeg gleder meg til å gjøre dagen vår ekstra koselig.
    `;
    spawnHearts(yesBtn, 18);
    stage.classList.add("locked");
    noBtn.style.pointerEvents = "none";
  };

  // Flykt logikk, både mus og touch
  const proximityCheck = (clientX, clientY) => {
    const noRect = noBtn.getBoundingClientRect();
    const cx = noRect.left + noRect.width / 2;
    const cy = noRect.top + noRect.height / 2;

    const dist = Math.hypot(cx - clientX, cy - clientY);

    // Trigger før man rekker å klikke
    const threshold = 140;
    if (dist < threshold) moveNoAway(clientX, clientY);
  };

  // Init
  const init = () => {
    // Sett standard tekst
    result.textContent = "Velg med hjertet ditt.";

    // Vent et tick for layout, så gjør Nei flytende
    requestAnimationFrame(() => {
      placeNoAsFloating();

      // Gi Nei en liten tilfeldig start så den føles levende
      const r = randomWithinStage();
      noBtn.style.left = `${r.x}px`;
      noBtn.style.top = `${r.y}px`;
    });
  };

  // Events
  yesBtn.addEventListener("click", celebrateYes);

  noBtn.addEventListener("mouseenter", (e) => {
    const x = e.clientX ?? (window.innerWidth / 2);
    const y = e.clientY ?? (window.innerHeight / 2);
    moveNoAway(x, y);
  });

  stage.addEventListener("mousemove", (e) => proximityCheck(e.clientX, e.clientY));

  stage.addEventListener("touchstart", (e) => {
    if (!e.touches || e.touches.length === 0) return;
    const t = e.touches[0];
    proximityCheck(t.clientX, t.clientY);
  }, { passive: true });

  stage.addEventListener("touchmove", (e) => {
    if (!e.touches || e.touches.length === 0) return;
    const t = e.touches[0];
    proximityCheck(t.clientX, t.clientY);
  }, { passive: true });

  // Hvis vinduet endrer størrelse, behold Nei inni scenen
  window.addEventListener("resize", () => {
    const r = randomWithinStage();
    noBtn.style.left = `${r.x}px`;
    noBtn.style.top = `${r.y}px`;
  });

  init();
})();
