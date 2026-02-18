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
import { ArrowUpDown } from "lucide-react";
import type { FabricCvEncoursRow } from "@/types/fabric.types";
import { formatDateTimeDisplay } from "@/lib/dashboard-utils";
import { TablePagination } from "@/components/dashboard/TablePagination";

interface NonTraiteTableProps {
  data: FabricCvEncoursRow[];
}

const columnHelper = createColumnHelper<FabricCvEncoursRow>();

function cellOrDash(value: string | null): string {
  return value && value.length > 0 ? value : "---";
}

function numberOrDash(value: number | null): string {
  if (value === null) return "---";
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

export function NonTraiteTable({ data }: NonTraiteTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor("refinterne", {
        header: "Ref Interne",
        cell: (info) => cellOrDash(info.getValue()),
      }),
      columnHelper.accessor("expimpnom", {
        header: "Client",
        cell: (info) => cellOrDash(info.getValue()),
      }),
      columnHelper.accessor("clifounom", {
        header: "Fournisseur",
        cell: (info) => cellOrDash(info.getValue()),
      }),
      columnHelper.accessor("tpfrtident", {
        header: "Camion",
        cell: (info) => cellOrDash(info.getValue()),
      }),
      columnHelper.accessor("dateheurebae", {
        header: "Date BAE",
        cell: (info) => formatDateTimeDisplay(info.getValue()),
      }),
      columnHelper.accessor("pdsn_30", {
        header: "Poids (kg)",
        cell: (info) => numberOrDash(info.getValue()),
      }),
      columnHelper.accessor("valeur_compte_vente_30", {
        header: "Valeur CDV",
        cell: (info) => numberOrDash(info.getValue()),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => String(row.id),
  });

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Aucune declaration en attente de traitement.
      </div>
    );
  }

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
                className="border-t transition-colors hover:bg-muted/50"
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

      <TablePagination
        table={table}
        totalCount={data.length}
        itemLabel="declaration"
      />
    </div>
  );
}
