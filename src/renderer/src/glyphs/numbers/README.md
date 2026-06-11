# Number glyph drop zone

Drop the base-12 numeral SVGs here, one file per number, named by id
(case-insensitive). The registry auto-loads `*.svg` on app start.

| File | Word | Value |
| --- | --- | --- |
| nhakt.svg | NHAKT | 0 |
| uus.svg | UUS | 1 |
| itz.svg | ITZ | 2 |
| lil.svg | LIL | 3 |
| pd.svg | PD | 4 |
| kaz.svg | KAZ | 5 |
| taz.svg | TAZ | 6 |
| win.svg | WIN | 7 |
| xoh.svg | XOH | 8 |
| ioh.svg | IOH | 9 |
| eh.svg | EH | 10 |
| raj.svg | RAJ | 11 |
| uze.svg | UZE | 12 (dozen) |
| ize.svg | IZE | 24 |
| lize.svg | LIZE | 36 |
| ha.svg | HA | 144 (gross) |
| han.svg | HAN | 1728 |
| hanil.svg | HANIL | 20736 |
| hazfil.svg | HAZFIL | 248832 |
| hz.svg | HZ | 2985984 |

Notes:
- `eh.svg` and `ha.svg` resolve to the disambiguated word ids
  `eh-num` / `ha-144` automatically (alias map in glyphRegistry).
- Fills/strokes are recolored to currentColor at load, same as letters.
- In dev, dropping files triggers one app reload; after that the
  glyphs render as the hero on their word's plate in the dictionary.
