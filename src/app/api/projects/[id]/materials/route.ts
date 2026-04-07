import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const materials = await db.material.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(materials);
  } catch (error) {
    console.error("Error fetching materials:", error);
    return NextResponse.json(
      { error: "Error al obtener los materiales" },
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

    if (!body.description) {
      return NextResponse.json(
        { error: "La descripción es obligatoria" },
        { status: 400 }
      );
    }

    const quantity = body.quantity || 1;
    const unitCost = body.unitCost || 0;

    const material = await db.material.create({
      data: {
        projectId: id,
        description: body.description,
        quantity,
        unit: body.unit || "un",
        unitCost,
        totalCost: quantity * unitCost,
        purchasedBy: body.purchasedBy || "YO",
        reimbursed: body.reimbursed || false,
        invoiceId: body.invoiceId || null,
        invoiceNumber: body.invoiceNumber || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error("Error creating material:", error);
    return NextResponse.json(
      { error: "Error al crear el material" },
      { status: 500 }
    );
  }
}
