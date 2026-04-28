// Shared Theme Toggle - Dark/Light Mode (Black & White)
(function () {
  const THEME_KEY = 'rds2-theme-preference';

  // Create starfield with random twinkling stars
  function createStarfield() {
    if (document.querySelector('.starfield')) return;
    const starfield = document.createElement('div');
    starfield.className = 'starfield';

    const starCount = 80; // Number of stars
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      star.className = 'star';

      // Random size class
      const sizes = ['small', 'small', 'small', 'medium', 'medium', 'large'];
      star.classList.add(sizes[Math.floor(Math.random() * sizes.length)]);

      // Random position
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';

      // Random twinkle timing (each star independent)
      const duration = 3 + Math.random() * 7; // 3s to 10s
      const delay = Math.random() * 10;        // offset up to 10s
      const maxOpacity = 0.15 + Math.random() * 0.4; // subtle: 0.15 to 0.55

      star.style.setProperty('--duration', duration + 's');
      star.style.setProperty('--delay', delay + 's');
      star.style.setProperty('--max-opacity', maxOpacity);

      starfield.appendChild(star);
    }

    document.body.prepend(starfield);
  }

  // Inject theme toggle button if not present
  function createToggleButton() {
    if (document.getElementById('themeToggle')) return;
    const btn = document.createElement('button');
    btn.id = 'themeToggle';
    btn.className = 'theme-toggle';
    btn.title = 'Toggle Light/Dark Mode';
    document.body.prepend(btn);
  }

  function loadTheme() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light') {
      document.body.classList.add('light-mode');
      btn.textContent = 'Sun';
    } else {
      document.body.classList.remove('light-mode');
      btn.textContent = 'Moon';
    }
  }

  function toggleTheme() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    if (document.body.classList.contains('light-mode')) {
      document.body.classList.remove('light-mode');
      localStorage.setItem(THEME_KEY, 'dark');
      btn.textContent = 'Moon';
    } else {
      document.body.classList.add('light-mode');
      localStorage.setItem(THEME_KEY, 'light');
      btn.textContent = 'Sun';
    }
  }

  // Create interactive triangle cursor globally
  function createCursorTriangle() {
    if (document.getElementById('cursorTriangle')) return;
    
    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
      body.light-mode #cursorTriangle polygon { stroke: black !important; }
      #cursorTriangle {
        position: fixed; 
        top: 0; 
        left: 0; 
        pointer-events: none; 
        z-index: 0; 
        transform: translate(-50%, -50%); 
        will-change: transform;
      }
    `;
    document.head.appendChild(style);

    // Inject SVG
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('id', 'cursorTriangle');
    svg.setAttribute('width', '60');
    svg.setAttribute('height', '60');

    const poly = document.createElementNS(svgNS, 'polygon');
    poly.setAttribute('id', 'trianglePoly');
    poly.setAttribute('style', 'fill: none; stroke: white; stroke-width: 2px;');
    
    svg.appendChild(poly);
    document.body.appendChild(svg);

    // Animation logic
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currentX = mouseX;
    let currentY = mouseY;
    let lastActiveTime = Date.now();
    let idleAngle = Math.random() * Math.PI * 2;
    let idleX = currentX;
    let idleY = currentY;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      lastActiveTime = Date.now();
    });

    function animate() {
      const now = Date.now();
      const time = now * 0.0025; // Morph speed

      const x1 = 30 + Math.sin(time) * 16;
      const y1 = 15 + Math.cos(time * 1.3) * 12;
      const x2 = 45 + Math.sin(time * 0.8) * 12;
      const y2 = 45 + Math.cos(time * 1.5) * 14;
      const x3 = 15 + Math.sin(time * 1.1) * 14;
      const y3 = 45 + Math.cos(time * 0.9) * 12;
      poly.setAttribute('points', `${x1},${y1} ${x2},${y2} ${x3},${y3}`);

      const timeSinceActive = now - lastActiveTime;
      const isIdle = timeSinceActive > 2500; 

      if (isIdle) {
        idleAngle += (Math.random() - 0.5) * 0.15;
        idleX += Math.cos(idleAngle) * 1.2;
        idleY += Math.sin(idleAngle) * 1.2;

        if (idleX < 50 || idleX > window.innerWidth - 50) idleAngle = Math.PI - idleAngle;
        if (idleY < 50 || idleY > window.innerHeight - 50) idleAngle = -idleAngle;

        currentX += (idleX - currentX) * 0.03; 
        currentY += (idleY - currentY) * 0.03;
      } else {
        idleX = currentX;
        idleY = currentY;

        if (timeSinceActive < 500 && (Math.abs(currentX - mouseX) > 5 || Math.abs(currentY - mouseY) > 5)) {
          currentX += (mouseX - currentX) * 0.12;
          currentY += (mouseY - currentY) * 0.12;
        } else {
          currentX = mouseX;
          currentY = mouseY;
        }
      }

      svg.style.transform = `translate(${currentX - 30}px, ${currentY - 30}px)`;
      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }

  // Initialize on DOM ready or immediately if already loaded
  function init() {
    createStarfield();
    createToggleButton();
    loadTheme();
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    createCursorTriangle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
