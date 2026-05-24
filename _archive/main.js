// Mobile Navigation Toggle
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuBtn && navLinks) {
  mobileMenuBtn.addEventListener('click', () => {
    navLinks.classList.toggle('active');

    // Animate hamburger icon (optional enhancement)
    const spans = mobileMenuBtn.querySelectorAll('span');
    navLinks.classList.contains('active')
      ? document.body.style.overflow = 'hidden'
      : document.body.style.overflow = 'auto';
  });

  // Close menu on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
      document.body.style.overflow = 'auto';
    });
  });
}

// Navbar Scroll Effect
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// Scroll Reveal Animations
const revealElements = document.querySelectorAll('.reveal');

const revealOnScroll = () => {
  const windowHeight = window.innerHeight;
  const revealPoint = 100;

  revealElements.forEach((el) => {
    const revealTop = el.getBoundingClientRect().top;

    if (revealTop < windowHeight - revealPoint) {
      el.classList.add('active');
    }
  });
};

// Initial check on load
window.addEventListener('load', revealOnScroll);
// Check on scroll
window.addEventListener('scroll', revealOnScroll);

// --- NEXT-GEN CUSTOM CURSOR ---
const cursor = document.querySelector('.cursor');
const cursorFollower = document.querySelector('.cursor-follower');
const interactables = document.querySelectorAll('a, button, .tilt-card');

document.addEventListener('mousemove', (e) => {
  cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;

  // A tiny bit of delay for the follower
  requestAnimationFrame(() => {
    cursorFollower.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
  });
});

interactables.forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursorFollower.style.width = '60px';
    cursorFollower.style.height = '60px';
    cursorFollower.style.backgroundColor = 'rgba(0, 240, 255, 0.1)';
  });
  el.addEventListener('mouseleave', () => {
    cursorFollower.style.width = '40px';
    cursorFollower.style.height = '40px';
    cursorFollower.style.backgroundColor = 'transparent';
  });
});

// --- 3D TILT PHYSICS ---
const tiltCards = document.querySelectorAll('.tilt-card');

tiltCards.forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within the element.
    const y = e.clientY - rect.top;  // y position within the element.

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10; // Max rotation 10deg
    const rotateY = ((x - centerX) / centerX) * 10;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  });
});

// --- THEME TOGGLE (LIGHT / DARK MODE) ---
const themeToggle = document.getElementById('theme-toggle');
const iconLight = document.querySelector('.theme-icon-light');
const iconDark = document.querySelector('.theme-icon-dark');

// Read from localStorage (default to dark if not set)
const currentTheme = localStorage.getItem('theme') || 'dark';

// Apply the theme immediately based on loaded preference
if (currentTheme === 'light') {
  document.body.classList.add('light-mode');
  if (iconLight && iconDark) {
    iconLight.style.display = 'none'; // hide sun, show moon (to switch back to dark)
    iconDark.style.display = 'block';
  }
} else {
  // default is dark mode
  if (iconLight && iconDark) {
    iconLight.style.display = 'block'; // show sun (to switch to light)
    iconDark.style.display = 'none';
  }
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');

    let newTheme = 'dark';
    if (document.body.classList.contains('light-mode')) {
      newTheme = 'light';
      if (iconLight && iconDark) {
        iconLight.style.display = 'none';
        iconDark.style.display = 'block';
      }
    } else {
      if (iconLight && iconDark) {
        iconLight.style.display = 'block';
        iconDark.style.display = 'none';
      }
    }

    // Save to local storage so page reloads persist the theme
    localStorage.setItem('theme', newTheme);
  });
}
