export const dynamic = 'force-dynamic';

export async function GET() {
  const sources = (process.env.SOURCES || '').split(',').filter(Boolean);
  let lines = [];
  for (const u of sources) {
    try {
      const t = await (await fetch(u)).text();
      const txt = /^(vless|ss):\/\//m.test(t)
        ? t : Buffer.from(t.trim(), 'base64').toString();
      lines.push(...txt.split(/\r?\n/).map(l => l.trim())
        .filter(l => /^(vless|ss):\/\//.test(l)));
    } catch (e) {}
  }
  lines = [...new Set(lines)].slice(0, 100);
  return new Response(Buffer.from(lines.join('\n')).toString('base64'), {
    headers: { 'Content-Type': 'text/plain', 'Cache-Control': 's-maxage=600' },
  });
}
