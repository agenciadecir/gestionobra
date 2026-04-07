import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const material = await db.material.findUnique({ where: { id } });

    if (!material) {
      return NextResponse.json(
        { error: "Material no encontrado" },
        { status: 404 }
      );
    }

    const quantity = body.quantity !== undefined ? body.quantity : material.quantity;
    const unitCost = body.unitCost !== undefined ? body.unitCost : material.unitCost;

    const updated = await db.material.update({
      where: { id },
      data: {
        description: body.description !== undefined ? body.description : undefined,
        quantity,
        unit: body.unit !== undefined ? body.unit : undefined,
        unitCost,
        totalCost: quantity * unitCost,
        purchasedBy: body.purchasedBy !== undefined ? body.purchasedBy : undefined,
        reimbursed: body.reimbursed !== undefined ? body.reimbursed : undefined,
        invoiceNumber: body.invoiceNumber !== undefined ? body.invoiceNumber : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating material:", error);
    return NextResponse.json(
      { error: "Error al actualizar el material" },
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

    const material = await db.material.findUnique({ where: { id } });

    if (!material) {
      return NextResponse.json(
        { error: "Material no encontrado" },
        { status: 404 }
      );
    }

    await db.material.delete({ where: { id } });

    return NextResponse.json({
      message: "Material eliminado correctamente",
    });
  } catch (error) {
    console.error("Error deleting material:", error);
    return NextResponse.json(
      { error: "Error al eliminar el material" },
      { status: 500 }
    );
  }
}
