import { useEffect } from "react";
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

const InformationsFormSchema = z.object({
  produit: z.string().min(1, "Le produit est requis"),
  camion: z.string().min(1, "Le camion est requis"),
  dateArrivee: z.string().min(1, "La date est requise"),
  client: z.string(),
  fournisseur: z.string(),
  dossier: z.string(),
  numDeclaration: z.string(),
});

type InformationsFormValues = z.infer<typeof InformationsFormSchema>;

interface InformationsFormProps {
  session: CdvSession;
  onFieldChange: (partial: Partial<CdvSession>) => void;
}

export function InformationsForm({
  session,
  onFieldChange,
}: InformationsFormProps) {
  const form = useForm<InformationsFormValues>({
    resolver: zodResolver(InformationsFormSchema),
    defaultValues: {
      produit: session.produit,
      camion: session.camion,
      dateArrivee: session.dateArrivee,
      client: session.client,
      fournisseur: session.fournisseur,
      dossier: session.dossier,
      numDeclaration: session.numDeclaration,
    },
  });

  /* eslint-disable react-hooks/exhaustive-deps */
  // Reset only when a different session is loaded (not on field changes)
  useEffect(() => {
    form.reset({
      produit: session.produit,
      camion: session.camion,
      dateArrivee: session.dateArrivee,
      client: session.client,
      fournisseur: session.fournisseur,
      dossier: session.dossier,
      numDeclaration: session.numDeclaration,
    });
  }, [session.id, form]);
  /* eslint-enable react-hooks/exhaustive-deps */

  function handleFieldBlur(field: keyof InformationsFormValues) {
    const value = form.getValues(field);
    onFieldChange({ [field]: value });
  }

  return (
    <Form {...form}>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Informations generales</h3>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="produit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Produit</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onBlur={() => {
                      field.onBlur();
                      handleFieldBlur("produit");
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="camion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Camion</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onBlur={() => {
                      field.onBlur();
                      handleFieldBlur("camion");
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dateArrivee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date arrivee</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="date"
                    onBlur={() => {
                      field.onBlur();
                      handleFieldBlur("dateArrivee");
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="client"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onBlur={() => {
                      field.onBlur();
                      handleFieldBlur("client");
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fournisseur"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fournisseur</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onBlur={() => {
                      field.onBlur();
                      handleFieldBlur("fournisseur");
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dossier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dossier</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onBlur={() => {
                      field.onBlur();
                      handleFieldBlur("dossier");
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="numDeclaration"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>N° Declaration</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onBlur={() => {
                      field.onBlur();
                      handleFieldBlur("numDeclaration");
                    }}
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
