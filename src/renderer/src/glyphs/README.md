# Glyph Drop Zone

Drop SVG files here — the app auto-loads them by filename. No code changes needed.

## Naming convention: `{id}.svg`, lowercase

### letters/ — one file per alphabet letter

| File | Letter | | File | Letter |
| ---- | ------ |-| ---- | ------ |
| a.svg | A (ars) | | h.svg | H (hez) |
| u.svg | U (urs) | | x.svg | X (xo) |
| i.svg | I (irs) | | r.svg | R (rhuz) |
| e.svg | E (edgz) | | j.svg | J (jars) |
| l.svg | L (lors) | | hw.svg | /ʍ/ (hirs) ← note: "hw" |
| o.svg | O (othos) | | ks.svg | KS (kars) |
| m.svg | M (mars) | | vk.svg | VK (vrs) |
| n.svg | N (nars) | | zk.svg | ZK (zrs) |
| mn.svg | MN (mirs) | | y.svg | Y (yak) |
| p.svg | P (prs) | | b.svg | B (bah) |
| t.svg | T (tethes) | | w.svg | W (wan) |
| k.svg | K (krs) | | d.svg | D (dors) |
| f.svg | F (fars) | | g.svg | G (gors) |
| v.svg | V (vars) | | z.svg | Z (zors) |
| s.svg | S (sars) | | | |

### modifiers/ — one file per modifier mark

an.svg, mi.svg, ho.svg, zhel.svg, zhwitz.svg, zhal.svg, i-mod.svg,
rak.svg, hah-plea.svg, pi.svg, lin.svg, dif.svg, lel.svg, taj.svg,
fa.svg, ka-mod.svg

### logographs/ — one file per word id (future)

e.g. taus.svg, kan.svg, vel.svg

## Export tips

- Consistent square viewBox preferred (e.g. `0 0 100 100`)
- Fills are auto-recolored to match the UI ink — don't worry about color
- Modifiers: export on the full canvas (mark + host area) so position
  can be inferred from coordinates
