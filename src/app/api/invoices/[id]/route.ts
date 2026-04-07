import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const invoice = await db.invoice.findUnique({ where: { id } });

    if (!invoice) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      );
    }

    const updated = await db.invoice.update({
      where: { id },
      data: {
        number: body.number !== undefined ? body.number : undefined,
        date: body.date ? new Date(body.date) : undefined,
        amount: body.amount !== undefined ? body.amount : undefined,
        concept: body.concept !== undefined ? body.concept : undefined,
        status: body.status !== undefined ? body.status : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
      },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Error al actualizar la factura" },
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

    const invoice = await db.invoice.findUnique({ where: { id } });

    if (!invoice) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      );
    }

    await db.invoice.delete({ where: { id } });

    return NextResponse.json({
      message: "Factura eliminada correctamente",
    });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json(
      { error: "Error al eliminar la factura" },
      { status: 500 }
    );
  }
}
