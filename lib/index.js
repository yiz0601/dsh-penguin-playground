// Host half of dsh-penguin-playground: intentionally minimal.
// The real work lives in lib/client.js (the web client bundle). This empty
// plugin exists so the profile Loader mounts a fiber for the package — the
// client-modules scanner only publishes /plugins/<id>/client.js for entries
// that actually loaded.
export default {
  name: 'dsh-penguin-playground',
  apply() {},
}
