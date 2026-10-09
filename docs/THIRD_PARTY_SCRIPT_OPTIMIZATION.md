# Third-Party Script Optimization

**Task Reference:** Phase 3, Sprint 11, Task 42

**Last Updated:** 2026-10-07

## Overview

This document audits third-party scripts in the application and identifies optimization opportunities.

## Audit Findings

### index.html Analysis

**File:** `index.html`

**Scripts Found:**

| Script | Type | Loading | Blocking | Priority |
|--------|------|---------|----------|----------|
| Structured Data (JSON-LD) | Inline | None | ❌ No | High (SEO) |
| Main Module (`/client/src/main.tsx`) | Module | Deferred | ❌ No | High (Critical) |

### Current State

**No Third-Party Scripts Found:**

- ❌ No Google Analytics
- ❌ No Facebook Pixel
- ❌ No Hotjar
- ❌ No Google Tag Manager
- ❌ No Intercom
- ❌ No Segment
- ❌ No other analytics/tracking scripts

**Existing Scripts:**

1. **Structured Data (JSON-LD)** - Inline, critical for SEO
2. **Main Module Script** - Module type, automatically deferred

## Audit Results

### ✅ Strengths

1. **No Third-Party Tracking Scripts** - No privacy-invasive tracking
2. **No Render-Blocking Scripts** - All scripts are non-blocking
3. **Module Script Deferred** - Main script is automatically deferred
4. **Minimal Script Payload** - Only essential scripts loaded

### ⚠️ Considerations

1. **No Analytics** - No user behavior tracking (may be intentional for privacy)
2. **No Error Tracking** - No client-side error tracking (Sentry is server-side only)
3. **No Performance Monitoring** - No RUM from third-party (web-vitals is self-hosted)

### ❌ Issues

None - The application has excellent third-party script hygiene.

## Recommendations

### Immediate (High Priority)

None required - current state is optimal.

### Short-term (Medium Priority)

1. **Consider Self-Hosted Analytics** - If analytics are needed, use self-hosted solution
2. **Add Client-Side Error Tracking** - Consider adding client-side Sentry for frontend errors
3. **Add Performance Monitoring** - web-vitals is already implemented (Task 34)

### Long-term (Lower Priority)

1. **Third-Party Script Policy** - Document policy for adding third-party scripts
2. **Script Loading Strategy** - Define loading strategy for future third-party scripts
3. **Audit Process** - Establish regular audit process for third-party scripts

## Future Third-Party Script Guidelines

If third-party scripts are added in the future, follow these guidelines:

### Loading Strategy

1. **Critical Scripts** - Inline in `<head>` (e.g., structured data)
2. **Deferred Scripts** - Use `defer` attribute for non-critical scripts
3. **Async Scripts** - Use `async` for independent scripts
4. **Lazy Loading** - Load scripts on interaction (e.g., chat widgets)

### Best Practices

1. **Self-Host When Possible** - Host scripts locally to avoid DNS lookups
2. **Use `defer` or `async`** - Never use blocking scripts
3. **Facade Pattern** - Use facade pattern for heavy widgets
4. **Consent Management** - Respect user privacy preferences
5. **Regular Audits** - Regularly audit third-party scripts for necessity

### Example: Facade Pattern for Chat Widget

```html
<!-- Facade button -->
<button id="chat-facade" onclick="loadChatWidget()">Chat</button>

<script>
function loadChatWidget() {
  const script = document.createElement('script');
  script.src = 'https://chat-widget.com/widget.js';
  script.async = true;
  document.body.appendChild(script);
  document.getElementById('chat-facade').remove();
}
</script>
```

## Testing Checklist

- [ ] Verify no render-blocking scripts
- [ ] Verify all scripts are deferred or async
- [ ] Test script loading order
- [ ] Verify structured data is valid
- [ ] Test Lighthouse score for third-party scripts

## Expected State

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Third-Party Scripts | 0 | 0-2 | ✅ Optimal |
| Render-Blocking Scripts | 0 | 0 | ✅ Optimal |
| Script Payload | Minimal | Minimal | ✅ Optimal |
| Privacy Impact | None | None | ✅ Optimal |

## Status

**Overall Status:** ✅ Excellent

**Completed:** Audit of third-party scripts - none found
**In Progress:** N/A - no optimization needed
**Next Steps:** N/A - maintain current excellent state
