import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { addClient, deleteClient } from "./actions";
import type { Client } from "@/lib/types";
import { Trash2, Pencil } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Button } from "@/app/components/ui/button";
import ConfirmSubmitButton from "@/app/components/ConfirmSubmitButton";

export default async function ClientsPage() {
  const { supabase, profile } = await requireProfile();

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .eq("org_id", profile.org_id)
    .order("name");

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Clients</h1>
      <p className="text-sm text-muted-foreground">The customers you do jobs for — used for reports later.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Add form */}
        <form action={addClient} className="space-y-3 card-shadow rounded-2xl border border-border bg-card p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold">Add client</h2>
          <Input name="name" required placeholder="Company / client name" />
          <Input name="contact_name" placeholder="Contact person" />
          <Input name="email" type="email" placeholder="Email" />
          <Input name="phone" placeholder="Phone" />
          <Textarea name="address" rows={2} placeholder="Address" />
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
            Add client
          </Button>
        </form>

        {/* List */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden card-shadow rounded-2xl border border-border bg-card">
            {clients && clients.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(clients as Client[]).map((c) => (
                    <tr key={c.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.contact_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.phone || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/dashboard/clients/${c.id}/edit`}
                            className="text-muted-foreground hover:text-primary"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <form action={deleteClient.bind(null, c.id)}>
                            <ConfirmSubmitButton
                              confirmMessage={`Delete ${c.name}? Tasks that reference this client will keep their history but lose the client link.`}
                              className="text-muted-foreground hover:text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">No clients yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
