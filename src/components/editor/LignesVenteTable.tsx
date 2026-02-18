import { useState, useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LigneVente } from "@/types/cdv.types";

interface LignesVenteTableProps {
  lignes: LigneVente[];
  onUpdateLigne: (ligneId: string, partial: Partial<LigneVente>) => void;
  onAddLigne: () => void;
  onRemoveLigne: (ligneId: string) => void;
}

interface EditingCell {
  rowId: string;
  columnId: string;
}

const columnHelper = createColumnHelper<LigneVente>();

function EditableCell({
  value,
  rowId,
  columnId,
  type,
  editingCell,
  onStartEdit,
  onCommit,
}: {
  value: string | number;
  rowId: string;
  columnId: string;
  type: "text" | "number";
  editingCell: EditingCell | null;
  onStartEdit: (cell: EditingCell) => void;
  onCommit: (rowId: string, columnId: string, value: string) => void;
}) {
  const isEditing =
    editingCell?.rowId === rowId && editingCell.columnId === columnId;

  if (!isEditing) {
    return (
      <div
        className="cursor-pointer rounded px-2 py-1 hover:bg-muted"
        onClick={() => {
          onStartEdit({ rowId, columnId });
        }}
      >
        {type === "number" ? Number(value).toFixed(2) : String(value)}
      </div>
    );
  }

  return (
    <Input
      className="h-7"
      type="text"
      inputMode={type === "number" ? "decimal" : "text"}
      defaultValue={String(value)}
      autoFocus
      onBlur={(e) => {
        onCommit(rowId, columnId, e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          onCommit(rowId, columnId, String(value));
        }
      }}
    />
  );
}

export function LignesVenteTable({
  lignes,
  onUpdateLigne,
  onAddLigne,
  onRemoveLigne,
}: LignesVenteTableProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);

  function handleCommit(
    rowId: string,
    columnId: string,
    rawValue: string,
  ) {
    setEditingCell(null);

    const numericFields = [
      "colis",
      "poidsBrut",
      "poidsNet",
      "prixUnitaireNet",
    ];

    if (numericFields.includes(columnId)) {
      const normalized = rawValue.replace(",", ".");
      const num = parseFloat(normalized);
      const value = isNaN(num) ? 0 : num;
      onUpdateLigne(rowId, {
        [columnId]: columnId === "colis" ? Math.round(value) : value,
      });
    } else {
      onUpdateLigne(rowId, { [columnId]: rawValue });
    }
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor("client", {
        header: "Client",
        cell: (info) => (
          <EditableCell
            value={info.getValue()}
            rowId={info.row.original.id}
            columnId="client"
            type="text"
            editingCell={editingCell}
            onStartEdit={setEditingCell}
            onCommit={handleCommit}
          />
        ),
      }),
      columnHelper.accessor("produit", {
        header: "Produit",
        cell: (info) => (
          <EditableCell
            value={info.getValue()}
            rowId={info.row.original.id}
            columnId="produit"
            type="text"
            editingCell={editingCell}
            onStartEdit={setEditingCell}
            onCommit={handleCommit}
          />
        ),
      }),
      columnHelper.accessor("colis", {
        header: "Colis",
        cell: (info) => (
          <EditableCell
            value={info.getValue()}
            rowId={info.row.original.id}
            columnId="colis"
            type="number"
            editingCell={editingCell}
            onStartEdit={setEditingCell}
            onCommit={handleCommit}
          />
        ),
      }),
      columnHelper.accessor("poidsBrut", {
        header: "P.Brut",
        cell: (info) => (
          <EditableCell
            value={info.getValue()}
            rowId={info.row.original.id}
            columnId="poidsBrut"
            type="number"
            editingCell={editingCell}
            onStartEdit={setEditingCell}
            onCommit={handleCommit}
          />
        ),
      }),
      columnHelper.accessor("poidsNet", {
        header: "P.Net",
        cell: (info) => (
          <EditableCell
            value={info.getValue()}
            rowId={info.row.original.id}
            columnId="poidsNet"
            type="number"
            editingCell={editingCell}
            onStartEdit={setEditingCell}
            onCommit={handleCommit}
          />
        ),
      }),
      columnHelper.accessor("prixUnitaireNet", {
        header: "Px/kg",
        cell: (info) => (
          <EditableCell
            value={info.getValue()}
            rowId={info.row.original.id}
            columnId="prixUnitaireNet"
            type="number"
            editingCell={editingCell}
            onStartEdit={setEditingCell}
            onCommit={handleCommit}
          />
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              onRemoveLigne(info.row.original.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        ),
      }),
    ],
    [editingCell], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const table = useReactTable({
    data: lignes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  const totals = useMemo(() => {
    let colis = 0;
    let poidsBrut = 0;
    let poidsNet = 0;
    for (const l of lignes) {
      colis += l.colis;
      poidsBrut += l.poidsBrut;
      poidsNet += l.poidsNet;
    }
    return { colis, poidsBrut, poidsNet };
  }, [lignes]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Lignes de vente</h3>
      <div className="overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-2 py-2 text-left font-medium"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-2 py-1">
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-muted/30">
            <tr>
              <td className="px-2 py-2 font-medium" colSpan={2}>
                Total ({lignes.length} lignes)
              </td>
              <td className="px-2 py-2 font-medium">
                {totals.colis}
              </td>
              <td className="px-2 py-2 font-medium">
                {totals.poidsBrut.toFixed(2)}
              </td>
              <td className="px-2 py-2 font-medium">
                {totals.poidsNet.toFixed(2)}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      <Button variant="outline" size="sm" onClick={onAddLigne}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Ajouter une ligne
      </Button>
    </div>
  );
}
