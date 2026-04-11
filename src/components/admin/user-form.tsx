"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { saveUserAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  userFormSchema,
  type UserFormInput,
  type UserFormValues,
} from "@/lib/validators";

export function UserForm({ defaultValues }: { defaultValues?: Partial<UserFormValues> }) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<UserFormInput, undefined, UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      email: defaultValues?.email ?? "",
      password: "",
      role: defaultValues?.role ?? "EDITOR",
      isActive: defaultValues?.isActive ?? true,
      id: defaultValues?.id,
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((values: UserFormValues) => {
        startTransition(async () => {
          try {
            await saveUserAction(values);
            toast.success("User saved");
            form.reset({ ...values, password: "" });
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save user");
          }
        });
      })}
      className="grid gap-4 md:grid-cols-2"
    >
      <input type="hidden" {...form.register("id")} />

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...form.register("name")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...form.register("email")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...form.register("password")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          {...form.register("role")}
          className="flex h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 text-sm"
        >
          <option value="EDITOR">Editor</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <input type="checkbox" {...form.register("isActive")} />
        User is active
      </label>

      <div className="md:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save user"}
        </Button>
      </div>
    </form>
  );
}
