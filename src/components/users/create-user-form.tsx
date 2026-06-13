'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface Option {
  id: string;
  name: string;
}

const selectCls =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export function CreateUserForm({ departments, managers }: { departments: Option[]; managers: Option[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOk(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get('name')),
      email: String(form.get('email')),
      password: String(form.get('password')),
      role: String(form.get('role')),
      phone: String(form.get('phone') || ''),
      jobTitle: String(form.get('jobTitle') || ''),
      departmentId: String(form.get('departmentId') || ''),
      managerId: String(form.get('managerId') || ''),
    };
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok && data?.ok) {
      setOk(`Account created: ${payload.email}`);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } else {
      setError(data?.error ?? data?.data?.error ?? 'Failed to create account');
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input name="name" required minLength={2} placeholder="Budi Santoso" />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" required placeholder="budi@rustika.co.id" />
            </Field>
            <Field label="Password (min 8)">
              <Input name="password" type="text" required minLength={8} placeholder="set a temporary password" />
            </Field>
            <Field label="Role">
              <select name="role" defaultValue="EMPLOYEE" className={selectCls}>
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </Field>
            <Field label="Department (optional)">
              <select name="departmentId" className={selectCls}>
                <option value="">—</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Manager (optional)">
              <select name="managerId" className={selectCls}>
                <option value="">—</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Phone / WhatsApp (optional)">
              <Input name="phone" placeholder="+6281234567890" />
            </Field>
            <Field label="Job title (optional)">
              <Input name="jobTitle" placeholder="Software Engineer" />
            </Field>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {ok && <p className="text-sm text-success">{ok}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create account'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push('/team')}>
              Done
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
