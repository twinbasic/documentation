/**
 * Search Modal - VitePress style search overlay
 * Moves original Just the Docs search component into modal
 */

(function() {
  'use strict';

  let modal = null;
  let modalOverlay = null;
  let originalSearchContainer = null;
  let isOpen = false;

  // Create modal HTML structure
  function createModal() {
    // Overlay
    modalOverlay = document.createElement('div');
    modalOverlay.className = 'search-modal-overlay';
    modalOverlay.setAttribute('aria-hidden', 'true');

    // Modal container
    modal = document.createElement('div');
    modal.className = 'search-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Search');

    // Close button
    const closeButton = document.createElement('button');
    closeButton.className = 'search-modal-close';
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`;
    closeButton.addEventListener('click', closeModal);

    // Assemble modal
    modal.appendChild(closeButton);

    // Add to document
    document.body.appendChild(modalOverlay);
    document.body.appendChild(modal);

    // Event listeners
    modalOverlay.addEventListener('click', closeModal);
    document.addEventListener('keydown', handleGlobalKeydown);
  }

  // Move original search component to modal
  function moveSearchToModal() {
    const mainHeader = document.querySelector('#main-header');
    if (!mainHeader) return false;

    originalSearchContainer = mainHeader.querySelector('.search');
    if (!originalSearchContainer) return false;

    // Move search container to modal
    modal.appendChild(originalSearchContainer);

    // Update input placeholder
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.placeholder = 'Search twinBASIC Documentation';
    }

    // Force reflow to ensure styles apply
    void modal.offsetHeight;

    console.log('Search moved to modal, modal children:', modal.children.length);

    return true;
  }

  // Open modal
  function openModal() {
    // Ensure modal exists
    if (!modal) {
      createModal();
    }

    // Move search component to modal if not done
    if (!modal.querySelector('.search')) {
      if (!moveSearchToModal()) {
        // Wait for search to be ready
        const checkInterval = setInterval(() => {
          if (moveSearchToModal()) {
            clearInterval(checkInterval);
            openModalNow();
          }
        }, 200);

        // Timeout after 3 seconds
        setTimeout(() => clearInterval(checkInterval), 3000);
        return;
      }
    }

    openModalNow();
  }

  function openModalNow() {
    if (!modal || !modalOverlay) {
      console.error('Modal or overlay not found!');
      return;
    }

    isOpen = true;
    modalOverlay.classList.add('active');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Focus on search input
    setTimeout(() => {
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.focus();
      }
    }, 100);
  }

  // Close modal
  function closeModal() {
    if (!modal) return;

    isOpen = false;
    modalOverlay.classList.remove('active');
    modal.classList.remove('active');
    document.body.style.overflow = '';

    // Clear search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.value = '';
      const keyupEvent = new KeyboardEvent('keyup', {
        bubbles: true,
        cancelable: true,
        keyCode: 65,
        key: ''
      });
      searchInput.dispatchEvent(keyupEvent);
    }
  }

  // Handle global keyboard events
  function handleGlobalKeydown(e) {
    // Cmd/Ctrl + K to open search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (isOpen) {
        closeModal();
      } else {
        openModal();
      }
    }

    // Escape to close
    if (e.key === 'Escape' && isOpen) {
      closeModal();
    }
  }

  // Create search button in header
  function createSearchButton() {
    const mainHeader = document.querySelector('#main-header');
    if (!mainHeader) {
      setTimeout(createSearchButton, 200);
      return;
    }

    // Check if button already exists
    if (document.querySelector('.search-modal-trigger')) {
      return;
    }

    // Find original search container
    const searchContainer = mainHeader.querySelector('.search');
    if (!searchContainer) {
      setTimeout(createSearchButton, 200);
      return;
    }

    // Find nav element
    const nav = mainHeader.querySelector('nav');
    if (!nav) {
      setTimeout(createSearchButton, 200);
      return;
    }

    // Create search button wrapper
    const buttonWrapper = document.createElement('div');
    buttonWrapper.className = 'search-modal-trigger-wrapper';

    // Create search button
    const searchButton = document.createElement('button');
    searchButton.className = 'search-modal-trigger';
    searchButton.setAttribute('aria-label', 'Search');
    searchButton.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>`;

    // Add keyboard shortcut hint
    const shortcut = document.createElement('span');
    shortcut.className = 'search-modal-shortcut';
    shortcut.textContent = '⌘K';
    searchButton.appendChild(shortcut);

    searchButton.addEventListener('click', openModal);
    buttonWrapper.appendChild(searchButton);

    // Insert button wrapper after nav
    nav.parentNode.insertBefore(buttonWrapper, nav.nextSibling);
  }

  // Initialize
  function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(createSearchButton, 100);
      });
    } else {
      setTimeout(createSearchButton, 100);
    }
  }

  init();

})();
