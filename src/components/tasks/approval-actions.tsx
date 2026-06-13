'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function ApprovalActions({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);

  async function decide(decision: 'APPROVED' | 'REJECTED') {
    setLoading(decision === 'APPROVED' ? 'approve' : 'reject');
    const note = decision === 'REJECTED' ? prompt('Reason for rejection (optional):') ?? undefined : undefined;
    const res = await fetch(`/api/tasks/${taskId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, note }),
    });
    setLoading(null);
    if (res.ok) router.refresh();
    else alert('Action failed');
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={() => decide('REJECTED')} disabled={!!loading}>
        {loading === 'reject' ? '…' : 'Reject'}
      </Button>
      <Button size="sm" variant="success" onClick={() => decide('APPROVED')} disabled={!!loading}>
        {loading === 'approve' ? '…' : 'Approve'}
      </Button>
    </div>
  );
}
