import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';

export async function GET() {
  const rows = query<{ key: string; value: string; updated_at: string }>(
    'SELECT key, value, updated_at FROM config ORDER BY key'
  );

  const config: Record<string, { value: string; updatedAt: string }> = {};
  for (const row of rows) {
    config[row.key] = { value: row.value, updatedAt: row.updated_at };
  }

  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  let body: { key?: string; value?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { key, value } = body;

  if (!key || typeof key !== 'string' || value === undefined || typeof value !== 'string') {
    return NextResponse.json(
      { error: 'Request body must include "key" (string) and "value" (string)' },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const result = execute(
    'INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    [key, value, now]
  );

  if (!result) {
    return NextResponse.json(
      { error: 'Database not available' },
      { status: 503 }
    );
  }

  return NextResponse.json({ key, value, updatedAt: now });
}
