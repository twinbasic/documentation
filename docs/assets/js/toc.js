/**
 * Just the Docs - In-page Table of Contents Generator
 * Generates a floating TOC based on page headings (H1-H4)
 */

(function() {
  'use strict';

  // Configuration
  const config = {
    minLevel: 2,      // Minimum heading level to include (h2)
    maxLevel: 4,      // Maximum heading level to include (h4)
    containerId: 'page-toc',
    containerClass: 'page-toc',
    headingClass: 'page-toc-heading',
    listClass: 'page-toc-list',
    itemClass: 'page-toc-item',
    linkClass: 'page-toc-link',
    activeClass: 'active'
  };

  // Create TOC container
  function createTOCContainer() {
    const container = document.createElement('div');
    container.id = config.containerId;
    container.className = config.containerClass;
    return container;
  }

  // Generate TOC from headings
  function generateTOC() {
    const content = document.querySelector('.main-content');
    if (!content) return null;

    const headings = content.querySelectorAll('h2, h3, h4');
    if (headings.length < 2) return null;

    const container = createTOCContainer();
    
    // Add heading
    const heading = document.createElement('div');
    heading.className = config.headingClass;
    heading.textContent = 'On this page';
    container.appendChild(heading);

    // Create list
    const list = document.createElement('ul');
    list.className = config.listClass;

    let currentList = list;
    let lastLevel = config.minLevel;
    const listStack = [list];

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));

      if (level < config.minLevel || level > config.maxLevel) return;

      // Ensure heading has an ID for linking
      if (!heading.id) {
        heading.id = heading.textContent
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w\-]/g, '')
          .replace(/\-+/g, '-')
          .replace(/^-+|-+$/g, '') + '-' + index;
      }

      // Handle nested lists
      if (level > lastLevel) {
        const subList = document.createElement('ul');
        subList.className = config.listClass;
        const lastItem = currentList.lastElementChild;
        if (lastItem) {
          lastItem.appendChild(subList);
          currentList = subList;
          listStack.push(subList);
        }
      } else if (level < lastLevel) {
        while (listStack.length > 1) {
          listStack.pop();
          currentList = listStack[listStack.length - 1];
          const stackTopLevel = getCurrentListLevel(currentList);
          if (stackTopLevel <= level) break;
        }
      }

      // Create list item
      const item = document.createElement('li');
      item.className = config.itemClass;
      item.style.paddingLeft = ((level - config.minLevel) * 12) + 'px';

      const link = document.createElement('a');
      link.className = config.linkClass;
      link.href = '#' + heading.id;
      link.textContent = heading.textContent;
      link.dataset.target = heading.id;

      item.appendChild(link);
      currentList.appendChild(item);
      lastLevel = level;
    });

    container.appendChild(list);
    return container;
  }

  function getCurrentListLevel(list) {
    let level = config.minLevel;
    let parent = list.parentElement;
    while (parent && parent.tagName !== 'DIV') {
      if (parent.tagName === 'UL') level++;
      parent = parent.parentElement;
    }
    return level;
  }

  // Insert TOC into page
  function insertTOC(toc) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    // Insert after the first h1
    const firstH1 = mainContent.querySelector('h1');
    if (firstH1) {
      firstH1.parentNode.insertBefore(toc, firstH1.nextSibling);
    } else {
      mainContent.insertBefore(toc, mainContent.firstChild);
    }
  }

  // Highlight active heading on scroll
  function setupScrollSpy() {
    const headings = document.querySelectorAll('.main-content h2, .main-content h3, .main-content h4');
    const tocLinks = document.querySelectorAll(`.${config.linkClass}`);

    if (tocLinks.length === 0) return;

    const observerOptions = {
      rootMargin: '-100px 0px -66%',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          tocLinks.forEach(link => {
            link.classList.remove(config.activeClass);
            if (link.dataset.target === id) {
              link.classList.add(config.activeClass);
            }
          });
        }
      });
    }, observerOptions);

    headings.forEach(heading => observer.observe(heading));
  }

  // Initialize
  function init() {
    const toc = generateTOC();
    if (toc) {
      insertTOC(toc);
      setupScrollSpy();
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
