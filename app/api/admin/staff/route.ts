import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyStaff, hasRole } from "@/lib/verifyStaff";
import { setMatricule, getStaffIdsWithMatricule } from "@/lib/matricule";

function generateTempPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#";
  let pwd = "";
  for (let i = 0; i < 12; i++) pwd += chars[crypto.randomInt(0, chars.length)];
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

  // Indique, pour chaque modérateur, s'il a déjà un matricule (sans jamais le révéler)
  const moderatorIds = (data || [])
    .filter((member) => member.role === "moderator")
    .map((member) => member.id as string);
  const withMatricule = await getStaffIdsWithMatricule(moderatorIds);

  const members = (data || []).map((member) => ({
    ...member,
    has_matricule: withMatricule.has(member.id as string),
  }));

  return NextResponse.json({ staff: members });
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
    // On ne laisse pas un compte orphelin
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: staffError.message }, { status: 500 });
  }

  // Seuls les modérateurs ont un matricule
  let matricule: string | null = null;
  if (role === "moderator") {
    const result = await setMatricule(created.user.id);
    if ("error" in result) {
      await supabaseAdmin.from("staff").delete().eq("id", created.user.id);
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      return NextResponse.json(
        { error: `Impossible de générer le matricule : ${result.error}` },
        { status: 500 },
      );
    }
    matricule = result.matricule;
  }

  return NextResponse.json({ success: true, tempPassword, matricule });
}