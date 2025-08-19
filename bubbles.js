function createBubble() {
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  const size = Math.random() * 15 + 10;
  bubble.style.width = bubble.style.height = `${size}px`;

  const appRect = document.getElementById('app').getBoundingClientRect();
  bubble.style.left = `${appRect.left + Math.random() * appRect.width}px`;
  bubble.style.animationDuration = `${Math.random() * 6 + 4}s`;
  bubble.style.setProperty('--drift', `${(Math.random() - 0.5) * 50}px`);

  document.body.appendChild(bubble);
  bubble.addEventListener('animationend', () => bubble.remove());
}

// ✅ This makes one bubble appear immediately
createBubble();

// Then keep making more every 2 seconds (change 2000 if you want faster/slower)
setInterval(createBubble, 2000);
