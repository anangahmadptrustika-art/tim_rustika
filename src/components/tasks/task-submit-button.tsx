'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function TaskSubmitButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    const res = await fetch(`/api/tasks/${taskId}/submit`, { method: 'POST' });
    setLoading(false);
    if (res.ok) router.refresh();
    else alert('Failed to submit task');
  }

  return (
    <Button size="sm" variant="outline" onClick={submit} disabled={loading}>
      {loading ? 'Submitting…' : 'Submit for review'}
    </Button>
  );
}
