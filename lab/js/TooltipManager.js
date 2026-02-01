/**
 * TooltipManager - Manages interactive, lockable tooltips for medical data
 * Supports practitioner info cards and health term definitions
 */
export class TooltipManager {
  constructor() {
    this.tooltips = new Map();
    this.nextId = 1;
    this.setupGlobalClickHandler();
  }

  setupGlobalClickHandler() {
    document.addEventListener('click', (e) => {
      // Close unlocked tooltips when clicking outside
      if (!e.target.closest('.tooltip') &&
          !e.target.closest('.clickable-practitioner') &&
          !e.target.closest('.clickable-health')) {
        this.closeUnlocked();
      }
    });
  }

  create(title, content, position, locked = false) {
    const id = `tooltip-${this.nextId++}`;

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip' + (locked ? ' locked' : '');
    tooltip.id = id;
    tooltip.innerHTML = `
      <div class="tooltip-header">
        <span class="tooltip-title">${title}</span>
        <div class="tooltip-actions">
          <button class="tooltip-btn" onclick="window.tooltipManager.toggle('${id}')" title="${locked ? 'Lås opp' : 'Lås'}">
            ${locked ? '🔓' : '🔒'}
          </button>
          <button class="tooltip-btn" onclick="window.tooltipManager.close('${id}')" title="Lukk">✕</button>
        </div>
      </div>
      <div class="tooltip-content">${content}</div>
    `;

    // Position tooltip
    tooltip.style.left = position.x + 'px';
    tooltip.style.top = position.y + 'px';

    document.body.appendChild(tooltip);

    // Adjust position if off-screen
    const rect = tooltip.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      tooltip.style.left = (window.innerWidth - rect.width - 20) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      tooltip.style.top = (window.innerHeight - rect.height - 20) + 'px';
    }
    if (rect.left < 0) {
      tooltip.style.left = '20px';
    }
    if (rect.top < 0) {
      tooltip.style.top = '20px';
    }

    this.tooltips.set(id, { element: tooltip, locked });
    return id;
  }

  toggle(id) {
    const tooltip = this.tooltips.get(id);
    if (!tooltip) return;

    tooltip.locked = !tooltip.locked;
    tooltip.element.classList.toggle('locked', tooltip.locked);

    // Update button
    const btn = tooltip.element.querySelector('.tooltip-btn');
    btn.innerHTML = tooltip.locked ? '🔓' : '🔒';
    btn.title = tooltip.locked ? 'Lås opp' : 'Lås';
  }

  close(id) {
    const tooltip = this.tooltips.get(id);
    if (!tooltip) return;

    tooltip.element.remove();
    this.tooltips.delete(id);
  }

  closeUnlocked() {
    this.tooltips.forEach((tooltip, id) => {
      if (!tooltip.locked) {
        this.close(id);
      }
    });
  }

  closeAll() {
    this.tooltips.forEach((tooltip, id) => {
      this.close(id);
    });
  }
}
