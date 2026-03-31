const fs = require('fs');
const path = require('path');

const applyReplacements = (file, replacements) => {
    const fullPath = path.join(__dirname, 'src/components', file);
    if (!fs.existsSync(fullPath)) return;
    let content = fs.readFileSync(fullPath, 'utf8');
    
    replacements.forEach(([regex, replacement]) => {
        content = content.replace(regex, replacement);
    });
    
    fs.writeFileSync(fullPath, content);
    console.log(`Migrated ${file}`);
}

applyReplacements('ChatWindow.tsx', [
    [/text-white\/80/g, 'text-foreground/80'],
    [/text-white\/70/g, 'text-foreground/70'],
    [/text-white\/20/g, 'text-muted-foreground/50'],
    [/text-white\/40/g, 'text-muted-foreground'],
    [/text-white/g, 'text-foreground'],
    [/color: "rgba\(255,255,255,0\.2\)"/g, 'color: "var(--color-muted-foreground)"'],
    [/color: "rgba\(255,255,255,0\.3\)"/g, 'color: "var(--color-muted-foreground)"'],
    [/color: "rgba\(255,255,255,0\.4\)"/g, 'color: "var(--color-muted-foreground)"'],
    [/color: "rgba\(255,255,255,0\.45\)"/g, 'color: "var(--color-muted-foreground)"'],
    [/color: "rgba\(255,255,255,0\.8\)"/g, 'color: "var(--color-foreground)"'],
    [/color: "white"/g, 'color: "var(--color-foreground)"'],
    [/"rgba\(255,255,255,0\.03\)"/g, '"var(--glass-bg-hover)"'],
    [/"rgba\(255,255,255,0\.04\)"/g, '"var(--glass-border)"'],
    [/"rgba\(255,255,255,0\.05\)"/g, '"var(--glass-bg-hover)"'],
    [/"rgba\(255,255,255,0\.06\)"/g, '"var(--glass-border)"'],
    [/"rgba\(255,255,255,0\.08\)"/g, '"var(--glass-border-strong)"'],
    [/"rgba\(13,13,22,0\.7\)"/g, '"var(--glass-bg)"'],
    [/"#07070D"/g, '"var(--color-background)"'],
    [/"#E2E8F0"/g, '"var(--color-foreground)"']
]);

applyReplacements('ConnectDbModal.tsx', [
    [/text-white\/20/g, 'text-muted-foreground/50'],
    [/text-white\/15/g, 'text-muted-foreground/40'],
    [/text-white/g, 'text-foreground'],
    [/"rgba\(255,255,255,0\.03\)"/g, '"var(--glass-bg-hover)"'],
    [/"rgba\(255,255,255,0\.04\)"/g, '"var(--glass-bg-hover)"'],
    [/"rgba\(255,255,255,0\.05\)"/g, '"var(--glass-border)"'],
    [/"rgba\(255,255,255,0\.06\)"/g, '"var(--glass-border)"'],
    [/"rgba\(255,255,255,0\.08\)"/g, '"var(--glass-border-strong)"'],
    [/"rgba\(255,255,255,0\.09\)"/g, '"var(--glass-border-strong)"'],
    [/"rgba\(255,255,255,0\.12\)"/g, '"var(--glass-border-strong)"'],
    [/"rgba\(255,255,255,0\.25\)"/g, '"var(--color-muted-foreground)"'],
    [/"rgba\(255,255,255,0\.3\)"/g, '"var(--color-muted-foreground)"'],
    [/"rgba\(255,255,255,0\.35\)"/g, '"var(--color-muted-foreground)"'],
    [/"rgba\(255,255,255,0\.4\)"/g, '"var(--color-muted-foreground)"'],
    [/"rgba\(255,255,255,0\.45\)"/g, '"var(--color-muted-foreground)"'],
    [/"rgba\(255,255,255,0\.7\)"/g, '"var(--color-foreground)"'],
    [/"rgba\(255,255,255,0\.9\)"/g, '"var(--color-foreground)"'],
    [/"white"/g, '"var(--color-foreground)"'],
    [/"rgba\(13,13,22,0\.97\)"/g, '"var(--glass-bg)"'],
    [/"rgba\(7,7,13,0\.75\)"/g, '"var(--glass-bg)"']
]);

applyReplacements('ChartRenderer.tsx', [
    [/"rgba\(7, 7, 13, 0\.7\)"/g, '"var(--glass-bg)"'],
    [/"rgba\(13,13,22,0\.9\)"/g, '"var(--glass-bg-hover)"'],
    [/"rgba\(255,255,255,0\.06\)"/g, '"var(--glass-border)"'],
    [/"rgba\(255,255,255,0\.07\)"/g, '"var(--glass-border)"']
]);
