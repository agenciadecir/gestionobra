import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.laborCost.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: "Costo de mano de obra no encontrado" },
        { status: 404 }
      );
    }

    const updated = await db.laborCost.update({
      where: { id },
      data: {
        workerId: body.workerId !== undefined ? body.workerId : undefined,
        invoiceId: body.invoiceId !== undefined ? (body.invoiceId || null) : undefined,
        description:
          body.description !== undefined ? body.description : undefined,
        workerPrice:
          body.workerPrice !== undefined ? body.workerPrice : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
      },
      include: {
        worker: {
          select: { id: true, name: true, specialty: true },
        },
        invoice: { select: { id: true, number: true, status: true } },
        workerPayments: {
          orderBy: { date: "desc" },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating labor cost:", error);
    return NextResponse.json(
      { error: "Error al actualizar el costo de mano de obra" },
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

    const laborCost = await db.laborCost.findUnique({ where: { id } });

    if (!laborCost) {
      return NextResponse.json(
        { error: "Costo de mano de obra no encontrado" },
        { status: 404 }
      );
    }

    await db.laborCost.delete({ where: { id } });

    return NextResponse.json({
      message: "Costo de mano de obra eliminado correctamente",
    });
  } catch (error) {
    console.error("Error deleting labor cost:", error);
    return NextResponse.json(
      { error: "Error al eliminar el costo de mano de obra" },
      { status: 500 }
    );
  }
}
