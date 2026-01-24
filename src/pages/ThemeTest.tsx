import { ThemePreviewTest } from '@/components/ThemePreviewTest';

/**
 * Visual Testing Page for Theme System
 * Access via: /theme-test
 * 
 * This page displays:
 * - All 4 theme colors with live preview
 * - WCAG contrast ratio calculations
 * - Accessibility compliance metrics
 * - Interactive demo with smooth transitions
 * 
 * Use for:
 * - Manual QA validation
 * - Accessibility audits
 * - Visual regression testing
 * - Storybook snapshots
 */
export default function ThemeTestPage() {
  return <ThemePreviewTest />;
}
