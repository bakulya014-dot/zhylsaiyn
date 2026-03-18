const modeToggle = document.querySelector("#modeToggle");
const metricValues = document.querySelectorAll("[data-count]");
const revealTargets = document.querySelectorAll(".section, .hero-copy, .hero-panel");

const quadraticChart = document.querySelector("#quadraticChart");
const equationLine = document.querySelector("#equationLine");
const quadraticInsights = document.querySelector("#quadraticInsights");
const coefA = document.querySelector("#coefA");
const coefB = document.querySelector("#coefB");
const coefC = document.querySelector("#coefC");

const studyHours = document.querySelector("#studyHours");
const practiceTests = document.querySelector("#practiceTests");
const consistency = document.querySelector("#consistency");
const predictionValue = document.querySelector("#predictionValue");
const predictionExplanation = document.querySelector("#predictionExplanation");

const blockForm = document.querySelector("#blockForm");
const studentName = document.querySelector("#studentName");
const achievementName = document.querySelector("#achievementName");
const achievementScore = document.querySelector("#achievementScore");
const chainRail = document.querySelector("#chainRail");

function updateModeLabel() {
  modeToggle.textContent = document.body.classList.contains("dark-mode") ? "Dark Mode" : "Light Mode";
}

modeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  updateModeLabel();
});

updateModeLabel();

function animateMetrics() {
  metricValues.forEach((node) => {
    const target = Number(node.dataset.count);
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 32));
    const timer = window.setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        window.clearInterval(timer);
      }
      node.textContent = current;
    }, 32);
  });
}

function setupReveal() {
  revealTargets.forEach((target) => target.classList.add("reveal"));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  }, { threshold: 0.18 });

  revealTargets.forEach((target) => observer.observe(target));
}

function drawQuadratic() {
  let a = Number(coefA.value);
  const b = Number(coefB.value);
  const c = Number(coefC.value);

  if (a === 0) {
    a = 1;
    coefA.value = "1";
  }

  equationLine.textContent = `f(x) = ${a}x^2 ${b >= 0 ? "+" : "-"} ${Math.abs(b)}x ${c >= 0 ? "+" : "-"} ${Math.abs(c)}`;

  const width = 320;
  const height = 220;
  const originX = width / 2;
  const originY = height / 2;
  const scale = 18;

  const points = [];
  for (let x = -8; x <= 8; x += 0.25) {
    const y = a * x * x + b * x + c;
    const px = originX + x * scale;
    const py = originY - y * scale;
    points.push(`${px.toFixed(2)},${py.toFixed(2)}`);
  }

  const discriminant = b * b - 4 * a * c;
  const vertexX = -b / (2 * a);
  const vertexY = a * vertexX * vertexX + b * vertexX + c;

  let rootsText = "No real roots";
  if (discriminant === 0) {
    rootsText = `One real root at x = ${(-b / (2 * a)).toFixed(2)}`;
  } else if (discriminant > 0) {
    const root1 = ((-b + Math.sqrt(discriminant)) / (2 * a)).toFixed(2);
    const root2 = ((-b - Math.sqrt(discriminant)) / (2 * a)).toFixed(2);
    rootsText = `Two real roots at x = ${root1} and x = ${root2}`;
  }

  quadraticChart.innerHTML = `
    <line x1="0" y1="${originY}" x2="${width}" y2="${originY}" stroke="currentColor" stroke-opacity="0.25" />
    <line x1="${originX}" y1="0" x2="${originX}" y2="${height}" stroke="currentColor" stroke-opacity="0.25" />
    <polyline
      fill="none"
      stroke="var(--coral)"
      stroke-width="3"
      points="${points.join(" ")}"
    />
    <circle cx="${(originX + vertexX * scale).toFixed(2)}" cy="${(originY - vertexY * scale).toFixed(2)}" r="5" fill="var(--teal)" />
  `;

  quadraticInsights.innerHTML = `
    <strong>Graph insight</strong><br>
    Vertex: (${vertexX.toFixed(2)}, ${vertexY.toFixed(2)})<br>
    ${rootsText}<br>
    The parabola opens ${a > 0 ? "upward" : "downward"}, which is easy to connect to optimization or trend modeling in your pitch.
  `;
}

function updatePrediction() {
  const hours = Number(studyHours.value);
  const tests = Number(practiceTests.value);
  const consistencyScore = Number(consistency.value);

  const predicted = Math.max(
    0,
    Math.min(100, Math.round(hours * 4.6 + tests * 5.2 + consistencyScore * 0.32))
  );

  predictionValue.textContent = predicted;

  let band = "needs support";
  if (predicted >= 85) {
    band = "high mastery";
  } else if (predicted >= 65) {
    band = "stable progress";
  }

  predictionExplanation.textContent =
    `The model reads ${hours} study hours, ${tests} practice tests, and ${consistencyScore}% consistency as ${band}. ` +
    `For the hackathon story, AI gives the recommendation, while blockchain can preserve the final verified milestone.`;
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `0x${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

const chain = [
  {
    student: "Genesis",
    achievement: "Portfolio Initialized",
    score: 100,
    previousHash: "0x00000000"
  }
];

function renderChain() {
  chainRail.innerHTML = chain
    .map((block, index) => {
      const blockHash = hashString(`${block.student}|${block.achievement}|${block.score}|${block.previousHash}`);
      return `
        <article class="block-card">
          <span class="block-index">Block ${index}</span>
          <h3>${block.achievement}</h3>
          <p>${block.student} / score ${block.score}</p>
          <span class="hash-line">prev: ${block.previousHash}</span>
          <span class="hash-line">hash: ${blockHash}</span>
        </article>
      `;
    })
    .join("");
}

blockForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const previous = chain[chain.length - 1];
  const previousHash = hashString(`${previous.student}|${previous.achievement}|${previous.score}|${previous.previousHash}`);
  chain.push({
    student: studentName.value.trim() || "Anonymous",
    achievement: achievementName.value.trim() || "Learning milestone",
    score: Math.max(0, Math.min(100, Number(achievementScore.value) || 0)),
    previousHash
  });
  renderChain();
});

[coefA, coefB, coefC].forEach((input) => input.addEventListener("input", drawQuadratic));
[studyHours, practiceTests, consistency].forEach((input) => input.addEventListener("input", updatePrediction));

animateMetrics();
setupReveal();
drawQuadratic();
updatePrediction();
renderChain();

