// Card Flip Interaction for Multi-Project Cards
// Handles flipping cards to show sub-project menus
// Supports nested subcategory drill-down

export class CardFlip {
  constructor(containerSelector) {
    this.containers = document.querySelectorAll(containerSelector);
    this.init();
  }

  init() {
    this.containers.forEach(container => {
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
      // Handle subcategory links
      backCard.querySelectorAll('[data-has-subcategories]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const subcategoryId = link.dataset.subcategory;
          const subcategoryMenu = backCard.querySelector(`.subcategory-menu[data-subcategory-id="${subcategoryId}"]`);
          if (subcategoryMenu) {
            this.showSubcategories(backCard, subcategoryMenu);
          }
        });
      });

      // Handle subcategory back buttons
      backCard.querySelectorAll('.subcategory-back').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.hideSubcategories(backCard);
        });
      });

      backCard.addEventListener('click', (e) => {
        // Don't flip back if clicking on a link (let it navigate)
        const clickedLink = e.target.closest('.subproject-menu a:not([data-has-subcategories])');
        if (clickedLink) return;

        const clickedSubLink = e.target.closest('.subcategory-menu a');
        if (clickedSubLink) return;

        // Don't flip back if clicking subcategory-related elements
        if (e.target.closest('[data-has-subcategories]')) return;
        if (e.target.closest('.subcategory-menu')) return;
        if (e.target.closest('.subcategory-back')) return;

        e.preventDefault();
        e.stopPropagation();
        this.hideSubcategories(backCard);
        this.unflip(container);
      });
    }

    if (backButton) {
      backButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hideSubcategories(backCard);
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

  showSubcategories(backCard, subcategoryMenu) {
    // Hide main menu
    const mainMenu = backCard.querySelector('.subproject-menu');
    const mainTitle = backCard.querySelector(':scope > h3');
    const flipBack = backCard.querySelector('.flip-back');
    if (mainMenu) mainMenu.hidden = true;
    if (mainTitle) mainTitle.hidden = true;
    if (flipBack) flipBack.hidden = true;

    // Show subcategory menu
    subcategoryMenu.hidden = false;
  }

  hideSubcategories(backCard) {
    // Hide all subcategory menus
    backCard.querySelectorAll('.subcategory-menu').forEach(menu => {
      menu.hidden = true;
    });

    // Show main menu
    const mainMenu = backCard.querySelector('.subproject-menu');
    const mainTitle = backCard.querySelector(':scope > h3');
    const flipBack = backCard.querySelector('.flip-back');
    if (mainMenu) mainMenu.hidden = false;
    if (mainTitle) mainTitle.hidden = false;
    if (flipBack) flipBack.hidden = false;
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new CardFlip('.app-card-container');
});
