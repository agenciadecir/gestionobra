import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const payment = await db.payment.findUnique({ where: { id } });

    if (!payment) {
      return NextResponse.json(
        { error: "Pago no encontrado" },
        { status: 404 }
      );
    }

    const updated = await db.payment.update({
      where: { id },
      data: {
        date: body.date ? new Date(body.date) : undefined,
        amount: body.amount !== undefined ? body.amount : undefined,
        method: body.method !== undefined ? body.method : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
      },
    });

    // Recalculate invoice status
    const invoice = await db.invoice.findUnique({
      where: { id: payment.invoiceId },
      include: { payments: true },
    });

    if (invoice) {
      const totalPaid = invoice.payments.reduce(
        (sum: number, p: { amount: number }) => sum + p.amount,
        0
      );

      let newStatus = invoice.status;
      if (totalPaid >= invoice.amount) {
        newStatus = "PAGADA";
      } else if (totalPaid > 0) {
        newStatus = "PAGADA_PARCIALMENTE";
      } else {
        newStatus = "PENDIENTE";
      }

      await db.invoice.update({
        where: { id: invoice.id },
        data: { status: newStatus },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating payment:", error);
    return NextResponse.json(
      { error: "Error al actualizar el pago" },
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

    const payment = await db.payment.findUnique({ where: { id } });

    if (!payment) {
      return NextResponse.json(
        { error: "Pago no encontrado" },
        { status: 404 }
      );
    }

    await db.payment.delete({ where: { id } });

    // Recalculate invoice status
    const invoice = await db.invoice.findUnique({
      where: { id: payment.invoiceId },
      include: { payments: true },
    });

    if (invoice) {
      const totalPaid = invoice.payments.reduce(
        (sum: number, p: { amount: number }) => sum + p.amount,
        0
      );

      let newStatus = invoice.status;
      if (totalPaid >= invoice.amount) {
        newStatus = "PAGADA";
      } else if (totalPaid > 0) {
        newStatus = "PAGADA_PARCIALMENTE";
      } else {
        newStatus = "PENDIENTE";
      }

      await db.invoice.update({
        where: { id: invoice.id },
        data: { status: newStatus },
      });
    }

    return NextResponse.json({
      message: "Pago eliminado correctamente",
    });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return NextResponse.json(
      { error: "Error al eliminar el pago" },
      { status: 500 }
    );
  }
}
