import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const workerPayments = await db.workerPayment.findMany({
      where: { projectId: id },
      include: {
        laborCost: {
          include: {
            worker: {
              select: { id: true, name: true, specialty: true },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(workerPayments);
  } catch (error) {
    console.error("Error fetching worker payments:", error);
    return NextResponse.json(
      { error: "Error al obtener los pagos al trabajador" },
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

    if (!body.laborCostId || !body.amount) {
      return NextResponse.json(
        { error: "El costo de mano de obra y el monto son obligatorios" },
        { status: 400 }
      );
    }

    const workerPayment = await db.workerPayment.create({
      data: {
        projectId: id,
        laborCostId: body.laborCostId,
        date: body.date ? new Date(body.date) : new Date(),
        amount: body.amount,
        concept: body.concept || "PARCIAL",
        method: body.method || "EFECTIVO",
        notes: body.notes || null,
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

    return NextResponse.json(workerPayment, { status: 201 });
  } catch (error) {
    console.error("Error creating worker payment:", error);
    return NextResponse.json(
      { error: "Error al crear el pago al trabajador" },
      { status: 500 }
    );
  }
}
