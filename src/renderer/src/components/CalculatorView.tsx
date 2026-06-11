// The Abacus — base-12 calculator. Evaluates expressions in decimal
// or dozenal, renders results as Gdnsua numeral glyphs with the
// spoken reading per the doc's dozen-naming rules.
import { useMemo, useState } from 'react'
import { wordById } from '../data'
import {
  DIGIT_WORD_IDS,
  dozenalReading,
  dozenalTokens,
  evaluate,
  toDozenal
} from '../lib/dozenal'
import { getNumberGlyph } from '../lib/glyphRegistry'
import { Diamond, SectionLabel } from './ui/primitives'
import { Panel } from './ui/Panel'

const key =
  'border-rule hover:bg-ink hover:text-sand cursor-pointer border text-[12px] transition-colors disabled:cursor-default disabled:opacity-30 flex flex-col items-center justify-center h-12'
const smallBtn =
  'border-rule hover:bg-ink hover:text-sand cursor-pointer border px-2 py-1 text-[9px] tracking-[0.12em] uppercase transition-colors'

/** One numeral glyph cell for the result row */
function NumeralCell({ digit }: { digit: number | '.' | '-' }): React.JSX.Element {
  if (digit === '.' || digit === '-') {
    return (
      <div className="text-ink flex h-12 w-5 items-end justify-center pb-1 text-[16px] font-semibold">
        {digit === '.' ? '·' : '−'}
      </div>
    )
  }
  const word = wordById.get(DIGIT_WORD_IDS[digit])
  const svg = getNumberGlyph(DIGIT_WORD_IDS[digit])
  return (
    <div
      title={word ? `${word.romanization} — ${word.glosses[0]}` : String(digit)}
      className={`flex h-12 w-12 items-center justify-center border ${svg ? 'border-ink/40' : 'border-seal/70 border-dashed'}`}
    >
      {svg ? (
        <div
          className="text-ink h-9 w-9 [&_svg]:h-full [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <span className="text-seal text-[9px]">{word?.romanization ?? digit}</span>
      )}
    </div>
  )
}

/** Keypad digit: numeral glyph above its Arabic label */
function DigitKey({
  digit,
  disabled,
  onPress
}: {
  digit: number
  disabled?: boolean
  onPress: (s: string) => void
}): React.JSX.Element {
  const svg = getNumberGlyph(DIGIT_WORD_IDS[digit])
  const label = '0123456789AB'[digit]
  const word = wordById.get(DIGIT_WORD_IDS[digit])
  return (
    <button
      className={key}
      disabled={disabled}
      onClick={() => onPress(label)}
      title={word ? `${word.romanization} (${label})` : label}
    >
      {svg ? (
        <span
          className="h-6 w-6 [&_svg]:h-full [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <span className="text-[13px] font-semibold">{label}</span>
      )}
      <span className="text-dim mt-0.5 text-[8px]">{label}</span>
    </button>
  )
}

export function CalculatorView(): React.JSX.Element {
  const [expr, setExpr] = useState('')
  const [base, setBase] = useState<10 | 12>(10)

  const result = useMemo(() => {
    if (!expr.trim()) return null
    try {
      return { value: evaluate(expr, base), error: null }
    } catch (e) {
      return { value: null, error: (e as Error).message }
    }
  }, [expr, base])

  const value = result?.value ?? null
  const dozenal = value !== null ? toDozenal(value) : null
  const reading = value !== null ? dozenalReading(value) : null
  const press = (s: string): void => setExpr((e) => e + s)
  const equals = (): void => {
    if (value === null) return
    setExpr(base === 12 ? toDozenal(value).text : String(value))
  }

  return (
    <div className="fade-up flex h-full flex-col gap-5 overflow-y-auto p-6">
      <div>
        <div className="flex items-center gap-2.5">
          <Diamond className="text-seal text-[9px]" />
          <span className="font-display text-2xl font-semibold tracking-wide">The Abacus</span>
        </div>
        <p className="text-dim mt-1.5 max-w-2xl text-[11px] leading-relaxed">
          Gaia counts in dozens. Type or tap an expression (+ − × ÷ and parentheses), and the
          result renders in base-12 numerals with its spoken reading. The{' '}
          <span className="text-ink">input base</span> toggle sets how your typed literals are
          read: in dozenal mode the digits A and B mean ten and eleven. Readings follow the
          source doc — UZE / IZE / LIZE for one, two, three dozen, then composed forms like
          “PD ZE” (four dozen); 144 is HA, the gross. Negatives read with AN, the negation
          modifier.
        </p>
      </div>
      <div className="flex max-w-3xl flex-wrap gap-5">
        <Panel className="min-w-72 flex-1 px-5 py-4">
          <SectionLabel>Expression</SectionLabel>
          <div className="mt-2 flex items-center gap-2">
            <button className={smallBtn} onClick={() => setBase(base === 10 ? 12 : 10)}>
              Input: {base === 10 ? 'Decimal' : 'Dozenal'}
            </button>
            <button className={smallBtn} onClick={() => setExpr('')}>AC</button>
            <button className={smallBtn} onClick={() => setExpr((e) => e.slice(0, -1))}>⌫</button>
          </div>
          <input
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            placeholder={base === 12 ? 'e.g. A8B + 3.4' : 'e.g. 1547 + 12 * 3'}
            className="border-rule bg-vellum placeholder:text-dim mt-2 w-full border px-3 py-2 text-right font-mono text-[15px] outline-none focus:border-ink"
          />
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            <DigitKey digit={7} onPress={press} />
            <DigitKey digit={8} onPress={press} />
            <DigitKey digit={9} onPress={press} />
            <button className={key} onClick={() => press('÷')}>÷</button>
            <DigitKey digit={4} onPress={press} />
            <DigitKey digit={5} onPress={press} />
            <DigitKey digit={6} onPress={press} />
            <button className={key} onClick={() => press('×')}>×</button>
            <DigitKey digit={1} onPress={press} />
            <DigitKey digit={2} onPress={press} />
            <DigitKey digit={3} onPress={press} />
            <button className={key} onClick={() => press('−')}>−</button>
            <DigitKey digit={0} onPress={press} />
            <DigitKey digit={10} disabled={base === 10} onPress={press} />
            <DigitKey digit={11} disabled={base === 10} onPress={press} />
            <button className={key} onClick={() => press('+')}>+</button>
            <button className={key} onClick={() => press('(')}>(</button>
            <button className={key} onClick={() => press(')')}>)</button>
            <button className={key} onClick={() => press('.')}>.</button>
            <button className={`${key} bg-ink text-sand hover:opacity-75`} onClick={equals}>=</button>
          </div>
        </Panel>
        <Panel corners className="min-w-72 flex-1 px-5 py-4">
          <SectionLabel>Result</SectionLabel>
          {value === null ? (
            <div className="text-dim mt-4 text-[10px] tracking-[0.12em] uppercase">
              {expr.trim() ? `… ${result?.error}` : 'Awaiting an expression'}
            </div>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-1">
                {dozenalTokens(dozenal!.text).map((d, i) => (
                  <NumeralCell key={i} digit={d} />
                ))}
                {dozenal!.truncated && (
                  <span className="text-dim self-end pb-1 text-[12px]">…</span>
                )}
              </div>
              <div className="border-rule bg-vellum/60 mt-3 border px-3 py-2 text-[11px]">
                <div className="flex items-baseline gap-3 py-0.5">
                  <span className="text-dim w-16 shrink-0 text-[8px] tracking-[0.14em] uppercase">Dozenal</span>
                  <span className="font-mono">{dozenal!.text}{dozenal!.truncated ? '…' : ''}</span>
                </div>
                <div className="flex items-baseline gap-3 py-0.5">
                  <span className="text-dim w-16 shrink-0 text-[8px] tracking-[0.14em] uppercase">Decimal</span>
                  <span className="font-mono">{value}</span>
                </div>
                <div className="flex items-baseline gap-3 py-0.5">
                  <span className="text-dim w-16 shrink-0 text-[8px] tracking-[0.14em] uppercase">Reading</span>
                  <span className="font-display text-[12px] font-semibold tracking-wide">
                    {reading ?? '— whole numbers below HZ×12 only —'}
                  </span>
                </div>
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}
