import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { THEME_OPTIONS, getThemeAccessibilityReport, validateThemeContrast } from '@/hooks/useFinanceData';
import { Check, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Theme Preview Test Component
 * Visual validation of all theme colors and their accessibility
 * Useful for snapshot testing and manual QA
 */
export function ThemePreviewTest() {
  const accessibilityReport = getThemeAccessibilityReport();

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-8 bg-background">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Theme Color Validation</h1>
        <p className="text-muted-foreground">
          Visual preview of all 4 theme colors with accessibility metrics
        </p>
      </div>

      {/* Theme Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {accessibilityReport.map((theme) => (
          <Card key={theme.hex} className="overflow-hidden">
            {/* Color Preview Header */}
            <div
              className="h-24 w-full transition-all duration-300"
              style={{ backgroundColor: theme.hex }}
            />

            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{theme.label}</CardTitle>
                  <CardDescription className="font-mono text-xs">
                    {theme.hex}
                  </CardDescription>
                </div>
                {theme.contrast.isAccessible ? (
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Foreground Contrast */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Text on White
                </p>
                <div
                  className="p-2 rounded text-sm font-medium text-center"
                  style={{
                    backgroundColor: '#ffffff',
                    color: theme.hex,
                    border: `2px solid ${theme.hex}`,
                  }}
                >
                  Contrast: {theme.contrast.foregroundContrast.ratio}:1
                </div>
                <div className="flex items-center gap-1">
                  <Badge
                    variant={
                      theme.contrast.foregroundContrast.level === 'AAA'
                        ? 'default'
                        : theme.contrast.foregroundContrast.level === 'AA'
                          ? 'secondary'
                          : 'destructive'
                    }
                    className="text-xs"
                  >
                    {theme.contrast.foregroundContrast.level}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {theme.contrast.foregroundContrast.level === 'AAA'
                      ? 'Excellent'
                      : theme.contrast.foregroundContrast.level === 'AA'
                        ? 'Good'
                        : 'Poor'}
                  </span>
                </div>
              </div>

              {/* Border/Card Contrast */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Border on Light Card
                </p>
                <div
                  className="p-2 rounded text-sm font-medium text-center"
                  style={{
                    backgroundColor: '#f4f5f7',
                    color: theme.hex,
                    border: `2px solid ${theme.hex}`,
                  }}
                >
                  Contrast: {theme.contrast.borderContrast.ratio}:1
                </div>
                <div className="flex items-center gap-1">
                  <Badge
                    variant={
                      theme.contrast.borderContrast.level === 'AAA'
                        ? 'default'
                        : theme.contrast.borderContrast.level === 'AA'
                          ? 'secondary'
                          : 'destructive'
                    }
                    className="text-xs"
                  >
                    {theme.contrast.borderContrast.level}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {theme.contrast.borderContrast.level === 'AAA'
                      ? 'Excellent'
                      : theme.contrast.borderContrast.level === 'AA'
                        ? 'Good'
                        : 'Poor'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Accessibility Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Accessibility Summary
          </CardTitle>
          <CardDescription>
            WCAG 2.1 compliance analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accessibilityReport.map((theme) => (
              <div
                key={theme.hex}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: theme.hex }}
                  />
                  <div>
                    <p className="font-medium text-sm">{theme.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {theme.hex}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {theme.contrast.isAccessible ? (
                    <>
                      <Check className="w-5 h-5 text-green-600" />
                      <span className="text-xs font-medium text-green-600">
                        AA Compliant
                      </span>
                    </>
                  ) : (
                    <>
                      <X className="w-5 h-5 text-yellow-600" />
                      <span className="text-xs font-medium text-yellow-600">
                        Check Required
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-muted">
            <p className="text-xs text-muted-foreground">
              <strong>Metric Details:</strong> Text Contrast tests foreground color on white background.
              Border Contrast tests color visibility on light card backgrounds (#f4f5f7).
              All colors meet AA standard (4.5:1) for normal text.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Interactive Demo</CardTitle>
          <CardDescription>
            Live preview of theme elements with smooth transitions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {THEME_OPTIONS.map((theme) => (
              <div
                key={theme.hex}
                className="space-y-2 p-4 rounded-lg border transition-all duration-300"
                style={{
                  borderColor: theme.hex,
                  backgroundColor: `${theme.hex}08`,
                }}
              >
                <h4 className="font-medium text-sm">{theme.label}</h4>
                <div className="flex gap-2 flex-wrap">
                  <button
                    className="px-3 py-1 rounded text-sm font-medium text-white transition-all duration-300 hover:opacity-90"
                    style={{ backgroundColor: theme.hex }}
                  >
                    Primary Button
                  </button>
                  <button
                    className="px-3 py-1 rounded text-sm font-medium border-2 transition-all duration-300 hover:opacity-90"
                    style={{
                      borderColor: theme.hex,
                      color: theme.hex,
                    }}
                  >
                    Secondary Button
                  </button>
                  <div
                    className="px-3 py-1 rounded text-sm font-medium text-white transition-all duration-300"
                    style={{
                      backgroundColor: theme.hex,
                      opacity: 0.7,
                    }}
                  >
                    Muted State
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Transitions smooth over 0.3s on color changes
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* WCAG Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm">About WCAG Levels</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2 text-muted-foreground">
          <p>
            <strong className="text-foreground">AAA (7:1 ratio):</strong> Enhanced
            contrast, recommended for all users, especially those with visual impairments
          </p>
          <p>
            <strong className="text-foreground">AA (4.5:1 ratio):</strong> Minimum
            standard for web accessibility, suitable for most users
          </p>
          <p>
            <strong className="text-foreground">FAIL (&lt;4.5:1):</strong> Does not
            meet WCAG standards, may be difficult to read
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
