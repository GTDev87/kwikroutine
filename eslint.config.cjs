const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expo,
  { ignores: ['src/vendor/**', 'ios/**', 'android/**', '.expo/**', 'dist/**'] },
]);
