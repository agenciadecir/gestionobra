import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const budgets = await db.budget.findMany({
      where: { projectId: id },
      include: {
        items: {
          orderBy: { id: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(budgets);
  } catch (error) {
    console.error("Error fetching budgets:", error);
    return NextResponse.json(
      { error: "Error al obtener los presupuestos" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const items = (body.items || []).map(
      (item: {
        description: string;
        quantity?: number;
        unit?: string;
        unitPrice?: number;
        category?: string;
      }) => ({
        description: item.description,
        quantity: item.quantity || 1,
        unit: item.unit || "un",
        unitPrice: item.unitPrice || 0,
        totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
        category: item.category || "OTRO",
      })
    );

    const totalAmount = items.reduce(
      (sum: number, item: { totalPrice: number }) => sum + item.totalPrice,
      0
    );

    const budget = await db.budget.create({
      data: {
        projectId: id,
        date: body.date ? new Date(body.date) : new Date(),
        description: body.description || null,
        status: body.status || "PENDIENTE",
        totalAmount,
        notes: body.notes || null,
        items: {
          create: items,
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error("Error creating budget:", error);
    return NextResponse.json(
      { error: "Error al crear el presupuesto" },
      { status: 500 }
    );
  }
}
