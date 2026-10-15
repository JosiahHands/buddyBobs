// Runs before every test file: adds DOM matchers like toBeInTheDocument()
import '@testing-library/jest-dom/jest-globals'

// jsdom has <dialog> but not its methods; these mimic what browsers do
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    if (!this.open) return
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}
