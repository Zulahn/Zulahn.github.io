/**
 * Portfolio Main - Initializes all portfolio page components
 */
import { DefinitionTooltips } from './DefinitionTooltips.js';
import { ProgressNavigation } from './ProgressNavigation.js';

function initPortfolio() {
  new DefinitionTooltips();

  // Only initialize ProgressNavigation if the nav element exists
  if (document.getElementById('progress-nav')) {
    new ProgressNavigation();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPortfolio);
} else {
  initPortfolio();
}
