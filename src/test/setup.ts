// Vitest setup file for jsdom environment.
// jsdom does not implement IndexedDB, so we install a shim for the
// recipient-store tests that exercise IndexedDB persistence.
import 'fake-indexeddb/auto';
