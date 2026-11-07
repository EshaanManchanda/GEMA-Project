// uuid >= 12 is ESM-only; Jest runs CommonJS.
module.exports = { v4: () => require('crypto').randomUUID() };
