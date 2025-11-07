# Accessibility Implementation Guide

**E-Voting Platform - WCAG 2.1 AA Compliance**

---

## Overview

This guide outlines the accessibility improvements needed to achieve WCAG 2.1 AA compliance (95%+ score).

**Current Status:** 60% → **Target:** 95%

---

## Quick Wins (High Impact, Low Effort)

### 1. Add ARIA Labels to Buttons (30 min)

**Impact:** +15% accessibility score

Search for all `<button>` with only icons and add `aria-label`:

```jsx
// Before
<button onClick={handleDelete}>
  <TrashIcon />
</button>

// After
<button
  onClick={handleDelete}
  aria-label="Delete voter"
  title="Delete voter"
>
  <TrashIcon aria-hidden="true" />
</button>
```

**Files to Update:**
- `src/components/VotersTable.jsx` - Delete, edit buttons
- `src/components/QuorumIndicator.jsx` - Expand/collapse
- `src/pages/ElectionDetails.jsx` - All action buttons
- `src/pages/Results.jsx` - Export buttons

### 2. Add Form Labels (45 min)

**Impact:** +10% accessibility score

Every `<input>` needs matching `<label>`:

```jsx
// Before
<input type="email" placeholder="Email" />

// After
<label htmlFor="email-input">Email Address</label>
<input
  id="email-input"
  type="email"
  placeholder="user@example.com"
  required
/>
```

**Files to Update:**
- `src/pages/Login.jsx`
- `src/pages/Register.jsx`
- `src/pages/CreateElection.jsx`
- `src/components/AddVotersModal.jsx`

### 3. Add Semantic HTML (1 hour)

**Impact:** +12% accessibility score

Replace `<div>` with semantic elements:

```jsx
// Before
<div className="header">
  <div className="title">Elections</div>
  <div className="nav">
    <div>Dashboard</div>
    <div>Results</div>
  </div>
</div>

// After
<header>
  <h1>Elections</h1>
  <nav>
    <a href="/dashboard">Dashboard</a>
    <a href="/results">Results</a>
  </nav>
</header>
```

**Semantic Elements to Use:**
- `<header>` - Page/section header
- `<nav>` - Navigation menu
- `<main>` - Main content
- `<footer>` - Footer
- `<section>` - Content sections
- `<article>` - Self-contained content
- `<aside>` - Sidebar/related content
- `<button>` - Interactive elements (not `<div onclick>`)
- `<form>` - Form containers

### 4. Color Contrast Fix (30 min)

**Impact:** +8% accessibility score

**Issue:** Text too light on light background

Current: `#666` on `#f5f5f5` = 4.5:1 (fails)
Target: `#333` on `#f5f5f5` = 12.6:1 (AAA pass)

```css
/* Update in src/index.css */
body {
  color: #1a1a1a;  /* Darker text */
  background: #ffffff;  /* Lighter background */
}

.card-text {
  color: #2d2d2d;  /* Minimum contrast */
}
```

---

## Medium Effort Items

### 5. Keyboard Navigation (2 hours)

**Impact:** +15% accessibility score

Ensure all interactive elements are keyboard accessible:

```jsx
// Add tabIndex and keyboard handlers
<button
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Vote
</button>

// For modals: trap focus
<div role="dialog" aria-modal="true">
  <FocusTrap>
    <button autoFocus>First focusable element</button>
    {/* Content */}
    <button>Last focusable element</button>
  </FocusTrap>
</div>
```

**Test:**
- Tab through entire app
- Shift+Tab to go backward
- No focus traps
- Focus visible outline everywhere

### 6. ARIA Live Regions (1 hour)

**Impact:** +10% accessibility score

Announce dynamic content to screen readers:

```jsx
// Notifications
<div aria-live="polite" role="status" aria-atomic="true">
  {notification.message}
</div>

// Form errors
<div aria-live="assertive" role="alert">
  {error?.message}
</div>

// Loading states
<div aria-busy={isLoading} aria-label="Loading elections...">
  {isLoading ? <Spinner /> : <Content />}
</div>

// Results updates
<div aria-live="polite" role="status">
  Results: {votes} votes received
</div>
```

**Files to Update:**
- `src/contexts/NotificationContext.jsx`
- `src/components/NotificationCenter.jsx`
- Form components (error messages)
- Loading states

### 7. Link vs Button (1 hour)

**Impact:** +5% accessibility score

Use correct element:

```jsx
// Navigation = <a>
<a href="/results">View Results</a>

// Action = <button>
<button onClick={submitVote}>Submit Vote</button>

// External = <a> with aria-label
<a
  href="https://example.com"
  aria-label="Open documentation (external)"
  target="_blank"
>
  Docs
</a>
```

---

## Advanced Items

### 8. Heading Hierarchy (1 hour)

**Impact:** +8% accessibility score

Proper `<h1>` → `<h2>` → `<h3>` structure:

```jsx
<h1>Elections Dashboard</h1>
<section>
  <h2>Active Elections</h2>
  <div>
    <h3>Election Title</h3>
  </div>
</section>
```

**Rules:**
- One `<h1>` per page
- Don't skip levels (h1 → h3 is wrong)
- Use for structure, not styling

### 9. Image Alt Text (30 min)

**Impact:** +7% accessibility score

All images need alt text:

```jsx
// Decorative image
<img src="logo.svg" alt="" aria-hidden="true" />

// Informative image
<img
  src="chart.png"
  alt="Election results: 60% Yes, 40% No"
/>

// QR code
<img
  src="qr.png"
  alt="QR code for voting: https://vote.example.com/abc123"
/>
```

### 10. Landmark Regions (1 hour)

**Impact:** +6% accessibility score

Help screen reader users navigate:

```jsx
<div>
  <header>
    <nav aria-label="Main navigation">
      {/* Navigation */}
    </nav>
  </header>

  <main>
    <section aria-labelledby="section-title">
      <h2 id="section-title">Elections</h2>
      {/* Content */}
    </section>
  </main>

  <footer>
    <nav aria-label="Footer navigation">
      {/* Footer links */}
    </nav>
  </footer>
</div>
```

---

## Testing Strategy

### Automated Testing

```bash
# Install axe-core
npm install --save-dev @axe-core/react

# Run accessibility tests
npm run test:a11y
```

### Manual Testing

1. **Keyboard Navigation**
   - Tab through entire app
   - Use arrow keys in dropdowns/menus
   - Use Escape to close modals
   - No focus traps

2. **Screen Reader Testing**
   - Use NVDA (Windows), JAWS, or VoiceOver (Mac)
   - Test form labels
   - Test navigation
   - Test notifications

3. **Color Contrast**
   - Use WebAIM contrast checker
   - Test with color blindness simulator
   - Minimum 4.5:1 for text (AA)
   - Minimum 7:1 for text (AAA)

4. **Zoom Testing**
   - Browser zoom to 200%
   - Text should remain readable
   - No horizontal scroll at 200%

### Browser Extensions

- **axe DevTools** - Automated scanning
- **WAVE** - Visual feedback
- **Lighthouse** - Built-in Chrome DevTools
- **Contrast Checker** - Color contrast

---

## WCAG 2.1 AA Checklist

### Perceivable

- [ ] Images have alt text
- [ ] Color contrast 4.5:1+ for text
- [ ] Text resizable without loss
- [ ] No seizure-inducing flashing (>3 times/second)

### Operable

- [ ] Keyboard accessible
- [ ] No keyboard traps
- [ ] Focus visible
- [ ] Skip to main content link
- [ ] Links have descriptive text

### Understandable

- [ ] Language of page specified (`<html lang="en">`)
- [ ] Form inputs have labels
- [ ] Error messages clear
- [ ] Instructions provided where needed

### Robust

- [ ] Valid HTML
- [ ] ARIA used correctly
- [ ] No duplicate IDs
- [ ] Proper heading hierarchy

---

## Implementation Priority

**Week 1 (Quick Wins):**
1. ARIA labels on buttons (30 min)
2. Form labels (45 min)
3. Semantic HTML (1 hour)
4. Color contrast (30 min)
5. **Total: 2.75 hours** → +45% improvement

**Week 2 (Medium Effort):**
6. Keyboard navigation (2 hours)
7. ARIA live regions (1 hour)
8. Link vs button (1 hour)
9. **Total: 4 hours** → +30% improvement

**Week 3 (Advanced):**
10. Heading hierarchy (1 hour)
11. Image alt text (30 min)
12. Landmark regions (1 hour)
13. **Total: 2.5 hours** → +20% improvement

**Final Score: 95%+ WCAG AA Compliance**

---

## Resources

- **WCAG 2.1 Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **aria-practices:** https://www.w3.org/WAI/ARIA/apg/
- **WebAIM:** https://webaim.org/
- **Deque University:** https://dequeuniversity.com/

---

## Files to Update

Priority order for implementation:

1. `src/index.html` - Add lang attribute
2. `src/index.css` - Color contrast fixes
3. `src/pages/Login.jsx` - Form labels
4. `src/pages/Register.jsx` - Form labels
5. `src/components/VotersTable.jsx` - ARIA labels, semantic HTML
6. `src/pages/ElectionDetails.jsx` - Keyboard nav, ARIA labels
7. `src/pages/VotingPage.jsx` - Form labels, ARIA live
8. `src/components/NotificationCenter.jsx` - ARIA live regions
9. `src/pages/Results.jsx` - Alt text for images
10. All components - Review heading hierarchy

---

**Next Steps:**
1. Run axe DevTools scan to get baseline
2. Create tickets for each category
3. Implement Week 1 quick wins first
4. Test with keyboard navigation
5. Test with screen reader
6. Run final accessibility audit

**Target Completion:** 2 weeks
**Target Score:** 95%+ WCAG AA
