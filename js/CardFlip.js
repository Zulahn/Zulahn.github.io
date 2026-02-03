// Card Flip Interaction for Multi-Project Cards
// Handles flipping cards to show sub-project menus

export class CardFlip {
  constructor(containerSelector) {
    this.containers = document.querySelectorAll(containerSelector);
    this.init();
  }

  init() {
    this.containers.forEach(container => {
      // Only initialize if card has multiple sub-projects
      if (container.dataset.subprojects === 'multiple') {
        this.setupFlip(container);
      }
    });
  }

  setupFlip(container) {
    const flipTrigger = container.querySelector('.app-card-front');
    const backCard = container.querySelector('.app-card-back');
    const backButton = container.querySelector('.flip-back');

    if (flipTrigger) {
      flipTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        this.flip(container);
      });
    }

    if (backCard) {
      backCard.addEventListener('click', (e) => {
        // Don't flip back if clicking on a link (let it navigate)
        const clickedLink = e.target.closest('.subproject-menu a');
        if (clickedLink) {
          return; // Allow link navigation
        }

        // Flip back for any other click on the back card
        e.preventDefault();
        e.stopPropagation();
        this.unflip(container);
      });
    }

    if (backButton) {
      backButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.unflip(container);
      });
    }
  }

  flip(container) {
    container.classList.add('flipped');
  }

  unflip(container) {
    container.classList.remove('flipped');
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new CardFlip('.app-card-container');
});
