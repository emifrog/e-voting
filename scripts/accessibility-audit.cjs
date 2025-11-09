/**
 * Accessibility Audit Script
 * Runs axe-core accessibility tests on all pages
 */

const { AxePuppeteer } = require('@axe-core/puppeteer');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Pages to audit
const PAGES_TO_AUDIT = [
  { name: 'Login', url: '/login' },
  { name: 'Register', url: '/register' },
  { name: 'Dashboard', url: '/dashboard', requiresAuth: true },
  { name: 'CreateElection', url: '/create-election', requiresAuth: true },
  { name: 'ElectionDetails', url: '/election/1', requiresAuth: true },
  { name: 'VotingPage', url: '/vote/1', requiresAuth: true },
  { name: 'Results', url: '/results/1', requiresAuth: true },
  { name: 'Security', url: '/security', requiresAuth: true },
];

// WCAG 2.1 AA configuration
const AXE_OPTIONS = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
  }
};

// Violation severity levels
const SEVERITY_WEIGHTS = {
  critical: 10,
  serious: 7,
  moderate: 3,
  minor: 1
};

async function login(page) {
  console.log('  → Logging in for authenticated pages...');

  await page.goto('http://localhost:5173/login', {
    waitUntil: 'networkidle0'
  });

  await page.type('input[type="email"]', 'admin@example.com');
  await page.type('input[type="password"]', 'AdminPassword123!');
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  console.log('  ✓ Logged in successfully');
}

async function auditPage(browser, pageConfig, isAuthenticated) {
  console.log(`\n📄 Auditing: ${pageConfig.name}`);
  console.log(`   URL: ${pageConfig.url}`);

  const page = await browser.newPage();

  try {
    // Login if needed
    if (pageConfig.requiresAuth && !isAuthenticated) {
      await login(page);
      isAuthenticated = true;
    }

    // Navigate to page
    await page.goto(`http://localhost:5173${pageConfig.url}`, {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    console.log('  → Running axe-core audit...');

    // Run axe audit
    const results = await new AxePuppeteer(page)
      .options(AXE_OPTIONS)
      .analyze();

    // Calculate score
    const violationScore = results.violations.reduce((sum, violation) => {
      return sum + (SEVERITY_WEIGHTS[violation.impact] || 0) * violation.nodes.length;
    }, 0);

    const maxScore = 100;
    const score = Math.max(0, maxScore - violationScore);

    console.log(`  ✓ Audit complete`);
    console.log(`  📊 Score: ${score}/100`);
    console.log(`  ⚠️  Violations: ${results.violations.length}`);
    console.log(`  ✓ Passes: ${results.passes.length}`);

    return {
      page: pageConfig.name,
      url: pageConfig.url,
      timestamp: new Date().toISOString(),
      score,
      violations: results.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.length,
        targets: v.nodes.map(n => n.target).slice(0, 3) // First 3 targets
      })),
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      inapplicable: results.inapplicable.length
    };

  } catch (error) {
    console.error(`  ❌ Error auditing ${pageConfig.name}:`, error.message);
    return {
      page: pageConfig.name,
      url: pageConfig.url,
      timestamp: new Date().toISOString(),
      error: error.message,
      score: 0,
      violations: []
    };
  } finally {
    await page.close();
  }
}

async function generateReport(results) {
  console.log('\n📊 Generating Report...\n');

  const totalViolations = results.reduce((sum, r) => sum + (r.violations?.length || 0), 0);
  const avgScore = Math.round(
    results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length
  );

  // Group violations by impact
  const violationsByImpact = {
    critical: [],
    serious: [],
    moderate: [],
    minor: []
  };

  results.forEach(result => {
    if (result.violations) {
      result.violations.forEach(violation => {
        violationsByImpact[violation.impact]?.push({
          page: result.page,
          ...violation
        });
      });
    }
  });

  // Console report
  console.log('═══════════════════════════════════════════════════════════');
  console.log('           ACCESSIBILITY AUDIT REPORT');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`📊 Overall Score: ${avgScore}/100`);
  console.log(`📄 Pages Audited: ${results.length}`);
  console.log(`⚠️  Total Violations: ${totalViolations}\n`);

  console.log('Violations by Severity:');
  console.log(`  🔴 Critical: ${violationsByImpact.critical.length}`);
  console.log(`  🟠 Serious:  ${violationsByImpact.serious.length}`);
  console.log(`  🟡 Moderate: ${violationsByImpact.moderate.length}`);
  console.log(`  🟢 Minor:    ${violationsByImpact.minor.length}\n`);

  console.log('Page Scores:');
  results.forEach(result => {
    const emoji = result.score >= 90 ? '✅' : result.score >= 70 ? '⚠️' : '❌';
    console.log(`  ${emoji} ${result.page.padEnd(20)} ${result.score}/100 (${result.violations?.length || 0} violations)`);
  });

  // Top violations
  console.log('\n🔴 Critical Issues:');
  violationsByImpact.critical.slice(0, 5).forEach((v, i) => {
    console.log(`  ${i + 1}. [${v.page}] ${v.help}`);
    console.log(`     ${v.helpUrl}`);
  });

  console.log('\n🟠 Serious Issues:');
  violationsByImpact.serious.slice(0, 5).forEach((v, i) => {
    console.log(`  ${i + 1}. [${v.page}] ${v.help}`);
    console.log(`     ${v.helpUrl}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════\n');

  // Save JSON report
  const reportDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, `accessibility-audit-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: {
      timestamp: new Date().toISOString(),
      totalPages: results.length,
      avgScore,
      totalViolations,
      violationsByImpact: {
        critical: violationsByImpact.critical.length,
        serious: violationsByImpact.serious.length,
        moderate: violationsByImpact.moderate.length,
        minor: violationsByImpact.minor.length
      }
    },
    results,
    violationsByImpact
  }, null, 2));

  console.log(`📄 Full report saved to: ${reportPath}\n`);

  return {
    avgScore,
    totalViolations,
    violationsByImpact
  };
}

async function runAudit() {
  console.log('\n🔍 Starting Accessibility Audit...\n');
  console.log('WCAG 2.1 AA Compliance Check');
  console.log('════════════════════════════════════════════════════════════\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let isAuthenticated = false;
  const results = [];

  try {
    for (const pageConfig of PAGES_TO_AUDIT) {
      const result = await auditPage(browser, pageConfig, isAuthenticated);
      results.push(result);

      if (pageConfig.requiresAuth && !isAuthenticated) {
        isAuthenticated = true;
      }
    }

    await generateReport(results);

  } catch (error) {
    console.error('❌ Audit failed:', error);
  } finally {
    await browser.close();
  }

  // Return exit code based on critical issues
  const criticalIssues = results.reduce((sum, r) => {
    return sum + (r.violations?.filter(v => v.impact === 'critical').length || 0);
  }, 0);

  if (criticalIssues > 0) {
    console.log(`\n❌ ${criticalIssues} critical accessibility issues found!\n`);
    process.exit(1);
  } else {
    console.log('\n✅ No critical accessibility issues found!\n');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  runAudit().catch(console.error);
}

module.exports = { runAudit };
