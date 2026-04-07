import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const laborCosts = await db.laborCost.findMany({
      where: { projectId: id },
      include: {
        worker: {
          select: { id: true, name: true, specialty: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(laborCosts);
  } catch (error) {
    console.error("Error fetching labor costs:", error);
    return NextResponse.json(
      { error: "Error al obtener los costos de mano de obra" },
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

    if (!body.description || !body.workerId) {
      return NextResponse.json(
        { error: "La descripción y el trabajador son obligatorios" },
        { status: 400 }
      );
    }

    const workerPrice = body.workerPrice || 0;
    const markupPercentage = body.markupPercentage || 0;
    const markupAmount = workerPrice * (markupPercentage / 100);
    const finalPrice = workerPrice + markupAmount;

    const laborCost = await db.laborCost.create({
      data: {
        projectId: id,
        workerId: body.workerId,
        description: body.description,
        workerPrice,
        markupPercentage,
        markupAmount,
        finalPrice,
        paidToWorker: body.paidToWorker || false,
        paidDate: body.paidDate ? new Date(body.paidDate) : null,
        notes: body.notes || null,
      },
      include: {
        worker: {
          select: { id: true, name: true, specialty: true },
        },
      },
    });

    return NextResponse.json(laborCost, { status: 201 });
  } catch (error) {
    console.error("Error creating labor cost:", error);
    return NextResponse.json(
      { error: "Error al crear el costo de mano de obra" },
      { status: 500 }
    );
  }
}
