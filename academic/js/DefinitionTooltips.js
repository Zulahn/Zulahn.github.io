/**
 * DefinitionTooltips - Interactive tooltip system for term definitions
 * Shows tooltips on hover (desktop) or tap (mobile) for elements with .term class
 */
export class DefinitionTooltips {
  constructor() {
    this.activeTooltip = null;
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.init();
  }

  init() {
    const terms = document.querySelectorAll('.term');
    terms.forEach(term => {
      if (this.isTouchDevice) {
        term.addEventListener('click', (e) => this.handleTap(e, term));
      } else {
        term.addEventListener('mouseenter', (e) => this.showTooltip(e, term));
        term.addEventListener('mouseleave', () => this.hideTooltip());
      }
    });

    // Close tooltip when clicking elsewhere on touch devices
    if (this.isTouchDevice) {
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.term') && this.activeTooltip) {
          this.hideTooltip();
        }
      });
    }
  }

  handleTap(e, term) {
    e.stopPropagation();
    if (this.activeTooltip && this.activeTooltip.term === term) {
      this.hideTooltip();
    } else {
      this.showTooltip(e, term);
    }
  }

  showTooltip(e, term) {
    const content = term.getAttribute('data-tooltip');
    if (!content) return;

    // Remove existing tooltip
    if (this.activeTooltip) {
      this.hideTooltip();
    }

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'definition-tooltip';
    tooltip.textContent = content;
    document.body.appendChild(tooltip);

    // Position tooltip
    const rect = term.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let top = rect.bottom + 8;

    // Keep tooltip within viewport
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }

    // If tooltip would go below viewport, show above term instead
    if (top + tooltipRect.height > window.innerHeight - 10) {
      top = rect.top - tooltipRect.height - 8;
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + window.scrollY + 'px';

    // Fade in
    setTimeout(() => tooltip.classList.add('show'), 10);

    this.activeTooltip = { element: tooltip, term };
  }

  hideTooltip() {
    if (this.activeTooltip) {
      this.activeTooltip.element.classList.remove('show');
      setTimeout(() => {
        if (this.activeTooltip) {
          this.activeTooltip.element.remove();
          this.activeTooltip = null;
        }
      }, 200);
    }
  }
}
