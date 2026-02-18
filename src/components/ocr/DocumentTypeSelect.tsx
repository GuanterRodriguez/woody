import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DocumentTypeSelectProps {
  value: "cdv" | "fiche_lot" | null;
  onChange: (type: "cdv" | "fiche_lot" | null) => void;
  disabled?: boolean;
}

export function DocumentTypeSelect({
  value,
  onChange,
  disabled,
}: DocumentTypeSelectProps) {
  return (
    <Select
      value={value ?? "none"}
      onValueChange={(v) => {
        onChange(v === "none" ? null : (v as "cdv" | "fiche_lot"));
      }}
      disabled={disabled}
    >
      <SelectTrigger className="h-8 w-[140px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">—</SelectItem>
        <SelectItem value="cdv">Compte de vente</SelectItem>
        <SelectItem value="fiche_lot">Fiche de lot</SelectItem>
      </SelectContent>
    </Select>
  );
}
