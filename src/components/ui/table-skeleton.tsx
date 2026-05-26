import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type TableSkeletonProps = {
  rows?: number
  columns?: number
}

export function TableSkeleton(_props: TableSkeletonProps = {}) {
  const rows = _props.rows ?? 5
  const columns = _props.columns ?? 6

  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: columns }).map((_, col) => (
                <TableCell key={col}>
                  <Skeleton className={col === 0 ? "h-8 w-32" : "h-5 w-20"} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  )
}
