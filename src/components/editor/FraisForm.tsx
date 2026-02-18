import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { CdvSession } from "@/types/cdv.types";

const FraisFormSchema = z.object({
  fraisTransit: z.number().min(0, "Doit etre >= 0"),
  fraisCommission: z.number().min(0, "Doit etre >= 0"),
  autreFrais: z.number().min(0, "Doit etre >= 0"),
  fraisUe: z.number().min(0, "Doit etre >= 0"),
  fraisInt: z.number().min(0, "Doit etre >= 0"),
  dateBae: z.string(),
  poidsDeclare: z.number().min(0, "Doit etre >= 0"),
  prixDeclareKilo: z.number().min(0, "Doit etre >= 0"),
});

type FraisFormValues = z.infer<typeof FraisFormSchema>;

type NumericField =
  | "fraisTransit"
  | "fraisCommission"
  | "autreFrais"
  | "fraisUe"
  | "fraisInt"
  | "poidsDeclare"
  | "prixDeclareKilo";

function parseLocaleNumber(value: string): number {
  if (value.trim() === "") return 0;
  const normalized = value.replace(",", ".");
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}

function numToDisplay(value: number): string {
  return value === 0 ? "" : String(value);
}

/**
 * Numeric input that keeps a local text state so the user can type
 * commas freely. The value is only parsed on blur.
 */
function NumericInput({
  value,
  onCommit,
  placeholder,
  onBlur,
}: {
  value: number;
  onCommit: (num: number) => void;
  placeholder?: string;
  onBlur?: () => void;
}) {
  const [text, setText] = useState(() => numToDisplay(value));

  // Sync from external value changes (session switch, form reset)
  useEffect(() => {
    setText(numToDisplay(value));
  }, [value]);

  const handleBlur = useCallback(() => {
    const num = parseLocaleNumber(text);
    onCommit(num);
    setText(numToDisplay(num));
    onBlur?.();
  }, [text, onCommit, onBlur]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
      }}
      onBlur={handleBlur}
    />
  );
}

interface FraisFormProps {
  session: CdvSession;
  onFieldChange: (partial: Partial<CdvSession>) => void;
}

export function FraisForm({ session, onFieldChange }: FraisFormProps) {
  const form = useForm<FraisFormValues>({
    resolver: zodResolver(FraisFormSchema),
    defaultValues: {
      fraisTransit: session.fraisTransit,
      fraisCommission: session.fraisCommission,
      autreFrais: session.autreFrais,
      fraisUe: session.fraisUe,
      fraisInt: session.fraisInt,
      dateBae: session.dateBae,
      poidsDeclare: session.poidsDeclare,
      prixDeclareKilo: session.prixDeclareKilo,
    },
  });

  /* eslint-disable react-hooks/exhaustive-deps */
  // Reset only when a different session is loaded (not on field changes)
  useEffect(() => {
    form.reset({
      fraisTransit: session.fraisTransit,
      fraisCommission: session.fraisCommission,
      autreFrais: session.autreFrais,
      fraisUe: session.fraisUe,
      fraisInt: session.fraisInt,
      dateBae: session.dateBae,
      poidsDeclare: session.poidsDeclare,
      prixDeclareKilo: session.prixDeclareKilo,
    });
  }, [session.id, form]);
  /* eslint-enable react-hooks/exhaustive-deps */

  function commitNumericField(fieldName: NumericField, num: number) {
    form.setValue(fieldName, num, { shouldValidate: true });
    onFieldChange({ [fieldName]: num });
  }

  return (
    <Form {...form}>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Frais</h3>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="fraisTransit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transit (EUR)</FormLabel>
                <FormControl>
                  <NumericInput
                    value={field.value}
                    placeholder="0"
                    onCommit={(num) => {
                      commitNumericField("fraisTransit", num);
                    }}
                    onBlur={field.onBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fraisCommission"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Commission (EUR)</FormLabel>
                <FormControl>
                  <NumericInput
                    value={field.value}
                    placeholder="0"
                    onCommit={(num) => {
                      commitNumericField("fraisCommission", num);
                    }}
                    onBlur={field.onBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="autreFrais"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Autre frais (EUR)</FormLabel>
                <FormControl>
                  <NumericInput
                    value={field.value}
                    placeholder="0"
                    onCommit={(num) => {
                      commitNumericField("autreFrais", num);
                    }}
                    onBlur={field.onBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fraisUe"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frais UE (EUR)</FormLabel>
                <FormControl>
                  <NumericInput
                    value={field.value}
                    placeholder="0"
                    onCommit={(num) => {
                      commitNumericField("fraisUe", num);
                    }}
                    onBlur={field.onBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fraisInt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frais INT (EUR)</FormLabel>
                <FormControl>
                  <NumericInput
                    value={field.value}
                    placeholder="0"
                    onCommit={(num) => {
                      commitNumericField("fraisInt", num);
                    }}
                    onBlur={field.onBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dateBae"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date BAE</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="date"
                    onBlur={() => {
                      field.onBlur();
                      onFieldChange({ dateBae: form.getValues("dateBae") });
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="poidsDeclare"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Poids declare (kg)</FormLabel>
                <FormControl>
                  <NumericInput
                    value={field.value}
                    placeholder="0"
                    onCommit={(num) => {
                      commitNumericField("poidsDeclare", num);
                    }}
                    onBlur={field.onBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="prixDeclareKilo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prix declare (EUR/kg)</FormLabel>
                <FormControl>
                  <NumericInput
                    value={field.value}
                    placeholder="0"
                    onCommit={(num) => {
                      commitNumericField("prixDeclareKilo", num);
                    }}
                    onBlur={field.onBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </Form>
  );
}
