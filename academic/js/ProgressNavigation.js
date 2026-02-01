/**
 * ProgressNavigation - Scroll-aware progress indicator and section navigation
 * Shows a vertical progress bar and section links that highlight as you scroll
 */
export class ProgressNavigation {
  constructor() {
    this.sections = document.querySelectorAll('section[id]');
    this.progressIndicator = document.getElementById('progress-indicator');
    this.progressNav = document.getElementById('progress-nav');
    this.navLinks = document.querySelectorAll('.progress-sections a');
    this.heroSection = document.querySelector('.hero');
    this.init();
  }

  init() {
    window.addEventListener('scroll', () => this.updateProgress());
    this.updateProgress();

    // Smooth scroll for nav links
    this.navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const target = document.querySelector(targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;

    // Show/hide progress nav based on scroll past hero
    if (this.heroSection) {
      const heroBottom = this.heroSection.getBoundingClientRect().bottom;
      if (heroBottom < 0) {
        this.progressNav.classList.add('visible');
      } else {
        this.progressNav.classList.remove('visible');
      }
    }

    // Update indicator position
    this.progressIndicator.style.top = scrollPercent + '%';

    // Highlight current section
    let currentSection = null;
    this.sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= 100 && rect.bottom >= 100) {
        currentSection = section.id;
      }
    });

    // Update active link
    this.navLinks.forEach(link => {
      const href = link.getAttribute('href').substring(1);
      if (href === currentSection) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
}
