import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyStaff, hasRole } from "@/lib/verifyStaff";

function generateTempPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#";
  let pwd = "";
  for (let i = 0; i < 12; i++)
    pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

export async function GET(request: Request) {
  const staff = await verifyStaff(request);
  if (!staff || !hasRole(staff.role, "admin")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("staff")
    .select("id, email, role, created_at")
    .order("created_at");

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data });
}

export async function POST(request: Request) {
  const staff = await verifyStaff(request);
  if (!staff || !hasRole(staff.role, "admin")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await request.json();
  const { email, role } = body;

  if (!email || !role) {
    return NextResponse.json(
      { error: "Informations incomplètes." },
      { status: 400 },
    );
  }
  if (role === "admin" && staff.role !== "super_admin") {
    return NextResponse.json(
      { error: "Seul un super admin peut créer un admin." },
      { status: 403 },
    );
  }
  if (!["admin", "moderator"].includes(role)) {
    return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
  }

  const tempPassword = generateTempPassword();

  const { data: created, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message || "Impossible de créer le compte." },
      { status: 500 },
    );
  }

  const { error: staffError } = await supabaseAdmin.from("staff").insert({
    id: created.user.id,
    email,
    role,
    created_by: staff.user.id,
  });

  if (staffError) {
    return NextResponse.json({ error: staffError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, tempPassword });
}
