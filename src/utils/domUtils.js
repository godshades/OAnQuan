// src/utils/domUtils.js

/**
 * Gets the center coordinates of a DOM element.
 * @param {HTMLElement | null} element
 * @returns {{x: number, y: number} | null} Center coordinates relative to the viewport, or null if element is not found.
 */
export function getElementCenter(element) {
    if (!element) {
      console.warn("getElementCenter: Element is null or undefined.");
      return null;
    }
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }
  
  /**
   * Gets the DOM element by its ID.
   * @param {string} id
   * @returns {HTMLElement | null} The element, or null if not found.
   */
  export function getElementById(id) {
      const element = document.getElementById(id);
      if (!element) {
          console.warn(`getElementById: Element with ID "${id}" not found.`);
      }
      return element;
  }