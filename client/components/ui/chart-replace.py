import re

path = r'F:\ENGR BILLI\FeexSystems-Living-Intelligence-World\client/components/ui/chart.tsx'
with open(path, 'r', encoding='utf8') as f:
    content = f.read()

# The old ChartStyle component with dangerouslySetInnerHTML
old = '''<style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `\n${prefix} [data-chart=${id}] {\n${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\\n")}\n`,
          ),
          .join("\\n"),
      }} />'''

# The new ChartStyle component with sanitizeHtml
new = '''<style
      dangerouslySetInnerHTML={{
        __html: sanitizeHtml(Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `\n${prefix} [data-chart=${id}] {\n${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\\n")}\n`,
          )
          .join("\\n"),
      }} />'''

if old in content:
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf8') as f:
        f.write(content)
    print('Replacement successful')
else:
    print('Pattern not found - checking what is in the file...')
    # Find the ChartStyle section
    idx = content.find('const ChartStyle')
    if idx >= 0:
        print(content[idx:idx+500])