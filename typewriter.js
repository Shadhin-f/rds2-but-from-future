// Typewriter effect for page h1 titles
(function () {
  const TYPING_SPEED = 60;  // ms per character
  const CURSOR_LINGER = 600; // ms cursor stays after typing finishes

  function typeText(el, text, callback) {
    el.textContent = '';
    el.classList.add('typewriter-active');
    let i = 0;

    function tick() {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
        setTimeout(tick, TYPING_SPEED);
      } else {
        // Keep cursor briefly, then remove
        setTimeout(function () {
          el.classList.remove('typewriter-active');
          if (callback) callback();
        }, CURSOR_LINGER);
      }
    }

    tick();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var h1 = document.querySelector('h1');
    if (!h1) return;

    // Skip if h1 has a game-specific class (flappy-bus etc.)
    if (h1.classList.contains('game-title-animated')) return;

    var fullText = h1.textContent.trim();
    var isTyping = false;
    var hasHovered = false;

    // Initial load: type it out
    isTyping = true;
    typeText(h1, fullText, function () {
      isTyping = false;
    });

    // On hover: re-type once
    h1.addEventListener('mouseenter', function () {
      if (isTyping || hasHovered) return;
      hasHovered = true;
      isTyping = true;
      typeText(h1, fullText, function () {
        isTyping = false;
      });
    });

    // Reset hover flag on mouse leave so next hover can trigger again
    h1.addEventListener('mouseleave', function () {
      if (!isTyping) {
        hasHovered = false;
      }
    });
  });
})();
