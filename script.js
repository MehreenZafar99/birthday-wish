/* =========================================================
   Birthday Wish — Vanilla JS
   Edit CONFIG below to personalize, or use ?name=Sara
   ========================================================= */

const CONFIG = {
  name: "Tuba",
  age: 18,
  sender: "Someone who loves you",
  message:
    "Happy birthday, Tuba! Today the whole sky is cheering for you. May your year be soft, bright, and full of tiny miracles — just like you. Thank you for being you. Blow out the candles, make a wish, and know I'm rooting for every one of them.",
};

/* ---------- Resolve name from URL ---------- */
(function applyUrlName() {
  const params = new URLSearchParams(window.location.search);
  const n = params.get("name");
  if (n && n.trim()) CONFIG.name = n.trim();
})();

/* ---------- State ---------- */
const state = {
  soundOn: true,
  balloonsPopped: 0,
  candlesLit: true,
  blowing: false,
  nameClicks: 0,
  letterOpened: false,
  quoteIndex: 0,
  flipped: false,
  reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  partyTimer: null,
  carouselTimer: null,
  micStream: null,
  micAnalyser: null,
  micRaf: null,
};

/* ---------- Quotes (front tip + back wish) ---------- */
const QUOTES = [
  { emoji: "🎂", front: "Another trip around the sun!", back: "May this orbit bring you extra sparkle and soft landings." },
  { emoji: "🌸", front: "Bloom like it's your birthday…", back: "…because it is. You're allowed to take up the whole garden." },
  { emoji: "✨", front: "Wishes love company.", back: "Whisper one into the cake — I'll cheer from the sidelines." },
  { emoji: "🎈", front: "Life is better with balloons.", back: "And days are better with you in them. Pop one for luck!" },
  { emoji: "🧸", front: "Soft hugs inbound.", back: "May your year feel like the coziest blanket and the warmest cocoa." },
  { emoji: "🌈", front: "After every storm…", back: "…a rainbow with your name on it. Happy birthday, bright one." },
  { emoji: "🧁", front: "Sugar, spice, and you.", back: "You're the sweetest part of every celebration. Keep shining." },
  { emoji: "💌", front: "A pocket-sized wish:", back: "May kindness find you quickly and joy stay for dessert." },
  { emoji: "🌟", front: "You're a whole constellation.", back: "Don't dim for anyone — the sky looks better with you glowing." },
  { emoji: "🥳", front: "Party mode: activated.", back: "Dance like confetti is listening. (It is.)" },
  { emoji: "🍀", front: "Lucky stars called.", back: "They said today's your day — and every day after, a little bit." },
  { emoji: "🎀", front: "Tied with a bow,", back: "here's a year wrapped in laughter, courage, and tiny adventures." },
  { emoji: "🌙", front: "Sleep well, dream big.", back: "Wake up knowing the universe saved the best chapters for you." },
  { emoji: "💖", front: "Love note from me:", back: "You make ordinary Tuesdays feel like birthdays. Thank you." },
];

const JAR_NOTES = [
  "You are someone's favorite hello 💕",
  "May your coffee stay hot and your Wi‑Fi strong.",
  "Plot twist: this year is on your side.",
  "Collect sunshine. Share leftovers.",
  "You deserve cake for breakfast. Permission granted.",
  "Be soft. Be brave. Be delightfully you.",
  "A secret: the balloons are cheering your name.",
  "May every unread message be good news.",
  "Hug incoming (virtual, but mighty).",
  "Your smile has main-character energy.",
];

const POP_WORDS = ["Yay!", "Woohoo!", "Love you!", "Pop!", "Cute!", "Yes!", "Aww!", "Hooray!"];
const BALLOON_COLORS = ["#ff9ec8", "#c9a0dc", "#7ec8e3", "#b8f2c0", "#ffd6a5", "#ffb3c9", "#a8d4f0"];

/* =========================================================
   Web Audio — pop sounds + simple happy tune
   ========================================================= */
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playPop() {
  if (!state.soundOn) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(520, t);
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.12);
  gain.gain.setValueAtTime(0.18, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.15);
}

function playChime() {
  if (!state.soundOn) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  });
}

function playFireworkBoop() {
  if (!state.soundOn) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.32);
}

/* =========================================================
   Canvas — confetti & fireworks (capped particles)
   ========================================================= */
const canvas = document.getElementById("fx-canvas");
const ctx2d = canvas.getContext("2d");
const MAX_PARTICLES = 280;
let particles = [];
let rockets = [];
let fxRaf = null;

function resizeCanvas() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  ctx2d.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function addParticle(p) {
  if (particles.length >= MAX_PARTICLES) particles.shift();
  particles.push(p);
}

function burstConfetti(x, y, count = 40, big = false) {
  if (state.reducedMotion) count = Math.min(count, 12);
  const colors = BALLOON_COLORS;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (big ? 4 : 2) + Math.random() * (big ? 8 : 5);
    addParticle({
      type: "confetti",
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (big ? 3 : 1),
      life: 60 + Math.random() * 40,
      color: colors[i % colors.length],
      size: big ? 5 + Math.random() * 5 : 3 + Math.random() * 3,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
    });
  }
  kickFx();
}

function confettiRain(durationMs = 2200) {
  const start = performance.now();
  function rain(now) {
    if (now - start > durationMs) return;
    const n = state.reducedMotion ? 2 : 6;
    for (let i = 0; i < n; i++) {
      addParticle({
        type: "confetti",
        x: Math.random() * window.innerWidth,
        y: -10,
        vx: (Math.random() - 0.5) * 2,
        vy: 2 + Math.random() * 4,
        life: 90 + Math.random() * 40,
        color: BALLOON_COLORS[(Math.random() * BALLOON_COLORS.length) | 0],
        size: 4 + Math.random() * 4,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.25,
      });
    }
    kickFx();
    requestAnimationFrame(rain);
  }
  requestAnimationFrame(rain);
}

function launchFirework(x, y) {
  if (rockets.length > 12) rockets.shift();
  rockets.push({
    x: x ?? Math.random() * window.innerWidth * 0.8 + window.innerWidth * 0.1,
    y: window.innerHeight,
    vy: -(7 + Math.random() * 4),
    color: BALLOON_COLORS[(Math.random() * BALLOON_COLORS.length) | 0],
    targetY: y ?? (80 + Math.random() * window.innerHeight * 0.4),
  });
  kickFx();
}

function explodeRocket(r) {
  playFireworkBoop();
  const n = state.reducedMotion ? 20 : 50;
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n + Math.random() * 0.2;
    const speed = 2 + Math.random() * 4;
    addParticle({
      type: "spark",
      x: r.x,
      y: r.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 40 + Math.random() * 30,
      color: r.color,
      size: 2 + Math.random() * 2,
    });
  }
}

function kickFx() {
  if (fxRaf) return;
  fxRaf = requestAnimationFrame(tickFx);
}

function tickFx() {
  fxRaf = null;
  ctx2d.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // Rockets
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i];
    r.y += r.vy;
    r.vy += 0.05;
    ctx2d.beginPath();
    ctx2d.fillStyle = r.color;
    ctx2d.arc(r.x, r.y, 3, 0, Math.PI * 2);
    ctx2d.fill();
    if (r.y <= r.targetY || r.vy >= 0) {
      explodeRocket(r);
      rockets.splice(i, 1);
    }
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= 1;
    if (p.type === "confetti") {
      p.vy += 0.12;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx2d.save();
      ctx2d.translate(p.x, p.y);
      ctx2d.rotate(p.rot);
      ctx2d.fillStyle = p.color;
      ctx2d.globalAlpha = Math.max(0, p.life / 80);
      ctx2d.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx2d.restore();
    } else {
      p.vy += 0.04;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      ctx2d.beginPath();
      ctx2d.fillStyle = p.color;
      ctx2d.globalAlpha = Math.max(0, p.life / 50);
      ctx2d.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx2d.fill();
    }
    if (p.life <= 0) particles.splice(i, 1);
  }
  ctx2d.globalAlpha = 1;

  if (particles.length || rockets.length) kickFx();
}

/* =========================================================
   DOM helpers
   ========================================================= */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function squishPress(el) {
  el.classList.remove("bounce");
  void el.offsetWidth;
  el.classList.add("bounce");
}

/* =========================================================
   1. Welcome gift
   ========================================================= */
function initWelcome() {
  const gift = $("#gift-box");
  const welcome = $("#welcome");
  const main = $("#main");

  gift.addEventListener("click", () => {
    if (gift.classList.contains("open")) return;
    ensureAudio();
    gift.classList.add("shaking");
    playPop();

    setTimeout(() => {
      gift.classList.remove("shaking");
      gift.classList.add("open");
      burstConfetti(window.innerWidth / 2, window.innerHeight / 2, 80, true);
      playChime();

      setTimeout(() => {
        welcome.classList.add("fade-out");
        main.hidden = false;
        main.classList.add("fade-in");
        initHeroLetters();
        startBalloons();
        buildCandles();
        initCarousel();
        observeReveals();
        setTimeout(() => { welcome.style.display = "none"; }, 700);
      }, 700);
    }, 450);
  });
}

/* =========================================================
   2. Hero letters + balloons
   ========================================================= */
function fillLetters(host, text, startDelay, onLetter) {
  host.innerHTML = "";
  let delay = startDelay;
  [...text].forEach((ch) => {
    const span = document.createElement("span");
    span.className = "letter" + (ch === " " ? " space" : "");
    span.textContent = ch === " " ? "\u00A0" : ch;
    span.style.animationDelay = `${delay}s`;
    delay += 0.045;
    if (onLetter) onLetter(span);
    host.appendChild(span);
  });
  return delay;
}

function initHeroLetters() {
  const line = $("#hero-line");
  const nameHost = $("#hero-name");
  let delay = fillLetters(line, "Happy Birthday");
  fillLetters(nameHost, CONFIG.name + "!", delay + 0.12, (span) => {
    span.classList.add("name-part");
    span.addEventListener("click", onNameClick);
  });

  $("#footer-text").textContent = `Made with 💕 for ${CONFIG.name}`;
  document.title = `Happy Birthday, ${CONFIG.name}! 🎂`;
}

function onNameClick(e) {
  e.stopPropagation();
  state.nameClicks += 1;
  if (state.nameClicks >= 5) {
    state.nameClicks = 0;
    triggerGiantBalloon();
  }
}

function triggerGiantBalloon() {
  const el = $("#giant-balloon");
  el.hidden = false;
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = "";
  playChime();
  setTimeout(() => { el.hidden = true; }, 4200);
}

function balloonSvg(color) {
  return `<svg viewBox="0 0 44 58" aria-hidden="true">
    <ellipse cx="22" cy="22" rx="18" ry="21" fill="${color}"/>
    <ellipse cx="15" cy="14" rx="5" ry="7" fill="rgba(255,255,255,0.35)"/>
    <polygon points="19,42 25,42 22,48" fill="${color}"/>
    <path d="M22 48 Q20 54 23 58" stroke="#c9a0dc" stroke-width="1.5" fill="none"/>
  </svg>`;
}

let balloonSpawner = null;

function startBalloons() {
  if (state.reducedMotion) return;
  const layer = $("#balloon-layer");
  const spawn = () => {
    if (layer.children.length > 14) return;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "balloon";
    b.setAttribute("aria-label", "Pop balloon");
    const color = BALLOON_COLORS[(Math.random() * BALLOON_COLORS.length) | 0];
    b.innerHTML = balloonSvg(color);
    b.style.left = `${8 + Math.random() * 84}%`;
    b.style.setProperty("--dur", `${8 + Math.random() * 6}s`);
    b.style.setProperty("--sway", `${8 + Math.random() * 18}px`);
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      popBalloon(b, e);
    });
    layer.appendChild(b);
    b.addEventListener("animationend", () => b.remove());
  };
  spawn();
  balloonSpawner = setInterval(spawn, state.reducedMotion ? 4000 : 1400);
}

function popBalloon(el, e) {
  if (el.classList.contains("popping")) return;
  el.classList.add("popping");
  playPop();
  state.balloonsPopped += 1;
  $("#pop-count").textContent = state.balloonsPopped;

  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  burstConfetti(x, y, 18, false);

  const word = document.createElement("div");
  word.className = "pop-word";
  word.textContent = POP_WORDS[(Math.random() * POP_WORDS.length) | 0];
  word.style.left = `${x}px`;
  word.style.top = `${y}px`;
  document.body.appendChild(word);
  setTimeout(() => word.remove(), 1000);
  setTimeout(() => el.remove(), 350);
}

/* =========================================================
   3. Cake + candles + mic blow
   ========================================================= */
function svgEl(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
  return el;
}

function buildCandles() {
  const group = $("#candles-group");
  group.replaceChildren();
  const count = Math.min(Math.max(1, CONFIG.age | 0), 10);
  const startX = 140 - ((count - 1) * 14) / 2;

  for (let i = 0; i < count; i++) {
    const x = startX + i * 14;
    const g = svgEl("g", { class: "candle" });
    g.append(
      svgEl("rect", { x: x - 3, y: 62, width: 6, height: 34, rx: 2, fill: i % 2 ? "#ffd6a5" : "#b8f2c0" }),
      svgEl("rect", { x: x - 1, y: 58, width: 2, height: 6, fill: "#888" })
    );
    const outer = svgEl("ellipse", { class: "flame", "data-i": i, cx: x, cy: 52, rx: 4, ry: 7, fill: "#ffb347" });
    const inner = svgEl("ellipse", { class: "flame", "data-i": i, cx: x, cy: 50, rx: 2, ry: 3.5, fill: "#fff3a0" });
    outer.style.animationDelay = `${i * 0.07}s`;
    inner.style.animationDelay = `${i * 0.07}s`;
    g.append(outer, inner, svgEl("circle", { class: "smoke", "data-i": i, cx: x, cy: 48, r: 3, fill: "#ccc", opacity: 0 }));
    group.appendChild(g);
  }
  state.candlesLit = true;
  state.blowing = false;
  $("#wish-msg").hidden = true;
  $("#btn-blow").disabled = false;
}

function blowOutCandles() {
  if (!state.candlesLit || state.blowing) return;
  state.blowing = true;
  const flames = $$("#candles-group .flame");
  const smokes = $$("#candles-group .smoke");
  const candleCount = Math.min(Math.max(1, CONFIG.age | 0), 10);

  for (let i = 0; i < candleCount; i++) {
    setTimeout(() => {
      flames.forEach((f) => {
        if (Number(f.dataset.i) === i) f.classList.add("out");
      });
      smokes.forEach((s) => {
        if (Number(s.dataset.i) === i) {
          s.classList.remove("puff");
          // Force restart of smoke animation
          s.style.animation = "none";
          requestAnimationFrame(() => {
            s.style.animation = "";
            s.classList.add("puff");
          });
        }
      });
      playPop();
    }, i * 280);
  }

  setTimeout(() => {
    state.candlesLit = false;
    state.blowing = false;
    $("#wish-msg").hidden = false;
    for (let k = 0; k < 5; k++) {
      setTimeout(() => launchFirework(), k * 250);
    }
    burstConfetti(window.innerWidth / 2, window.innerHeight * 0.35, 60, true);
    playChime();
  }, candleCount * 280 + 200);
}

async function startMicBlow() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    blowOutCandles();
    return;
  }
  try {
    ensureAudio();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.micStream = stream;
    const ctx = ensureAudio();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    state.micAnalyser = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);
    let blown = false;

    const listen = () => {
      if (blown || !state.candlesLit) {
        stopMic();
        return;
      }
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / data.length;
      if (avg > 35) {
        blown = true;
        stopMic();
        blowOutCandles();
        return;
      }
      state.micRaf = requestAnimationFrame(listen);
    };
    listen();
    // Auto stop after 8s
    setTimeout(() => {
      if (!blown) stopMic();
    }, 8000);
  } catch {
    // Permission denied — fall back to button
    blowOutCandles();
  }
}

function stopMic() {
  if (state.micRaf) cancelAnimationFrame(state.micRaf);
  state.micRaf = null;
  if (state.micStream) {
    state.micStream.getTracks().forEach((t) => t.stop());
    state.micStream = null;
  }
  state.micAnalyser = null;
}

function initCake() {
  $("#btn-blow").addEventListener("click", (e) => {
    squishPress(e.currentTarget);
    blowOutCandles();
  });
  $("#btn-mic").addEventListener("click", (e) => {
    squishPress(e.currentTarget);
    startMicBlow();
  });
}

/* =========================================================
   4. Quotes carousel
   ========================================================= */
function initCarousel() {
  renderQuote();
  renderDots();

  $("#flip-card").addEventListener("click", () => {
    state.flipped = !state.flipped;
    $("#flip-card").classList.toggle("flipped", state.flipped);
  });
  $("#flip-card").addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      $("#flip-card").click();
    }
  });

  $("#carousel-prev").addEventListener("click", (e) => {
    squishPress(e.currentTarget);
    shiftQuote(-1);
  });
  $("#carousel-next").addEventListener("click", (e) => {
    squishPress(e.currentTarget);
    shiftQuote(1);
  });

  // Swipe
  const stage = $(".carousel-stage");
  let touchX = null;
  stage.addEventListener("touchstart", (e) => {
    touchX = e.changedTouches[0].screenX;
  }, { passive: true });
  stage.addEventListener("touchend", (e) => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].screenX - touchX;
    if (Math.abs(dx) > 40) shiftQuote(dx < 0 ? 1 : -1);
    touchX = null;
  }, { passive: true });

  // Auto-play
  if (!state.reducedMotion) {
    state.carouselTimer = setInterval(() => shiftQuote(1), 5000);
  }
}

function shiftQuote(dir) {
  state.quoteIndex = (state.quoteIndex + dir + QUOTES.length) % QUOTES.length;
  state.flipped = false;
  $("#flip-card").classList.remove("flipped");
  renderQuote();
  renderDots();
}

function renderQuote() {
  const q = QUOTES[state.quoteIndex];
  $("#quote-emoji").textContent = q.emoji;
  $("#quote-front").textContent = q.front;
  $("#quote-back").textContent = q.back;
}

function renderDots() {
  const host = $("#carousel-dots");
  host.innerHTML = "";
  QUOTES.forEach((_, i) => {
    const d = document.createElement("span");
    if (i === state.quoteIndex) d.classList.add("active");
    host.appendChild(d);
  });
}

/* =========================================================
   5. Wish jar
   ========================================================= */
function initJar() {
  const jar = $("#wish-jar");
  const note = $("#jar-note");
  const noteText = $("#jar-note-text");

  jar.addEventListener("click", () => {
    jar.classList.remove("shaking");
    void jar.offsetWidth;
    jar.classList.add("shaking");
    playPop();
    const wish = JAR_NOTES[(Math.random() * JAR_NOTES.length) | 0];
    noteText.textContent = wish;
    note.hidden = false;
    note.style.animation = "none";
    void note.offsetWidth;
    note.style.animation = "";
  });
}

/* =========================================================
   6. Surprise buttons
   ========================================================= */
function spawnHearts() {
  const n = state.reducedMotion ? 8 : 24;
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      const h = document.createElement("div");
      h.className = "float-heart";
      h.textContent = ["💖", "💗", "💕", "💓", "🩷"][i % 5];
      h.style.left = `${Math.random() * 100}%`;
      h.style.bottom = `${-5 + Math.random() * 10}%`;
      h.style.fontSize = `${1 + Math.random()}rem`;
      document.body.appendChild(h);
      setTimeout(() => h.remove(), 3000);
    }, i * 80);
  }
}

function partyMode() {
  document.body.classList.add("party-mode");
  confettiRain(5000);
  for (let i = 0; i < 6; i++) setTimeout(() => launchFirework(), i * 400);
  playChime();
  clearTimeout(state.partyTimer);
  state.partyTimer = setTimeout(() => {
    document.body.classList.remove("party-mode");
  }, 5000);
}

function initSurprises() {
  $$("[data-surprise]").forEach((btn) => {
    btn.addEventListener("click", () => {
      squishPress(btn);
      const kind = btn.dataset.surprise;
      if (kind === "confetti") {
        confettiRain(2500);
        burstConfetti(window.innerWidth / 2, 80, 50, true);
        playChime();
      } else if (kind === "hearts") {
        spawnHearts();
        playPop();
      } else if (kind === "fireworks") {
        for (let i = 0; i < 7; i++) setTimeout(() => launchFirework(), i * 200);
      } else if (kind === "party") {
        partyMode();
      }
    });
  });
}

/* =========================================================
   7. Envelope / letter typewriter
   ========================================================= */
function initLetter() {
  const env = $("#envelope");
  const letter = $("#letter");
  const textEl = $("#letter-text");
  const signEl = $("#letter-sign");

  env.addEventListener("click", () => {
    if (state.letterOpened) return;
    state.letterOpened = true;
    env.classList.add("open");
    playChime();
    setTimeout(() => {
      letter.hidden = false;
      signEl.textContent = "";
      typewriter(textEl, CONFIG.message, () => {
        typewriter(signEl, `— ${CONFIG.sender}`, null, 40);
      });
    }, 450);
  });
}

function typewriter(el, text, done, speed = 28) {
  el.textContent = "";
  let i = 0;
  const tick = () => {
    if (i <= text.length) {
      el.textContent = text.slice(0, i);
      i += 1;
      setTimeout(tick, speed);
    } else if (done) {
      done();
    }
  };
  tick();
}

/* =========================================================
   8. Footer replay
   ========================================================= */
function initFooter() {
  $("#btn-replay").addEventListener("click", (e) => {
    squishPress(e.currentTarget);
    stopMic();

    // Reset cake
    buildCandles();
    state.letterOpened = false;
    $("#envelope").classList.remove("open");
    $("#letter").hidden = true;
    $("#letter-text").textContent = "";
    $("#letter-sign").textContent = "";
    $("#jar-note").hidden = true;
    state.balloonsPopped = 0;
    $("#pop-count").textContent = "0";
    state.nameClicks = 0;

    // Show welcome again
    const welcome = $("#welcome");
    const main = $("#main");
    const gift = $("#gift-box");
    welcome.style.display = "";
    welcome.classList.remove("fade-out");
    gift.classList.remove("open", "shaking");
    main.hidden = true;
    main.classList.remove("fade-in");
    if (balloonSpawner) clearInterval(balloonSpawner);
    $("#balloon-layer").innerHTML = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* =========================================================
   Controls — sound
   ========================================================= */
function initControls() {
  const soundBtn = $("#btn-sound");
  soundBtn.addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    soundBtn.classList.toggle("off", !state.soundOn);
    soundBtn.textContent = state.soundOn ? "🔊" : "🔇";
  });
}

/* =========================================================
   Cursor sparkles + empty-space click bursts
   ========================================================= */
function initCursorTrail() {
  if (state.reducedMotion) return;
  if (window.matchMedia("(hover: none)").matches) return;

  const cursor = document.createElement("div");
  cursor.id = "custom-cursor";
  document.body.appendChild(cursor);

  let last = 0;
  document.addEventListener("mousemove", (e) => {
    cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    const now = performance.now();
    if (now - last < 40) return;
    last = now;
    const s = document.createElement("div");
    s.className = "sparkle";
    const colors = ["#ff9ec8", "#c9a0dc", "#ffe08a", "#7ec8e3", "#b8f2c0"];
    s.style.background = colors[(Math.random() * colors.length) | 0];
    s.style.left = `${e.clientX + (Math.random() * 10 - 5)}px`;
    s.style.top = `${e.clientY + (Math.random() * 10 - 5)}px`;
    s.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 700);
  });
}

function initClickBursts() {
  document.addEventListener("click", (e) => {
    // Skip interactive controls
    if (e.target.closest("button, a, .flip-card, .balloon, input, textarea")) return;
    const icons = ["💖", "⭐", "✨", "💫", "💗"];
    for (let i = 0; i < 4; i++) {
      const el = document.createElement("div");
      el.className = "click-burst";
      el.textContent = icons[(Math.random() * icons.length) | 0];
      el.style.left = `${e.clientX + (Math.random() * 30 - 15)}px`;
      el.style.top = `${e.clientY + (Math.random() * 30 - 15)}px`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 900);
    }
  });
}

/* =========================================================
   Scroll reveal
   ========================================================= */
function observeReveals() {
  const els = $$(".reveal");
  if (state.reducedMotion) {
    els.forEach((el) => el.classList.add("visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  els.forEach((el) => io.observe(el));
}

/* =========================================================
   Boot
   ========================================================= */
function init() {
  initWelcome();
  initCake();
  initJar();
  initSurprises();
  initLetter();
  initFooter();
  initControls();
  initCursorTrail();
  initClickBursts();
}

document.addEventListener("DOMContentLoaded", init);
