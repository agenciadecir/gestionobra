import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const invoices = await db.invoice.findMany({
      where: { projectId: id },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Error al obtener las facturas" },
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

    if (!body.number) {
      return NextResponse.json(
        { error: "El número de factura es obligatorio" },
        { status: 400 }
      );
    }

    const invoice = await db.invoice.create({
      data: {
        projectId: id,
        number: body.number,
        date: body.date ? new Date(body.date) : new Date(),
        amount: body.amount || 0,
        status: body.status || "PENDIENTE",
        notes: body.notes || null,
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Error al crear la factura" },
      { status: 500 }
    );
  }
}
