/**
 * Multi-cat comparison as a table with a compact inline bar per row — the
 * "table or compact bars" option from the spec, chosen so the figures are
 * directly readable (and screen-reader accessible) rather than colour-only.
 * Adherence carries a good/over meaning, so the bar wears status colour
 * (`var(--chart-1)` at/under target, `var(--destructive)` over) alongside a
 * visible % and an "Over"/"On track" badge — never colour alone. A dashed
 * marker sits at the 100% target on each track.
 */
import type { CatComparison } from '@/api/reports'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatKcal } from '@/lib/format'

interface ComparisonTableProps {
  cats: CatComparison[]
}

export function ComparisonTable({ cats }: ComparisonTableProps) {
  // Scale bar widths so the widest adherence fills the track, but never below a
  // 100%-worth of width so the target marker keeps a sensible position.
  const scaleMax = Math.max(100, ...cats.map((cat) => cat.adherence_pct))

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cat</TableHead>
            <TableHead className="text-right">Avg / day</TableHead>
            <TableHead className="text-right">Target</TableHead>
            <TableHead className="w-[45%]">Adherence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cats.map((cat) => {
            const over = cat.adherence_pct > 100
            const barWidth = `${(cat.adherence_pct / scaleMax) * 100}%`
            const targetLeft = `${(100 / scaleMax) * 100}%`
            return (
              <TableRow key={cat.cat_id}>
                <TableCell className="font-medium">{cat.cat_name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatKcal(cat.avg_kcal_per_day)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatKcal(cat.target_kcal)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted"
                      role="img"
                      aria-label={`${cat.cat_name} at ${Math.round(cat.adherence_pct)} percent of target`}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: barWidth,
                          backgroundColor: over ? 'var(--destructive)' : 'var(--chart-1)',
                        }}
                      />
                      {/* Target marker at 100%. */}
                      <div
                        className="absolute inset-y-0 w-px bg-foreground/50"
                        style={{ left: targetLeft }}
                        aria-hidden
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-sm tabular-nums">
                      {Math.round(cat.adherence_pct)}%
                    </span>
                    <Badge
                      variant={over ? 'destructive' : 'secondary'}
                      className="w-16 justify-center"
                    >
                      {over ? 'Over' : 'On track'}
                    </Badge>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
