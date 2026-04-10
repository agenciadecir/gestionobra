---
Task ID: 1
Agent: Main
Task: Build complete construction management system (ObraGestión)

Work Log:
- Designed Prisma schema with 10 models: Client, Worker, Project, Budget, BudgetItem, Invoice, Payment, Material, LaborCost, Task
- Pushed schema to SQLite database with bun run db:push
- Created TypeScript types at src/lib/types.ts
- Created Zustand store at src/lib/store.ts for SPA view management
- Built 19 API routes with full CRUD for all entities
- Built AppShell with responsive sidebar navigation
- Built Dashboard with 8 stat cards and recent projects table
- Built ClientsView with search, CRUD dialogs, table/cards
- Built WorkersView with search, CRUD dialogs, table
- Built ProjectsView with status filters, search, card grid, create dialog
- Built ProjectDetail with header, edit dialog, 6 tabs (Resumen, Presupuestos, Facturas & Pagos, Materiales, Mano de Obra, Tareas)
- Built BudgetsTab with accordion, dynamic items, status management
- Built InvoicesTab with payment tracking, progress bars, expandable payments
- Built MaterialsTab with summary cards, CRUD table, purchasedBy tracking
- Built LaborCostsTab with markup calculation, worker payment tracking
- Built TasksTab with priority sorting, quick status change, overdue detection
- Fixed TypeScript errors in ProjectDetail.tsx (zod schema types)
- Fixed tab component prop passing in ProjectDetail.tsx
- Updated page.tsx to import and render ProjectDetail
- ESLint: 0 errors, 1 expected warning
- TypeScript: 0 errors in src/ (only pre-existing error in skills/)

Stage Summary:
- Complete construction management webapp built and verified
- All API endpoints functional (confirmed with GET / 200 and API responses)
- System manages: clients (particular/consorcio), workers, projects, budgets with items, invoices with partial payments, materials with purchase tracking, labor costs with markup, tasks with priorities
- Argentine Peso currency formatting throughout
- Responsive design with mobile sidebar
---
Task ID: 2
Agent: Main
Task: Rediseñar flujo financiero completo del sistema ObraGestión

Work Log:
- Analizado el flujo de trabajo real del usuario (presupuesto → factura inicial → pagos → obra → factura final)
- Identificado problema principal: LaborCosts no se vinculaban a facturas (datos flotantes)
- Agregado campo `invoiceId` al modelo LaborCost en Prisma schema
- Agregada relación `laborCosts LaborCost[]` al modelo Invoice
- Actualizado types.ts con invoiceId en LaborCost y laborCosts en Invoice
- Actualizado GET /api/projects/[id] para incluir invoice en laborCosts y laborCosts en invoices
- Actualizado POST /api/projects/[id]/labor-costs para aceptar invoiceId
- Actualizado PUT /api/labor-costs/[id] para aceptar invoiceId (incluyendo null para desvincular)
- Reescrito LaborCostsTab: alerta de MO sin facturar, columna Factura Vinculada, link/unlink a facturas, selector de factura en create/edit
- Reescrito InvoicesTab: sección "Mano de Obra vinculada" por factura con desglose, breakdown completo (monto - MO - materiales = diferencia)
- Rediseñado Resumen en ProjectDetail: Flujo Financiero visual con 4 secciones (Ingresos del Cliente, Mano de Obra, Materiales, Ganancia de la Obra), 12 KPI cards
- Push schema a SQLite DB, lint 0 errors, compilación exitosa GET / 200

Stage Summary:
- Flujo financiero ahora conecta todos los datos: LaborCost ↔ Invoice ↔ Payment
- El Resumen muestra claramente: qué se facturó, qué se cobró, qué se pagó al trabajador, materiales, reintegros, y ganancia bruta
- No hay más "datos flotantes": MO y materiales sin facturar generan alertas visibles
- Cada factura muestra desglose completo: MO vinculada + Materiales vinculados

---
Task ID: 3
Agent: Main
Task: Remove markup from LaborCost - define it only in Budget

Work Log:
- Removed markupPercentage, markupAmount, finalPrice fields from LaborCost in Prisma schema
- Updated types.ts: removed markup fields from LaborCost type
- Updated API routes: removed markup logic from POST and PUT labor-costs
- Rewrote LaborCostsTab: removed markup from form, table columns, summary cards (5→4 cards), mobile details
- Updated ProjectDetail summary: replaced markup ganancia with budget vs actual comparison (MO presupuestada vs costo real)
- Updated InvoicesTab: removed markup references, simplified labor cost breakdown per invoice
- Pushed schema to DB (with --accept-data-loss for existing markup columns)
- ESLint: 0 errors
- Server: GET / 200 OK

Stage Summary:
- Markup is now defined ONLY in the Budget (as part of the price to the client)
- LaborCost now stores only real costs paid to the worker (workerPrice)
- Summary shows "MO Presupuestada" vs "Costo real trabajador" with difference = ganancia
- No more duplicate markup entries anywhere in the system

---
Task ID: 1
Agent: Main
Task: Rediseñar flujo de materiales y ganancia real en ProjectDetail

Work Log:
- Analizó el problema: materiales comprados por el usuario se descuentan de la ganancia pero no se retribuyen al cliente
- Separó materiales en "trasladados" (vinculados a factura = pasamano, neutro) vs "sin trasladar" (pérdida real)
- Nueva fórmula de ganancia: Facturado − Costo MO − Materiales SIN trasladar
- Reescribió sección "Resultado de la Obra" con 4 paneles: Ganancia Real, Dinero en bolsillo, Obligaciones pendientes, Materiales (trasladados vs sin trasladar)
- Actualizó KPI cards: Mat. Trasladados (en factura, neutro) y Mat. Sin Trasladar (¡sin cobrar!)
- Agregó iconos ArrowDownRight/ArrowUpRight/CircleCheck/CircleX/PiggyBank para mejor UX
- 0 errores de lint, servidor corriendo correctamente

Stage Summary:
- La ganancia ya NO descuenta materiales que ya están en la factura
- Solo los materiales SIN trasladar se restan como pérdida
- Los materiales trasladados se marcan como "neutros" (el usuario pagó y ya lo cobró en la factura)
- Panel de materiales ahora muestra claramente trasladados vs sin trasladar con alertas visuales
