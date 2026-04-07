import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const projects = await db.project.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { title: { contains: search } },
                  { description: { contains: search } },
                  { address: { contains: search } },
                  { client: { name: { contains: search } } },
                ],
              }
            : {},
          status ? { status } : {},
        ],
      },
      include: {
        client: {
          select: { id: true, name: true, phone: true, email: true },
        },
        _count: {
          select: {
            budgets: true,
            invoices: true,
            materials: true,
            laborCosts: true,
            tasks: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Error al obtener los proyectos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.title || !body.clientId) {
      return NextResponse.json(
        { error: "El título y el cliente son obligatorios" },
        { status: 400 }
      );
    }

    const project = await db.project.create({
      data: {
        title: body.title,
        description: body.description || null,
        clientId: body.clientId,
        address: body.address || null,
        status: body.status || "PRESUPUESTO",
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        notes: body.notes || null,
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Error al crear el proyecto" },
      { status: 500 }
    );
  }
}
