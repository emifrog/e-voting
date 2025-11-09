/**
 * Color Contrast Checker
 * Verifies WCAG 2.1 AA color contrast ratios (4.5:1 for normal text, 3:1 for large text)
 */

const fs = require('fs');
const path = require('path');

// WCAG 2.1 AA Requirements
const WCAG_AA_NORMAL = 4.5;  // For normal text (< 18pt or < 14pt bold)
const WCAG_AA_LARGE = 3.0;   // For large text (>= 18pt or >= 14pt bold)

// Common color combinations in the app
const COLOR_COMBINATIONS = [
  // Primary colors
  { name: 'Primary button text', fg: '#ffffff', bg: '#2563eb', type: 'normal', location: 'btn-primary' },
  { name: 'Secondary button text', fg: '#374151', bg: '#f3f4f6', type: 'normal', location: 'btn-secondary' },
  { name: 'Danger button text', fg: '#ffffff', bg: '#dc2626', type: 'normal', location: 'btn-danger' },
  { name: 'Success button text', fg: '#ffffff', bg: '#10b981', type: 'normal', location: 'btn-success' },

  // Text colors
  { name: 'Primary text on white', fg: '#000000', bg: '#ffffff', type: 'normal', location: 'body text' },
  { name: 'Secondary text on white', fg: '#6b7280', bg: '#ffffff', type: 'normal', location: 'secondary text' },
  { name: 'Gray text on white', fg: '#9ca3af', bg: '#ffffff', type: 'normal', location: 'muted text' },

  // Alerts
  { name: 'Error alert text', fg: '#dc2626', bg: '#fef2f2', type: 'normal', location: 'alert-error' },
  { name: 'Success alert text', fg: '#10b981', bg: '#ecfdf5', type: 'normal', location: 'alert-success' },
  { name: 'Warning alert text', fg: '#f59e0b', bg: '#fef3c7', type: 'normal', location: 'alert-warning' },
  { name: 'Info alert text', fg: '#2563eb', bg: '#eff6ff', type: 'normal', location: 'alert-info' },

  // Links
  { name: 'Link on white', fg: '#2563eb', bg: '#ffffff', type: 'normal', location: 'links' },
  { name: 'Link hover', fg: '#1d4ed8', bg: '#ffffff', type: 'normal', location: 'links:hover' },

  // Form elements
  { name: 'Input text', fg: '#000000', bg: '#ffffff', type: 'normal', location: 'input' },
  { name: 'Input placeholder', fg: '#9ca3af', bg: '#ffffff', type: 'normal', location: 'input::placeholder' },
  { name: 'Input border', fg: '#d1d5db', bg: '#ffffff', type: 'large', location: 'input border' },

  // Badges
  { name: 'Badge active', fg: '#ffffff', bg: '#10b981', type: 'normal', location: 'badge-active' },
  { name: 'Badge pending', fg: '#ffffff', bg: '#f59e0b', type: 'normal', location: 'badge-pending' },
  { name: 'Badge completed', fg: '#ffffff', bg: '#2563eb', type: 'normal', location: 'badge-completed' },

  // Dark mode (optional)
  { name: 'Dark mode text', fg: '#f9fafb', bg: '#1f2937', type: 'normal', location: 'dark mode body' },
  { name: 'Dark mode secondary', fg: '#d1d5db', bg: '#1f2937', type: 'normal', location: 'dark mode secondary' },
];

// Convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Calculate relative luminance
function getLuminance(rgb) {
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio
function getContrastRatio(fg, bg) {
  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);

  if (!fgRgb || !bgRgb) return 0;

  const l1 = getLuminance(fgRgb);
  const l2 = getLuminance(bgRgb);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// Check if contrast meets WCAG requirements
function meetsWCAG(ratio, type) {
  const requirement = type === 'large' ? WCAG_AA_LARGE : WCAG_AA_NORMAL;
  return {
    passes: ratio >= requirement,
    ratio,
    requirement
  };
}

function checkColorContrast() {
  console.log('\n🎨 Color Contrast Checker\n');
  console.log('WCAG 2.1 AA Requirements:');
  console.log(`  • Normal text: ${WCAG_AA_NORMAL}:1`);
  console.log(`  • Large text:  ${WCAG_AA_LARGE}:1\n`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const results = [];
  let passCount = 0;
  let failCount = 0;

  COLOR_COMBINATIONS.forEach(combo => {
    const ratio = getContrastRatio(combo.fg, combo.bg);
    const check = meetsWCAG(ratio, combo.type);

    results.push({
      ...combo,
      ratio: ratio.toFixed(2),
      passes: check.passes,
      requirement: check.requirement
    });

    const emoji = check.passes ? '✅' : '❌';
    const status = check.passes ? 'PASS' : 'FAIL';

    if (check.passes) {
      passCount++;
    } else {
      failCount++;
    }

    console.log(`${emoji} ${status} - ${combo.name}`);
    console.log(`   FG: ${combo.fg}  BG: ${combo.bg}`);
    console.log(`   Ratio: ${ratio.toFixed(2)}:1  (Required: ${check.requirement}:1)`);
    console.log(`   Location: ${combo.location}\n`);
  });

  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`✅ Passing: ${passCount}`);
  console.log(`❌ Failing: ${failCount}`);
  console.log(`📊 Pass Rate: ${Math.round((passCount / (passCount + failCount)) * 100)}%\n`);

  // Save report
  const reportDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, `color-contrast-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: passCount + failCount,
      passing: passCount,
      failing: failCount,
      passRate: Math.round((passCount / (passCount + failCount)) * 100)
    },
    wcagRequirements: {
      normalText: WCAG_AA_NORMAL,
      largeText: WCAG_AA_LARGE
    },
    results
  }, null, 2));

  console.log(`📄 Report saved to: ${reportPath}\n`);

  // Recommendations for failing combinations
  if (failCount > 0) {
    console.log('💡 Recommendations:\n');
    results.filter(r => !r.passes).forEach(r => {
      console.log(`   ${r.name}:`);

      // Suggest darker foreground or lighter background
      if (r.ratio < r.requirement) {
        console.log(`   → Increase contrast between ${r.fg} and ${r.bg}`);
        console.log(`   → Consider darker foreground or lighter/darker background\n`);
      }
    });
  }

  return {
    passCount,
    failCount,
    results
  };
}

// Run if called directly
if (require.main === module) {
  const { passCount, failCount } = checkColorContrast();

  if (failCount > 0) {
    console.log(`\n❌ ${failCount} color combinations do not meet WCAG 2.1 AA!\n`);
    process.exit(1);
  } else {
    console.log('\n✅ All color combinations meet WCAG 2.1 AA!\n');
    process.exit(0);
  }
}

module.exports = { checkColorContrast, getContrastRatio, meetsWCAG };
