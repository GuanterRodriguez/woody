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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CdvSession } from "@/types/cdv.types";
import type { ATraiterSubTab } from "@/types/dashboard.types";
import { formatDateDisplay, getStatusDisplay } from "@/lib/dashboard-utils";
import { TablePagination } from "@/components/dashboard/TablePagination";

interface ATraiterTableProps {
  mainData: CdvSession[];
  anomaliesData: CdvSession[];
  anomaliesCount: number;
  activeSubTab: ATraiterSubTab;
  onSubTabChange: (sub: ATraiterSubTab) => void;
  onRowClick: (sessionId: string) => void;
}

const columnHelper = createColumnHelper<CdvSession>();

function SessionTable({
  sessions,
  onRowClick,
  emptyMessage,
}: {
  sessions: CdvSession[];
  onRowClick: (sessionId: string) => void;
  emptyMessage: string;
}) {
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
        {emptyMessage}
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

      <TablePagination
        table={table}
        totalCount={sessions.length}
        itemLabel="dossier"
      />
    </div>
  );
}

export function ATraiterTable({
  mainData,
  anomaliesData,
  anomaliesCount,
  activeSubTab,
  onSubTabChange,
  onRowClick,
}: ATraiterTableProps) {
  return (
    <Tabs
      value={activeSubTab}
      onValueChange={(v) => {
        onSubTabChange(v as ATraiterSubTab);
      }}
    >
      <TabsList>
        <TabsTrigger value="main">
          Matches
          <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
            {mainData.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="anomalies">
          Anomalies
          <Badge
            variant={anomaliesCount > 0 ? "destructive" : "secondary"}
            className="ml-1.5 h-5 px-1.5 text-xs"
          >
            {anomaliesCount}
          </Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="main" className="mt-4">
        <SessionTable
          sessions={mainData}
          onRowClick={onRowClick}
          emptyMessage="Aucun dossier a traiter."
        />
      </TabsContent>

      <TabsContent value="anomalies" className="mt-4">
        <SessionTable
          sessions={anomaliesData}
          onRowClick={onRowClick}
          emptyMessage="Aucune anomalie."
        />
      </TabsContent>
    </Tabs>
  );
}
