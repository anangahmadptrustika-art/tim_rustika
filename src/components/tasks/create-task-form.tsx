'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface Person {
  id: string;
  name: string;
}

const selectCls =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export function CreateTaskForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      title: String(form.get('title')),
      description: String(form.get('description') || ''),
      assigneeId: String(form.get('assigneeId')),
      difficulty: String(form.get('difficulty')),
      weight: Number(form.get('weight')),
      basePoints: Number(form.get('basePoints')),
      startDate: new Date(String(form.get('startDate'))).toISOString(),
      deadline: new Date(String(form.get('deadline'))).toISOString(),
    };
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/tasks');
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? 'Failed to create task');
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Title">
            <Input name="title" required minLength={3} placeholder="e.g. Build login page" />
          </Field>
          <Field label="Description">
            <textarea name="description" rows={3} className={selectCls + ' h-auto'} placeholder="Optional details" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Assignee">
              <select name="assigneeId" required className={selectCls}>
                <option value="">Select…</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Difficulty">
              <select name="difficulty" defaultValue="MEDIUM" className={selectCls}>
                {['TRIVIAL', 'EASY', 'MEDIUM', 'HARD', 'CRITICAL'].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Weight (0.1–10)">
              <Input name="weight" type="number" step="0.5" min="0.1" max="10" defaultValue="1" />
            </Field>
            <Field label="Base points">
              <Input name="basePoints" type="number" min="0" max="10000" defaultValue="100" />
            </Field>
            <Field label="Start date">
              <Input name="startDate" type="date" defaultValue={today} required />
            </Field>
            <Field label="Deadline">
              <Input name="deadline" type="date" defaultValue={nextWeek} required />
            </Field>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create task'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
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
