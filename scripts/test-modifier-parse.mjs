// Temp test: verify modifier position derivation against Marc's pasted SVG
const svg = `<svg width="1468" height="1160" viewBox="0 0 1468 1160" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect opacity="0.55" x="304" width="1164" height="1160" fill="white" fill-opacity="0.01"/>
<rect width="203" height="1160" fill="white"/>
</svg>`

const vb = svg.match(/viewBox="([\d.\s-]+)"/)
const [, , vbW, vbH] = vb[1].split(/\s+/).map(Number)
let host = null
for (const r of [...svg.matchAll(/<rect\b[^>]*>/g)].map((m) => m[0])) {
  const a = (n) => Number((r.match(new RegExp(`(?:^|[\\s"<])${n}="([\\d.-]+)"`)) || [])[1] || 0)
  const c = { x: a('x'), y: a('y'), w: a('width'), h: a('height') }
  if (c.w * c.h > vbW * vbH * 0.4 && (!host || c.w * c.h > host.w * host.h)) host = c
}
const space = {
  left: host.x,
  right: vbW - (host.x + host.w),
  top: host.y,
  bottom: vbH - (host.y + host.h)
}
const [side, max] = Object.entries(space).sort((a, b) => b[1] - a[1])[0]
console.log('host rect:', JSON.stringify(host))
console.log('free space:', JSON.stringify(space))
console.log('derived position:', max > Math.min(vbW, vbH) * 0.02 ? side : 'overlay')
