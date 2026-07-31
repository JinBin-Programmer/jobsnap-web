import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { updateClient } from "@/app/dashboard/clients/actions";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import type { Client } from "@/lib/types";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("org_id", profile.org_id)
    .single<Client>();
  if (!client) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to clients
      </Link>

      <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight">Edit client</h1>

      <form
        action={updateClient.bind(null, id)}
        className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6"
      >
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required defaultValue={client.name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact_name">Contact person</Label>
          <Input id="contact_name" name="contact_name" defaultValue={client.contact_name ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={client.email ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={client.phone ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" name="address" rows={2} defaultValue={client.address ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" rows={2} defaultValue={client.notes ?? ""} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/clients">Cancel</Link>
          </Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90">
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
