const state = {
  quadratic: null,
  fibonacci: null,
  challenge: null,
  fibTimer: null,
  modelInfo: null,
  desmosCalc: null
};

const byId = (id) => document.getElementById(id);
const API_BASE =
  window.__AI_API_BASE ||
  (window.location.hostname.includes("github.io")
    ? "https://YOUR-RENDER-SERVICE.onrender.com"
    : "");

function setupTheme() {
  const toggle = byId("themeToggle");
  const saved = localStorage.getItem("theme");
  if (saved === "light") document.body.classList.add("light");
  toggle.textContent = document.body.classList.contains("light") ? "Dark Mode" : "Light Mode";
  toggle.addEventListener("click", () => {
    document.body.classList.toggle("light");
    const light = document.body.classList.contains("light");
    localStorage.setItem("theme", light ? "light" : "dark");
    toggle.textContent = light ? "Dark Mode" : "Light Mode";
  });
}

function setupPresentationMode() {
  const toggle = byId("presentationToggle");
  const saved = localStorage.getItem("presentationMode");
  if (saved === "on") document.body.classList.add("presentation-mode");
  toggle.textContent = document.body.classList.contains("presentation-mode") ? "Exit Presentation" : "Presentation Mode";
  toggle.addEventListener("click", () => {
    document.body.classList.toggle("presentation-mode");
    const on = document.body.classList.contains("presentation-mode");
    localStorage.setItem("presentationMode", on ? "on" : "off");
    toggle.textContent = on ? "Exit Presentation" : "Presentation Mode";
    if (on) document.querySelector("#ai-research")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function setupReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("in-view");
    });
  }, { threshold: 0.2 });
  document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
}

function pairInputAndRange(inputId, rangeId, onChange) {
  const input = byId(inputId);
  const range = byId(rangeId);
  const syncFromInput = () => {
    let v = Number(input.value);
    if (Number.isNaN(v)) return;
    v = Math.max(Number(range.min), Math.min(Number(range.max), v));
    input.value = v;
    range.value = v;
    onChange();
  };
  const syncFromRange = () => {
    input.value = range.value;
    onChange();
  };
  input.addEventListener("input", syncFromInput);
  range.addEventListener("input", syncFromRange);
}

function formatNum(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function parseSignedNumber(raw) {
  if (raw === "" || raw === "+") return 1;
  if (raw === "-") return -1;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

function parseQuadraticPolynomial(polyInput) {
  const poly = polyInput.replace(/\s+/g, "").replace(/\*/g, "");
  if (!poly) return null;
  if (/[^0-9xX^+.\-]/.test(poly)) return null;
  const terms = poly.match(/[+\-]?[^+\-]+/g);
  if (!terms) return null;

  let a = 0, b = 0, c = 0;
  for (const rawTerm of terms) {
    const term = rawTerm.replace(/X/g, "x");
    if (!term) return null;
    if (term.includes("x^")) {
      if (!term.endsWith("x^2")) return null;
      const coeff = parseSignedNumber(term.slice(0, -3));
      if (coeff === null) return null;
      a += coeff;
      continue;
    }
    if (term.includes("x")) {
      if (!term.endsWith("x")) return null;
      const coeff = parseSignedNumber(term.slice(0, -1));
      if (coeff === null) return null;
      b += coeff;
      continue;
    }
    const constant = Number(term);
    if (Number.isNaN(constant)) return null;
    c += constant;
  }
  return { a, b, c };
}

function formatLinear(b, c) {
  const parts = [];
  if (b !== 0) {
    if (b === 1) parts.push("x");
    else if (b === -1) parts.push("-x");
    else parts.push(`${formatNum(b)}x`);
  }
  if (c !== 0) {
    if (!parts.length) parts.push(formatNum(c));
    else parts.push(`${c > 0 ? "+" : ""}${formatNum(c)}`);
  }
  return parts.length ? parts.join("") : "0";
}

function formatQuadratic(a, b, c) {
  const parts = [];
  if (a !== 0) {
    if (a === 1) parts.push("x^2");
    else if (a === -1) parts.push("-x^2");
    else parts.push(`${formatNum(a)}x^2`);
  }
  if (b !== 0) {
    const term = b === 1 ? "x" : b === -1 ? "-x" : `${formatNum(b)}x`;
    if (!parts.length || term.startsWith("-")) parts.push(term);
    else parts.push(`+${term}`);
  }
  if (c !== 0) {
    const term = formatNum(c);
    if (!parts.length || c < 0) parts.push(term);
    else parts.push(`+${term}`);
  }
  return parts.length ? parts.join("") : "0";
}

function classifyMathInput(input) {
  const clean = (input || "").trim();
  if (!clean) return "Other";
  if (/\n/.test(clean) && /=/.test(clean)) return "System of equations";
  if (/^(d\/dx|derivative)/i.test(clean)) return "Derivative";
  if (/^(\u222B|integral)/i.test(clean)) return "Integral";
  if (/[<>]=?|\u2264|\u2265/.test(clean)) return "Inequality";
  if (/^\s*(f\(x\)|y)\s*=/.test(clean)) return "Function";
  if (clean.includes("=")) return "Equation";
  if (clean.includes("x")) return "Function";
  return "Other";
}

function buildBaseResponse(type) {
  return {
    type,
    analysis: { domain: "", range: "", derivative: "", symmetry: "" },
    key_points: { roots: [], vertex: [], intersections: [], critical_points: [] },
    graph: { expression: "", highlight_points: [] },
    explanation_steps: "",
    chat_summary: ""
  };
}

function analyzeQuadratic(a, b, c, sourceType) {
  const out = buildBaseResponse(sourceType);
  if (a === 0) {
    const root = b === 0 ? null : -c / b;
    out.analysis.domain = "All real numbers";
    out.analysis.range = b === 0 ? `${formatNum(c)}` : "All real numbers";
    out.analysis.derivative = formatNum(b);
    out.analysis.symmetry = "None";
    if (root !== null && Number.isFinite(root)) out.key_points.roots = [[root, 0]];
    out.key_points.intersections = [[0, c], ...out.key_points.roots];
    out.graph.expression = `y=${formatLinear(b, c)}`;
    out.graph.highlight_points = out.key_points.intersections;
    out.explanation_steps =
      `1) Normalize to linear form y=${formatLinear(b, c)}. ` +
      `2) Domain is all real numbers and slope is ${formatNum(b)}. ` +
      `3) Solve bx+c=0 for root and mark y-intercept at (0, ${formatNum(c)}).`;
    out.chat_summary = "This is a line (not a parabola), so there is no vertex.";
    return out;
  }

  const d = b * b - 4 * a * c;
  const vx = -b / (2 * a);
  const vy = a * vx * vx + b * vx + c;
  const derivative = formatLinear(2 * a, b);

  out.analysis.domain = "All real numbers";
  out.analysis.range = a > 0 ? `[${formatNum(vy)}, +infinity)` : `(-infinity, ${formatNum(vy)}]`;
  out.analysis.derivative = derivative;
  out.analysis.symmetry = `About line x=${formatNum(vx)}`;

  if (d > 0) {
    const r1 = (-b - Math.sqrt(d)) / (2 * a);
    const r2 = (-b + Math.sqrt(d)) / (2 * a);
    out.key_points.roots = [[r1, 0], [r2, 0]];
  } else if (d === 0) {
    const r = -b / (2 * a);
    out.key_points.roots = [[r, 0]];
  }

  out.key_points.vertex = [vx, vy];
  out.key_points.intersections = [[0, c], ...out.key_points.roots];
  out.key_points.critical_points = [[vx, vy]];
  out.graph.expression = `y=${formatQuadratic(a, b, c)}`;
  out.graph.highlight_points = [...out.key_points.roots, out.key_points.vertex, [0, c]];

  const extremaText =
    a > 0 ? `Minimum value is ${formatNum(vy)} at x=${formatNum(vx)}.` : `Maximum value is ${formatNum(vy)} at x=${formatNum(vx)}.`;
  out.explanation_steps =
    `1) Convert to standard form y=${formatQuadratic(a, b, c)}. ` +
    `2) Compute D=b^2-4ac=${formatNum(d)} to classify roots. ` +
    `3) Compute vertex (${formatNum(vx)}, ${formatNum(vy)}), axis x=${formatNum(vx)}, and derivative y'=${derivative}. ` +
    `4) ${extremaText}`;
  out.chat_summary = a > 0
    ? "Parabola opens upward, so the vertex is the minimum point."
    : "Parabola opens downward, so the vertex is the maximum point.";
  return out;
}

function solveSingleVariableEquation(equation) {
  const parts = equation.split("=");
  if (parts.length !== 2) return null;
  const left = parseQuadraticPolynomial(parts[0]);
  const right = parseQuadraticPolynomial(parts[1]);
  if (!left || !right) return null;
  const a = left.a - right.a;
  const b = left.b - right.b;
  const c = left.c - right.c;
  if (a !== 0 || b === 0) return null;
  return -c / b;
}

function solveSimpleLinearSystem(lines) {
  if (lines.length !== 2) return null;
  const x1 = solveSingleVariableEquation(lines[0]);
  const x2 = solveSingleVariableEquation(lines[1]);
  if (x1 === null || x2 === null) return null;
  if (Math.abs(x1 - x2) > 1e-9) return null;
  return [x1, 0];
}

function analyzeMathInput(rawInput) {
  const cleanedInput = input.replace(/^\s*solve\s+/i, "");

  const type = classifyMathInput(rawInput);
  const out = buildBaseResponse(type);
  const clean = (rawInput || "").trim();

  if (!clean) {
    out.explanation_steps = "Provide a math input to analyze.";
    out.chat_summary = "Enter a function, equation, inequality, derivative, or integral.";
    return out;
  }

  if (type === "Function") {
    const rhs = clean.replace(/^\s*(f\(x\)|y)\s*=/, "");
    const parsed = parseQuadraticPolynomial(rhs);
    if (parsed) return analyzeQuadratic(parsed.a, parsed.b, parsed.c, "Function");
    out.analysis.domain = "Unable to determine automatically";
    out.graph.expression = rhs ? `y=${rhs}` : "";
    out.explanation_steps = "Detected as a function, but only quadratic-form extraction is implemented in this panel.";
    out.chat_summary = "I recognized a function. For full structural analysis, use quadratic format ax^2+bx+c.";
    return out;
  }

  if (type === "Equation") {
    const parts = clean.split("=");
    if (parts.length === 2) {
      const left = parseQuadraticPolynomial(parts[0]);
      const right = parseQuadraticPolynomial(parts[1]);
      if (left && right) {
        return analyzeQuadratic(left.a - right.a, left.b - right.b, left.c - right.c, "Equation");
      }
    }
    out.explanation_steps = "Detected as an equation, but automatic solving currently supports quadratic polynomial equations.";
    out.chat_summary = "Use format like x^2-5x+6=0 for full output.";
    return out;
  }

  if (type === "Derivative") {
    const target = clean.replace(/^(d\/dx|derivative)\s*/i, "").trim();
    out.analysis.derivative = target ? `d/dx(${target})` : "Not provided";
    out.graph.expression = target ? `y=${target}` : "";
    out.explanation_steps = "1) Input classified as derivative request. 2) Function target extracted. 3) Apply derivative rules.";
    out.chat_summary = "Derivative request recognized. Share the full function for detailed steps.";
    return out;
  }

  if (type === "Integral") {
    out.explanation_steps = "1) Input classified as integral request. 2) Identify integrand/bounds. 3) Apply integration rules.";
    out.chat_summary = "Integral request recognized. Add bounds for definite value.";
    return out;
  }

  if (type === "System of equations") {
    const lines = clean.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    const solution = solveSimpleLinearSystem(lines);
    out.explanation_steps = "1) Input classified as a system. 2) Normalize equations. 3) Solve for intersection.";
    if (solution) {
      out.key_points.intersections = [solution];
      out.graph.highlight_points = [solution];
      out.chat_summary = `System solved with intersection at x=${formatNum(solution[0])}.`;
    } else {
      out.chat_summary = "System recognized, but this module currently solves only simple two-line forms.";
    }
    return out;
  }

  if (type === "Inequality") {
    out.explanation_steps = "1) Move terms to one side. 2) Find critical boundaries. 3) Test intervals.";
    out.chat_summary = "Inequality recognized.";
    return out;
  }

  out.explanation_steps = "Input type not recognized.";
  out.chat_summary = "Try forms like f(x)=x^2-4x+3 or x^2-5x+6=0.";
  return out;
}

function runMathAnalysisEngine() {
  const input = byId("analysisInput");
  const output = byId("analysisJson");
  const status = byId("chatStatus");
  if (!input || !output) return;
  const result = analyzeMathInput(input.value || "");
  output.className = "result";
  output.textContent = JSON.stringify(result, null, 2);
  if (result.graph?.expression) {
    plotAnalysisOnDesmos(result);
    if (status) status.textContent = "Auto-plotted from Analyze.";
  }
}

function formatPoint(point) {
  if (!Array.isArray(point) || point.length !== 2) return "";
  return `(${formatNum(point[0])}, ${formatNum(point[1])})`;
}

function appendChatMessage(role, text) {
  const log = byId("chatLog");
  if (!log) return;
  const msg = document.createElement("div");
  msg.className = `chat-msg ${role}`;
  msg.textContent = text;
  log.appendChild(msg);
  log.scrollTop = log.scrollHeight;
}

function clearChatLog() {
  const log = byId("chatLog");
  if (!log) return;
  log.innerHTML = "";
  appendChatMessage("ai", "Ready. Ask me any function, equation, inequality, derivative, or integral.");
}

function summarizeForChat(analysis) {
  const roots = (analysis.key_points?.roots || []).map(formatPoint).filter(Boolean).join(", ");
  const vertex = formatPoint(analysis.key_points?.vertex);
  const bits = [
    `Type: ${analysis.type}.`,
    analysis.chat_summary || "",
    analysis.explanation_steps || "",
    roots ? `Roots: ${roots}.` : "",
    vertex ? `Vertex: ${vertex}.` : "",
    analysis.graph?.expression ? `Desmos expression: ${analysis.graph.expression}.` : ""
  ].filter(Boolean);
  return bits.join(" ");
}

async function fetchWolframResult(query) {
  const appId = window.__WOLFRAM_APP_ID || "";
  if (!appId) return null;
  const url = `https://api.wolframalpha.com/v1/result?appid=${encodeURIComponent(appId)}&i=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wolfram HTTP ${res.status}`);
  return (await res.text()).trim();
}

async function handleChatSend() {
  const inputEl = byId("chatInput");
  const status = byId("chatStatus");
  if (!inputEl) return;
  const text = inputEl.value.trim();
  if (!text) return;
  inputEl.value = "";
  appendChatMessage("user", text);

  const analysis = analyzeMathInput(text);
  appendChatMessage("ai", summarizeForChat(analysis));
  if (status) status.textContent = "Local analysis complete.";

  if (!byId("useWolfram")?.checked) return;
  try {
    if (status) status.textContent = "Querying Wolfram...";
    const wa = await fetchWolframResult(text);
    if (wa) {
      appendChatMessage("ai", `Wolfram: ${wa}`);
      if (status) status.textContent = "Wolfram response received.";
    } else if (status) {
      status.textContent = "Wolfram disabled (set window.__WOLFRAM_APP_ID).";
    }
  } catch (err) {
    if (status) status.textContent = `Wolfram failed: ${err.message}`;
  }
}

function initDesmos() {
  const el = byId("desmosGraph");
  if (!el || !window.Desmos) return;
  state.desmosCalc = Desmos.GraphingCalculator(el, {
    expressions: true,
    settingsMenu: false,
    zoomButtons: true
  });
}

function plotAnalysisOnDesmos(analysis) {
  if (!state.desmosCalc || !analysis?.graph?.expression) return;
  const calc = state.desmosCalc;
  calc.setBlank();
  calc.setExpression({ id: "expr", latex: analysis.graph.expression });
  (analysis.graph.highlight_points || []).forEach((p, i) => {
    if (!Array.isArray(p) || p.length !== 2) return;
    calc.setExpression({
      id: `pt${i}`,
      latex: `(${p[0]},${p[1]})`,
      label: `P${i + 1}`,
      showLabel: true
    });
  });
}

function handleDesmosPlot() {
  const input = byId("analysisInput");
  const status = byId("chatStatus");
  if (!input) return;
  const analysis = analyzeMathInput(input.value || "");
  if (!analysis.graph?.expression) {
    if (status) status.textContent = "No graphable expression found for this input.";
    return;
  }
  plotAnalysisOnDesmos(analysis);
  if (status) status.textContent = "Plotted on Desmos.";
}

function solveQuadratic() {
  const a = Number(byId("qa").value);
  const b = Number(byId("qb").value);
  const c = Number(byId("qc").value);
  const result = byId("quadResult");

  if ([a, b, c].some((v) => Number.isNaN(v))) {
    result.className = "result danger";
    result.textContent = "Please enter valid numbers for a, b, and c.";
    return;
  }
  if (a === 0) {
    result.className = "result danger";
    result.textContent = "a cannot be 0 for a quadratic equation.";
    drawQuadraticGraph(a, b, c);
    return;
  }

  const d = b * b - 4 * a * c;
  const vertexX = -b / (2 * a);
  const vertexY = a * vertexX * vertexX + b * vertexX + c;
  let rootsText = "";
  if (d > 0) {
    const r1 = (-b + Math.sqrt(d)) / (2 * a);
    const r2 = (-b - Math.sqrt(d)) / (2 * a);
    rootsText = `Two real roots: x1=${formatNum(r1)}, x2=${formatNum(r2)}.`;
  } else if (d === 0) {
    const r = -b / (2 * a);
    rootsText = `One repeated root: x=${formatNum(r)}.`;
  } else {
    rootsText = "No real roots (complex roots).";
  }
  result.className = "result";
  result.textContent = `Discriminant: ${formatNum(d)}. ${rootsText} Vertex: (${formatNum(vertexX)}, ${formatNum(vertexY)}).`;

  state.quadratic = { a, b, c, d, vertexX, vertexY };
  drawQuadraticGraph(a, b, c);
}

function drawQuadraticGraph(a, b, c) {
  const canvas = byId("quadCanvas");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const xMin = -10;
  const xMax = 10;
  const yMin = -10;
  const yMax = 10;
  const toX = (x) => ((x - xMin) / (xMax - xMin)) * w;
  const toY = (y) => h - ((y - yMin) / (yMax - yMin)) * h;

  ctx.strokeStyle = "rgba(180,190,220,0.35)";
  ctx.lineWidth = 1;
  for (let gx = -10; gx <= 10; gx += 1) {
    const px = toX(gx);
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
    ctx.stroke();
  }
  for (let gy = -10; gy <= 10; gy += 1) {
    const py = toY(gy);
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, toY(0));
  ctx.lineTo(w, toY(0));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(toX(0), 0);
  ctx.lineTo(toX(0), h);
  ctx.stroke();

  ctx.strokeStyle = "#2dd4bf";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  let started = false;
  for (let px = 0; px <= w; px++) {
    const x = xMin + (px / w) * (xMax - xMin);
    const y = a * x * x + b * x + c;
    const py = toY(y);
    if (!started) {
      ctx.moveTo(px, py);
      started = true;
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.stroke();
}

function quadraticExample() {
  byId("qa").value = 1;
  byId("qb").value = -3;
  byId("qc").value = 2;
  byId("qaRange").value = 1;
  byId("qbRange").value = -3;
  byId("qcRange").value = 2;
  solveQuadratic();
}

function quadraticReset() {
  byId("qa").value = 1;
  byId("qb").value = -5;
  byId("qc").value = 6;
  byId("qaRange").value = 1;
  byId("qbRange").value = -5;
  byId("qcRange").value = 6;
  byId("quadResult").className = "result";
  byId("quadResult").textContent = "Ready. Edit coefficients or use Try Example.";
  solveQuadratic();
}

function makeFibList(n) {
  const out = [0, 1];
  while (out.length < n) out.push(out[out.length - 1] + out[out.length - 2]);
  return out.slice(0, n);
}

function fibRatios(seq) {
  const ratios = [];
  for (let i = 2; i < seq.length; i++) {
    if (seq[i - 1] !== 0) ratios.push(seq[i] / seq[i - 1]);
  }
  return ratios;
}

function drawFibChart(ratios) {
  const canvas = byId("fibChart");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(180,190,220,0.32)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = (i / 5) * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const phi = (1 + Math.sqrt(5)) / 2;
  const yMin = 1;
  const yMax = Math.max(2, ...ratios, phi);
  const toY = (v) => h - ((v - yMin) / (yMax - yMin)) * h;

  ctx.strokeStyle = "#ffcb6b";
  ctx.lineWidth = 1.5;
  const py = toY(phi);
  ctx.beginPath();
  ctx.moveTo(0, py);
  ctx.lineTo(w, py);
  ctx.stroke();

  if (!ratios.length) return;
  ctx.strokeStyle = "#7cc9ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ratios.forEach((r, i) => {
    const x = (i / Math.max(1, ratios.length - 1)) * w;
    const y = toY(r);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function renderFibProgress(limit) {
  const seq = state.fibonacci.full.slice(0, limit);
  const ratios = fibRatios(seq);
  const ratioText = ratios.length ? ratios[ratios.length - 1].toFixed(6) : "n/a";
  byId("fibResult").className = "result";
  byId("fibResult").textContent = `Sequence (${seq.length} terms): ${seq.join(", ")}. Latest ratio Fn/Fn-1: ${ratioText}`;
  drawFibChart(ratios);
  state.fibonacci.lastShown = limit;
}

function fibGenerate() {
  const n = Number(byId("fibTerms").value);
  const out = byId("fibResult");
  if (Number.isNaN(n) || n < 2 || n > 25) {
    out.className = "result danger";
    out.textContent = "Enter a valid number of terms between 2 and 25.";
    return;
  }
  state.fibonacci = { full: makeFibList(n), lastShown: 0 };
  renderFibProgress(2);
}

function fibNextStep() {
  if (!state.fibonacci) {
    fibGenerate();
    return;
  }
  const next = Math.min(state.fibonacci.full.length, state.fibonacci.lastShown + 1);
  renderFibProgress(next);
}

function fibAutoPlay() {
  const btn = byId("fibPlay");
  if (state.fibTimer) {
    clearInterval(state.fibTimer);
    state.fibTimer = null;
    btn.textContent = "Auto Play";
    return;
  }
  if (!state.fibonacci) fibGenerate();
  btn.textContent = "Stop";
  state.fibTimer = setInterval(() => {
    const next = state.fibonacci.lastShown + 1;
    if (next > state.fibonacci.full.length) {
      clearInterval(state.fibTimer);
      state.fibTimer = null;
      btn.textContent = "Auto Play";
      return;
    }
    renderFibProgress(next);
  }, 550);
}

function fibReset() {
  byId("fibTerms").value = 12;
  if (state.fibTimer) {
    clearInterval(state.fibTimer);
    state.fibTimer = null;
  }
  byId("fibPlay").textContent = "Auto Play";
  state.fibonacci = null;
  byId("fibResult").className = "result";
  byId("fibResult").textContent = "Press Generate to start.";
  drawFibChart([]);
}

function tokenize(expression) {
  const clean = expression.replace(/\s+/g, "");
  if (!/^[0-9+\-*/().]*$/.test(clean)) {
    throw new Error("Only numbers and operators + - * / ( ) are allowed.");
  }
  const tokens = [];
  let i = 0;
  while (i < clean.length) {
    const c = clean[i];
    if ("+-*/()".includes(c)) {
      if (c === "-" && (i === 0 || "+-*/(".includes(clean[i - 1]))) {
        let j = i + 1;
        while (j < clean.length && /[0-9.]/.test(clean[j])) j++;
        const num = clean.slice(i, j);
        if (!/^-[0-9]*\.?[0-9]+$/.test(num)) throw new Error("Invalid negative number.");
        tokens.push(num);
        i = j;
        continue;
      }
      tokens.push(c);
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i + 1;
      while (j < clean.length && /[0-9.]/.test(clean[j])) j++;
      const num = clean.slice(i, j);
      if (!/^[0-9]*\.?[0-9]+$/.test(num)) throw new Error("Invalid number format.");
      tokens.push(num);
      i = j;
      continue;
    }
    throw new Error("Invalid character.");
  }
  return tokens;
}

function toRpn(tokens) {
  const out = [];
  const stack = [];
  const prec = { "+": 1, "-": 1, "*": 2, "/": 2 };
  tokens.forEach((t) => {
    if (!Number.isNaN(Number(t))) out.push(t);
    else if ("+-*/".includes(t)) {
      while (stack.length && "+-*/".includes(stack[stack.length - 1]) && prec[stack[stack.length - 1]] >= prec[t]) {
        out.push(stack.pop());
      }
      stack.push(t);
    } else if (t === "(") stack.push(t);
    else if (t === ")") {
      while (stack.length && stack[stack.length - 1] !== "(") out.push(stack.pop());
      if (!stack.length) throw new Error("Mismatched parentheses.");
      stack.pop();
    }
  });
  while (stack.length) {
    const top = stack.pop();
    if (top === "(" || top === ")") throw new Error("Mismatched parentheses.");
    out.push(top);
  }
  return out;
}

function evalRpn(tokens) {
  const s = [];
  tokens.forEach((t) => {
    if (!Number.isNaN(Number(t))) s.push(Number(t));
    else {
      if (s.length < 2) throw new Error("Invalid expression.");
      const b = s.pop();
      const a = s.pop();
      let v = 0;
      if (t === "+") v = a + b;
      if (t === "-") v = a - b;
      if (t === "*") v = a * b;
      if (t === "/") {
        if (b === 0) throw new Error("Division by zero.");
        v = a / b;
      }
      s.push(v);
    }
  });
  if (s.length !== 1) throw new Error("Invalid expression.");
  return s[0];
}

function calcEvaluate() {
  const input = byId("calcInput");
  const out = byId("calcResult");
  try {
    const expr = input.value.trim();
    if (!expr) throw new Error("Type an expression first.");
    const value = evalRpn(toRpn(tokenize(expr)));
    out.className = "result";
    out.textContent = `Result: ${formatNum(value)}`;
  } catch (err) {
    out.className = "result danger";
    out.textContent = String(err.message || err);
  }
}

function explainResults() {
  const out = byId("explainResult");
  const lines = [];
  if (state.quadratic) {
    const { d, a, vertexX, vertexY } = state.quadratic;
    const shape = a > 0 ? "opens upward" : "opens downward";
    const rootType = d > 0 ? "two real roots" : d === 0 ? "one repeated root" : "complex roots";
    lines.push(`Quadratic: your parabola ${shape}, with ${rootType}. Vertex at (${formatNum(vertexX)}, ${formatNum(vertexY)}).`);
  }
  if (state.fibonacci && state.fibonacci.lastShown >= 3) {
    const seq = state.fibonacci.full.slice(0, state.fibonacci.lastShown);
    const ratios = fibRatios(seq);
    const latest = ratios[ratios.length - 1];
    lines.push(`Fibonacci: the ratio Fn/Fn-1 is approaching 1.618. Current estimate: ${latest.toFixed(6)}.`);
  }
  if (!lines.length) {
    lines.push("No recent math result to explain yet. Run Quadratic Solve or Fibonacci Generate first.");
  }
  out.className = "result";
  out.textContent = lines.join(" ");
}

function newChallenge() {
  const type = Math.random() < 0.5 ? "quadratic" : "fibonacci";
  if (type === "quadratic") {
    const dValues = ["positive", "zero", "negative"];
    const target = dValues[Math.floor(Math.random() * dValues.length)];
    const presets = {
      positive: { a: 1, b: -3, c: 2 },
      zero: { a: 1, b: -2, c: 1 },
      negative: { a: 2, b: 1, c: 3 }
    };
    const p = presets[target];
    state.challenge = { type, answer: target };
    byId("challengePrompt").textContent = `Challenge: For a=${p.a}, b=${p.b}, c=${p.c}, is discriminant positive, zero, or negative?`;
  } else {
    const seeds = [
      { seq: [0, 1, 1, 2, 3], answer: "5" },
      { seq: [1, 1, 2, 3, 5], answer: "8" },
      { seq: [2, 3, 5, 8, 13], answer: "21" }
    ];
    const pick = seeds[Math.floor(Math.random() * seeds.length)];
    state.challenge = { type, answer: pick.answer };
    byId("challengePrompt").textContent = `Challenge: Next number in sequence ${pick.seq.join(", ")} ?`;
  }
  byId("challengeAnswer").value = "";
  byId("challengeResult").className = "result";
  byId("challengeResult").textContent = "Waiting for your answer.";
}

function checkChallenge() {
  const out = byId("challengeResult");
  const ans = byId("challengeAnswer").value.trim().toLowerCase();
  if (!state.challenge) {
    out.className = "result warn";
    out.textContent = "Create a challenge first.";
    return;
  }
  if (!ans) {
    out.className = "result warn";
    out.textContent = "Type an answer first.";
    return;
  }
  if (ans === state.challenge.answer) {
    out.className = "result";
    out.textContent = "Correct. Great presentation moment.";
  } else {
    out.className = "result danger";
    out.textContent = `Not yet. Correct answer: ${state.challenge.answer}.`;
  }
}

function setupEvents() {
  pairInputAndRange("qa", "qaRange", solveQuadratic);
  pairInputAndRange("qb", "qbRange", solveQuadratic);
  pairInputAndRange("qc", "qcRange", solveQuadratic);

  byId("quadSolve").addEventListener("click", solveQuadratic);
  byId("quadExample").addEventListener("click", quadraticExample);
  byId("quadReset").addEventListener("click", quadraticReset);

  byId("fibGenerate").addEventListener("click", fibGenerate);
  byId("fibNext").addEventListener("click", fibNextStep);
  byId("fibPlay").addEventListener("click", fibAutoPlay);
  byId("fibReset").addEventListener("click", fibReset);

  document.querySelectorAll("[data-calc]").forEach((btn) => {
    btn.addEventListener("click", () => {
      byId("calcInput").value += btn.dataset.calc;
      byId("calcInput").focus();
    });
  });
  byId("calcClear").addEventListener("click", () => byId("calcInput").value = "");
  byId("calcBack").addEventListener("click", () => {
    const i = byId("calcInput");
    i.value = i.value.slice(0, -1);
    i.focus();
  });
  byId("calcEquals").addEventListener("click", calcEvaluate);

  byId("explainNow").addEventListener("click", explainResults);
  byId("challengeNew").addEventListener("click", newChallenge);
  byId("challengeCheck").addEventListener("click", checkChallenge);
  byId("aiPredictBtn").addEventListener("click", predictAIScore);
  byId("analysisRun").addEventListener("click", runMathAnalysisEngine);
  byId("chatSend")?.addEventListener("click", handleChatSend);
  byId("chatClear")?.addEventListener("click", clearChatLog);
  byId("desmosPlot")?.addEventListener("click", handleDesmosPlot);
  byId("desmosClear")?.addEventListener("click", () => state.desmosCalc?.setBlank());

  ["qa", "qb", "qc", "fibTerms", "calcInput", "challengeAnswer", "analysisInput", "chatInput"].forEach((id) => {
    byId(id).addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      if (id === "fibTerms") fibGenerate();
      else if (id === "calcInput") calcEvaluate();
      else if (id === "challengeAnswer") checkChallenge();
      else if (id === "analysisInput") runMathAnalysisEngine();
      else if (id === "chatInput") handleChatSend();
      else solveQuadratic();
    });
  });
}

function setModelTableRows(models) {
  const tbody = document.querySelector("#modelTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  models.forEach((m) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.name}</td>
      <td>${m.train_r2}</td>
      <td>${m.test_r2}</td>
      <td>${m.test_mae}</td>
      <td>${m.overfit_gap}</td>
    `;
    tbody.appendChild(tr);
  });
}

function plotPredictedVsActual(modelInfo) {
  if (!window.Plotly) return;
  const best = modelInfo.models.find((m) => m.name === modelInfo.best_model) || modelInfo.models[0];
  const yTrue = best.y_true || [];
  const yPred = best.y_pred || [];
  const trace = {
    x: yTrue,
    y: yPred,
    mode: "markers",
    type: "scatter",
    marker: { color: "#2dd4bf", size: 8, opacity: 0.8 },
    name: "Samples"
  };
  const line = {
    x: [Math.min(...yTrue, 0), Math.max(...yTrue, 100)],
    y: [Math.min(...yTrue, 0), Math.max(...yTrue, 100)],
    mode: "lines",
    line: { color: "#ffcb6b", dash: "dash" },
    name: "Ideal"
  };
  Plotly.newPlot("predActualChart", [trace, line], {
    margin: { t: 20, r: 15, b: 45, l: 45 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    xaxis: { title: "Actual Score" },
    yaxis: { title: "Predicted Score" }
  }, { displayModeBar: false, responsive: true });
}

function plotFeatureImportance(modelInfo) {
  if (!window.Plotly) return;
  const importance = modelInfo.feature_importance || {};
  const x = Object.keys(importance);
  const y = Object.values(importance);
  Plotly.newPlot("featureChart", [{
    x,
    y,
    type: "bar",
    marker: { color: ["#2dd4bf", "#7cc9ff", "#ffcb6b"] }
  }], {
    margin: { t: 20, r: 15, b: 50, l: 45 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    yaxis: { title: "Importance" }
  }, { displayModeBar: false, responsive: true });
}

async function loadAIModelInfo() {
  const note = byId("bestModelNote");
  try {
    const res = await fetch(`${API_BASE}/api/model-info`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const info = await res.json();
    state.modelInfo = info;
    setModelTableRows(info.models || []);
    note.className = "result";
    note.textContent = `Best model: ${info.best_model}. Dataset size: ${info.dataset_size}. Metrics use an 80/20 split.`;
    plotPredictedVsActual(info);
    plotFeatureImportance(info);
  } catch (err) {
    note.className = "result warn";
    note.textContent = "Could not load Flask API data. Start backend: python ai_backend/app.py";
    const tbody = document.querySelector("#modelTable tbody");
    if (tbody) tbody.innerHTML = "<tr><td colspan='5'>Backend not available.</td></tr>";
  }
}

async function predictAIScore() {
  const out = byId("aiPredictResult");
  const payload = {
    StudyHours: Number(byId("aiStudyHours").value),
    SleepHours: Number(byId("aiSleepHours").value),
    PracticeTests: Number(byId("aiPracticeTests").value)
  };
  if (Object.values(payload).some((v) => Number.isNaN(v))) {
    out.className = "result danger";
    out.textContent = "Enter valid numeric values for all fields.";
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    out.className = "result";
    out.textContent = `Predicted FinalScore: ${data.predicted_score}. ${data.explanation}`;
  } catch (err) {
    out.className = "result danger";
    out.textContent = `Prediction failed: ${err.message}. Start backend and retry.`;
  }
}

function init() {
  setupTheme();
  setupPresentationMode();
  setupReveal();
  initDesmos();
  setupEvents();
  loadAIModelInfo();
  quadraticReset();
  fibReset();
  drawFibChart([]);
  clearChatLog();
}

init();

