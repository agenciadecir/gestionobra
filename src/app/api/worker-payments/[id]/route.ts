import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.workerPayment.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: "Pago al trabajador no encontrado" },
        { status: 404 }
      );
    }

    const updated = await db.workerPayment.update({
      where: { id },
      data: {
        date: body.date ? new Date(body.date) : undefined,
        amount: body.amount !== undefined ? body.amount : undefined,
        concept: body.concept !== undefined ? body.concept : undefined,
        method: body.method !== undefined ? body.method : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
      },
      include: {
        laborCost: {
          include: {
            worker: {
              select: { id: true, name: true, specialty: true },
            },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating worker payment:", error);
    return NextResponse.json(
      { error: "Error al actualizar el pago al trabajador" },
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

    const workerPayment = await db.workerPayment.findUnique({ where: { id } });

    if (!workerPayment) {
      return NextResponse.json(
        { error: "Pago al trabajador no encontrado" },
        { status: 404 }
      );
    }

    await db.workerPayment.delete({ where: { id } });

    return NextResponse.json({
      message: "Pago al trabajador eliminado correctamente",
    });
  } catch (error) {
    console.error("Error deleting worker payment:", error);
    return NextResponse.json(
      { error: "Error al eliminar el pago al trabajador" },
      { status: 500 }
    );
  }
}
