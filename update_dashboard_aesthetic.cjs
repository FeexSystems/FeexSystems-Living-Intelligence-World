const fs = require('fs');
const path = require('path');

const directoryPaths = [
  path.join(__dirname, 'client', 'pages', 'dashboard'),
  path.join(__dirname, 'client', 'components', 'dashboard')
];

const colorReplacements = [
  // Typography scaling (must be done in this exact order to avoid double replacement)
  { regex: /text-3xl/g, replacement: 'text-2xl' },
  { regex: /text-2xl/g, replacement: 'text-xl' },
  { regex: /text-xl/g, replacement: 'text-lg' },
  { regex: /text-lg/g, replacement: 'text-base' },
  { regex: /text-base/g, replacement: 'text-sm' },
  { regex: /text-sm/g, replacement: 'text-xs' },
  { regex: /text-xs/g, replacement: 'text-[10px]' },

  // Green / Emerald -> #00ff41 (Accent)
  { regex: /text-emerald-\d00/g, replacement: 'text-[#00ff41]' },
  { regex: /text-green-\d00/g, replacement: 'text-[#00ff41]' },
  { regex: /bg-emerald-\d00\/15/g, replacement: 'bg-[#00ff41]/10' },
  { regex: /bg-emerald-\d00\/30/g, replacement: 'bg-[#00ff41]/10' },
  { regex: /bg-emerald-100/g, replacement: 'bg-[#00ff41]/10' },
  { regex: /border-emerald-\d00\/\d0/g, replacement: 'border-[#00ff41]/20' },
  { regex: /bg-green-500/g, replacement: 'bg-[#00ff41]/80' },

  // Yellow / Amber / Orange -> Zinc 300
  { regex: /text-amber-\d00/g, replacement: 'text-zinc-300' },
  { regex: /text-yellow-\d00/g, replacement: 'text-zinc-300' },
  { regex: /text-orange-\d00/g, replacement: 'text-zinc-300' },
  { regex: /bg-amber-\d00\/\d0/g, replacement: 'bg-zinc-800/50' },
  { regex: /bg-yellow-\d00\/\d0/g, replacement: 'bg-zinc-800/50' },
  { regex: /bg-yellow-100/g, replacement: 'bg-zinc-800/50' },
  { regex: /border-amber-\d00\/\d0/g, replacement: 'border-zinc-700' },
  { regex: /bg-yellow-500/g, replacement: 'bg-zinc-700' },

  // Red / Rose -> Zinc 400
  { regex: /text-red-\d00/g, replacement: 'text-zinc-400' },
  { regex: /text-rose-\d00/g, replacement: 'text-zinc-400' },
  { regex: /bg-red-\d00\/\d0/g, replacement: 'bg-zinc-900/80' },
  { regex: /bg-red-100/g, replacement: 'bg-zinc-900/80' },
  { regex: /bg-red-50/g, replacement: 'bg-zinc-900/80' },
  { regex: /border-red-\d00\/\d0/g, replacement: 'border-zinc-600' },
  { regex: /border-red-200/g, replacement: 'border-zinc-600' },
  { regex: /bg-red-500/g, replacement: 'bg-zinc-800' },

  // Blue / Sky / Indigo / Purple -> White
  { regex: /text-sky-\d00/g, replacement: 'text-white' },
  { regex: /text-blue-\d00/g, replacement: 'text-white' },
  { regex: /text-indigo-\d00/g, replacement: 'text-white' },
  { regex: /text-purple-\d00/g, replacement: 'text-white' },
  { regex: /bg-sky-\d00\/\d0/g, replacement: 'bg-white/5' },
  { regex: /bg-blue-\d00\/\d0/g, replacement: 'bg-white/5' },
  { regex: /bg-blue-100/g, replacement: 'bg-white/5' },
  { regex: /border-sky-\d00\/\d0/g, replacement: 'border-white/10' },
  { regex: /bg-blue-500/g, replacement: 'bg-white/20' },
];

directoryPaths.forEach(dirPath => {
  if (fs.existsSync(dirPath)) {
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        return console.log('Unable to scan directory: ' + err);
      }

      files.forEach((file) => {
        if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          const filePath = path.join(dirPath, file);
          let content = fs.readFileSync(filePath, 'utf8');
          
          let modified = false;
          colorReplacements.forEach(rule => {
            if (rule.regex.test(content)) {
              content = content.replace(rule.regex, rule.replacement);
              modified = true;
            }
          });

          if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated ${file}`);
          }
        }
      });
    });
  }
});
