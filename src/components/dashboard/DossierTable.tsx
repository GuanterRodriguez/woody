import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
  type PaginationState,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CdvSession } from "@/types/cdv.types";
import { formatDateDisplay, getStatusDisplay } from "@/lib/dashboard-utils";

interface DossierTableProps {
  sessions: CdvSession[];
  onRowClick: (sessionId: string) => void;
}

const columnHelper = createColumnHelper<CdvSession>();

export function DossierTable({ sessions, onRowClick }: DossierTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor("dossier", {
        header: "Dossier",
        cell: (info) => {
          const val = info.getValue();
          return val.length > 0 ? val : "---";
        },
      }),
      columnHelper.accessor("client", {
        header: "Client",
        cell: (info) => {
          const val = info.getValue();
          return val.length > 0 ? val : "---";
        },
      }),
      columnHelper.accessor("camion", {
        header: "Camion",
        cell: (info) => {
          const val = info.getValue();
          return val.length > 0 ? val : "---";
        },
      }),
      columnHelper.accessor("produit", {
        header: "Produit",
        cell: (info) => {
          const val = info.getValue();
          return val.length > 0 ? val : "---";
        },
      }),
      columnHelper.accessor("dateArrivee", {
        header: "Date arr.",
        cell: (info) => formatDateDisplay(info.getValue()),
      }),
      columnHelper.accessor("statut", {
        header: "Statut",
        cell: (info) => {
          const display = getStatusDisplay(info.getValue());
          return (
            <Badge variant={display.variant} className={display.className}>
              {display.label}
            </Badge>
          );
        },
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: sessions,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
  });

  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Aucun dossier ne correspond aux filtres.
      </div>
    );
  }

  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;

  return (
    <div className="space-y-3">
      <div className="overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left font-medium"
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-t transition-colors hover:bg-muted/50"
                onClick={() => {
                  onRowClick(row.original.id);
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2">
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {sessions.length} dossier{sessions.length > 1 ? "s" : ""}
        </span>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Par page</span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <span className="text-muted-foreground">
            Page {currentPage} / {pageCount}
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                table.previousPage();
              }}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                table.nextPage();
              }}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
