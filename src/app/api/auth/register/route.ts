import { NextRequest, NextResponse } from "next/server";
import { getDbPool, initDbTables } from "@/lib/tidb";
import bcrypt from "bcrypt";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    const db = getDbPool();

    // Ensure tables exist before any query
    await initDbTables();

    const [existing]: any = await db.query("SELECT id FROM users WHERE email = ?", [email]);

    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: "Email already exists" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const createdAt = Date.now();

    await db.query(
      "INSERT INTO users (`id`, `email`, `password_hash`, `name`, `createdAt`) VALUES (?, ?, ?, ?, ?)",
      [id, email, passwordHash, name, createdAt]
    );

    return NextResponse.json({ success: true, message: "User registered successfully" });
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

