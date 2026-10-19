// =======================================================================
// Pomomo Creator & Support Links Configuration
// 
// You can replace these placeholder URLs with your actual links anytime!
// They will automatically update across the entire app.
// =======================================================================

const CREATOR_CONFIG = {
  // Your Ko-fi or Buy Me a Coffee page
  kofi: 'https://ko-fi.com/yourname',

  // Your Patreon or GitHub Sponsors page
  patreon: 'https://patreon.com/yourname',

  // Your personal website, portfolio, or project repository
  website: 'https://github.com/yourname/pomomo',
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CREATOR_CONFIG;
}
if (typeof window !== 'undefined') {
  window.CREATOR_CONFIG = CREATOR_CONFIG;
}
