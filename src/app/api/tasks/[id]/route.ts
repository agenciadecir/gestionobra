import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.task.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: "Tarea no encontrada" },
        { status: 404 }
      );
    }

    const isCompleting =
      body.status === "COMPLETADA" && existing.status !== "COMPLETADA";
    const isReopening =
      body.status !== "COMPLETADA" && existing.status === "COMPLETADA";

    const updated = await db.task.update({
      where: { id },
      data: {
        title: body.title !== undefined ? body.title : undefined,
        description:
          body.description !== undefined ? body.description : undefined,
        status: body.status !== undefined ? body.status : undefined,
        priority: body.priority !== undefined ? body.priority : undefined,
        workerId:
          body.workerId !== undefined
            ? body.workerId || null
            : undefined,
        assigneeType:
          body.assigneeType !== undefined ? body.assigneeType : undefined,
        assigneeName:
          body.assigneeName !== undefined ? body.assigneeName : undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : (body.dueDate === null ? null : undefined),
        completedDate: isCompleting
          ? new Date()
          : isReopening
            ? null
            : undefined,
      },
      include: {
        worker: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Error al actualizar la tarea" },
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

    const task = await db.task.findUnique({ where: { id } });

    if (!task) {
      return NextResponse.json(
        { error: "Tarea no encontrada" },
        { status: 404 }
      );
    }

    await db.task.delete({ where: { id } });

    return NextResponse.json({
      message: "Tarea eliminada correctamente",
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Error al eliminar la tarea" },
      { status: 500 }
    );
  }
}
