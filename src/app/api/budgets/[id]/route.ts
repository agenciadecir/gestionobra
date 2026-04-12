import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const budget = await db.budget.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!budget) {
      return NextResponse.json(
        { error: "Presupuesto no encontrado" },
        { status: 404 }
      );
    }

    // If items are provided, recalculate
    if (body.items) {
      // Delete existing items
      await db.budgetItem.deleteMany({ where: { budgetId: id } });

      const newItems = body.items.map(
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

      const totalAmount = newItems.reduce(
        (sum: number, item: { totalPrice: number }) => sum + item.totalPrice,
        0
      );

      const updated = await db.budget.update({
        where: { id },
        data: {
          date: body.date ? new Date(body.date) : undefined,
          description: body.description !== undefined ? body.description : undefined,
          status: body.status || undefined,
          totalAmount,
          notes: body.notes !== undefined ? body.notes : undefined,
          scopeDescription: body.scopeDescription !== undefined ? body.scopeDescription : undefined,
          items: {
            create: newItems,
          },
        },
        include: { items: true },
      });

      return NextResponse.json(updated);
    }

    const updated = await db.budget.update({
      where: { id },
      data: {
        date: body.date ? new Date(body.date) : undefined,
        description: body.description !== undefined ? body.description : undefined,
        status: body.status || undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
        scopeDescription: body.scopeDescription !== undefined ? body.scopeDescription : undefined,
      },
      include: { items: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating budget:", error);
    return NextResponse.json(
      { error: "Error al actualizar el presupuesto" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const budget = await db.budget.findUnique({ where: { id } });

    if (!budget) {
      return NextResponse.json(
        { error: "Presupuesto no encontrado" },
        { status: 404 }
      );
    }

    await db.budget.delete({ where: { id } });

    return NextResponse.json({
      message: "Presupuesto eliminado correctamente",
    });
  } catch (error) {
    console.error("Error deleting budget:", error);
    return NextResponse.json(
      { error: "Error al eliminar el presupuesto" },
      { status: 500 }
    );
  }
}
