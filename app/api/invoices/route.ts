import { NextRequest, NextResponse } from 'next/server';
import { getAllInvoices, createInvoice, updateInvoice as updateInvoiceServer, returnInvoice } from '@/lib/server/database';

export async function GET() {
  try {
    const invoices = await getAllInvoices();
    return NextResponse.json(invoices);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const invoice = await createInvoice(body);
    return NextResponse.json(invoice);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    
    if (action === 'return') {
      const success = await returnInvoice(id);
      return NextResponse.json({ success });
    }
    
    if (action === 'update') {
      const body = await request.json();
      const success = await updateInvoiceServer(id, body);
      return NextResponse.json({ success });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
