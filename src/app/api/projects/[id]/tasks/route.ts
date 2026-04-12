import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tasks = await db.task.findMany({
      where: { projectId: id },
      include: {
        worker: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Error al obtener las tareas" },
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

    if (!body.title) {
      return NextResponse.json(
        { error: "El título es obligatorio" },
        { status: 400 }
      );
    }

    const task = await db.task.create({
      data: {
        projectId: id,
        title: body.title,
        description: body.description || null,
        status: body.status || "PENDIENTE",
        priority: body.priority || "MEDIA",
        workerId: body.assigneeType === "TRABAJADOR" ? (body.workerId || null) : null,
        assigneeType: body.assigneeType || null,
        assigneeName: body.assigneeName || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        completedDate:
          body.status === "COMPLETADA" ? new Date() : null,
      },
      include: {
        worker: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Error al crear la tarea" },
      { status: 500 }
    );
  }
}
