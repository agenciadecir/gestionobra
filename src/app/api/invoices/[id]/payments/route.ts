import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const payments = await db.payment.findMany({
      where: { invoiceId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Error al obtener los pagos" },
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

    if (body.amount === undefined || body.amount === null) {
      return NextResponse.json(
        { error: "El monto es obligatorio" },
        { status: 400 }
      );
    }

    // Create payment
    const payment = await db.payment.create({
      data: {
        invoiceId: id,
        date: body.date ? new Date(body.date) : new Date(),
        amount: body.amount,
        method: body.method || "TRANSFERENCIA",
        notes: body.notes || null,
      },
    });

    // Recalculate invoice status
    const invoice = await db.invoice.findUnique({
      where: { id },
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
        where: { id },
        data: { status: newStatus },
      });
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Error al crear el pago" },
      { status: 500 }
    );
  }
}
