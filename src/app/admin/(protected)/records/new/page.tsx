import { RecordForm } from "@/components/admin/record-form";

export default function AdminNewRecordPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
          New record
        </p>
        <h2 className="font-serif text-4xl font-semibold text-[var(--foreground)]">
          Create a curated Bryozoa record
        </h2>
      </section>

      <RecordForm />
    </div>
  );
}
