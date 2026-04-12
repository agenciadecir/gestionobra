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

    // Batch mode: body.materials is an array
    if (body.materials && Array.isArray(body.materials)) {
      if (body.materials.length === 0) {
        return NextResponse.json(
          { error: "No se enviaron materiales" },
          { status: 400 }
        );
      }

      const validMaterials = body.materials.filter(
        (m: { description?: string }) => m.description && m.description.trim() !== ""
      );

      if (validMaterials.length === 0) {
        return NextResponse.json(
          { error: "Todos los materiales están vacíos" },
          { status: 400 }
        );
      }

      const results = await db.material.createMany({
        data: validMaterials.map(
          (m: {
            description: string;
            quantity?: number;
            unit?: string;
            unitCost?: number;
            purchasedBy?: string;
            reimbursed?: boolean;
            invoiceNumber?: string;
            notes?: string;
          }) => ({
            projectId: id,
            description: m.description.trim(),
            quantity: m.quantity || 1,
            unit: m.unit || "un",
            unitCost: m.unitCost || 0,
            totalCost: (m.quantity || 1) * (m.unitCost || 0),
            purchasedBy: m.purchasedBy || "YO",
            reimbursed: m.reimbursed || false,
            invoiceId: null,
            invoiceNumber: m.invoiceNumber || null,
            notes: m.notes || null,
          })
        ),
      });

      return NextResponse.json(
        { count: results.count, message: `${results.count} materiales creados` },
        { status: 201 }
      );
    }

    // Single mode (backward compatible)
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
