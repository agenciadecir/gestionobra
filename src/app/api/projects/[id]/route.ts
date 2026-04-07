import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await db.project.findUnique({
      where: { id },
      include: {
        client: true,
        budgets: {
          include: { items: true },
          orderBy: { createdAt: "desc" },
        },
        invoices: {
          include: { payments: true, materials: true },
          orderBy: { createdAt: "desc" },
        },
        materials: {
          include: { invoice: { select: { id: true, number: true, status: true } } },
          orderBy: { createdAt: "desc" },
        },
        laborCosts: {
          include: {
            worker: {
              select: { id: true, name: true, specialty: true },
            },
            workerPayments: {
              orderBy: { date: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        workerPayments: {
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
        },
        tasks: {
          include: {
            worker: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Proyecto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Error al obtener el proyecto" },
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

    if (!body.title || !body.clientId) {
      return NextResponse.json(
        { error: "El título y el cliente son obligatorios" },
        { status: 400 }
      );
    }

    const project = await db.project.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description !== undefined ? body.description : null,
        clientId: body.clientId,
        address: body.address !== undefined ? body.address : null,
        status: body.status || "PRESUPUESTO",
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        notes: body.notes !== undefined ? body.notes : null,
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Error al actualizar el proyecto" },
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

    const project = await db.project.findUnique({ where: { id } });

    if (!project) {
      return NextResponse.json(
        { error: "Proyecto no encontrado" },
        { status: 404 }
      );
    }

    await db.project.delete({ where: { id } });

    return NextResponse.json({ message: "Proyecto eliminado correctamente" });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Error al eliminar el proyecto" },
      { status: 500 }
    );
  }
}
