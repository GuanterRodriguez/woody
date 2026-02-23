import { useState, useEffect, useCallback } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { getFabricCvEncoursCount } from "@/services/database.service";
import { getClientList } from "@/services/fabric.service";

interface ClientComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export function ClientCombobox({ value, onChange }: ClientComboboxProps) {
  const [open, setOpen] = useState(false);
  const [fabricClients, setFabricClients] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fabricAvailable, setFabricAvailable] = useState(false);

  const loadClients = useCallback(async () => {
    try {
      const count = await getFabricCvEncoursCount();
      if (count === 0) {
        setFabricAvailable(false);
        return;
      }

      setFabricAvailable(true);
      setIsLoading(true);
      const clients = await getClientList();
      setFabricClients(clients);
    } catch {
      setFabricAvailable(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  if (!fabricAvailable || fabricClients.length === 0) {
    return (
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        placeholder="Ex: Client A..."
      />
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || "Selectionner un client..."}
          {isLoading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Rechercher un client..." />
          <CommandList>
            <CommandEmpty>Aucun client trouve.</CommandEmpty>
            <CommandGroup>
              {fabricClients.map((c) => (
                <CommandItem
                  key={c}
                  value={c}
                  onSelect={(selected) => {
                    onChange(selected);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === c ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {c}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
