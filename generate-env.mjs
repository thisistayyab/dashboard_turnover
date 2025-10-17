import { writeFile } from 'fs/promises';
const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_ANON_KEY || '';
const content = `window.__SUPABASE_URL__ = ${JSON.stringify(url)};\nwindow.__SUPABASE_ANON_KEY__ = ${JSON.stringify(key)};\n`;
await writeFile(new URL('./env.js', import.meta.url), content, 'utf8');
console.log('env.js generated');


