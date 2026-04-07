import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const worker = await db.worker.findUnique({
      where: { id },
      include: {
        laborCosts: {
          include: {
            project: {
              select: { id: true, title: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        tasks: {
          include: {
            project: {
              select: { id: true, title: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!worker) {
      return NextResponse.json(
        { error: "Trabajador no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(worker);
  } catch (error) {
    console.error("Error fetching worker:", error);
    return NextResponse.json(
      { error: "Error al obtener el trabajador" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    const worker = await db.worker.update({
      where: { id },
      data: {
        name: body.name,
        phone: body.phone !== undefined ? body.phone : null,
        specialty: body.specialty !== undefined ? body.specialty : null,
        notes: body.notes !== undefined ? body.notes : null,
      },
    });

    return NextResponse.json(worker);
  } catch (error) {
    console.error("Error updating worker:", error);
    return NextResponse.json(
      { error: "Error al actualizar el trabajador" },
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

    const worker = await db.worker.findUnique({ where: { id } });

    if (!worker) {
      return NextResponse.json(
        { error: "Trabajador no encontrado" },
        { status: 404 }
      );
    }

    await db.worker.delete({ where: { id } });

    return NextResponse.json({ message: "Trabajador eliminado correctamente" });
  } catch (error) {
    console.error("Error deleting worker:", error);
    return NextResponse.json(
      { error: "Error al eliminar el trabajador" },
      { status: 500 }
    );
  }
}
