import { NextRequest, NextResponse } from 'next/server';
import { getAllExpenses, getTodayExpenses, createExpense, deleteExpense } from '@/lib/server/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    
    const expenses = filter === 'today' ? await getTodayExpenses() : await getAllExpenses();
    return NextResponse.json(expenses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, amount } = body;
    
    if (!description || !amount) {
      return NextResponse.json({ error: 'Missing description or amount' }, { status: 400 });
    }
    
    const expense = await createExpense(description, amount);
    return NextResponse.json(expense);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    
    const success = await deleteExpense(id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
