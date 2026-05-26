'use strict';
// Testcontainers' Ryuk daemon handles container cleanup automatically on process exit.
// Explicit teardown left empty; add manual stop here if Ryuk is disabled in your environment.
module.exports = async function globalTeardown() {};
