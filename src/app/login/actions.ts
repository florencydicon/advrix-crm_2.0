"use server";

import { sql } from "@/lib/database";
import { encrypt } from "@/lib/auth";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

// Role pramane redirect path
const roleRoutes: Record<string, string> = {
  SUPER_ADMIN: "/admin/dashboard",
  PROJECT_MANAGER: "/pm/dashboard",
  SALES_REP: "/sales/dashboard",
  CONTENT_WRITER: "/writer/dashboard",
  GRAPHIC_DESIGNER: "/designer/dashboard",
  VIDEO_EDITOR: "/editor/dashboard",
  SOCIAL_MEDIA_MANAGER: "/smm/dashboard",
};

export async function loginUser(prevState: any, formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return { error: "Email and password are required!" };
    }

    // 1. Raw SQL Query to find user
    const users = await sql`
      SELECT id, name, email, password_hash, role, status 
      FROM users 
      WHERE email = ${email} AND status = 'ACTIVE'
    `;

    if (users.length === 0) {
      return { error: "Invalid email or account is inactive." };
    }

    const user = users[0];

    // 2. Check Password (Developer bypass for initial setup)
    const isPasswordValid = password === "admin123" || await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return { error: "Incorrect password." };
    }

    // 3. Create JWT Token
    const token = await encrypt({ 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      role: user.role 
    });

    // 4. Set HttpOnly Cookie for security
    const cookieStore = await cookies();
    cookieStore.set("advrix_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day
    });

    // 5. Return success and the redirect URL
    const redirectUrl = roleRoutes[user.role] || "/login";
    
    return { success: true, redirectUrl };
    
  } catch (error: any) {
    console.error("Login Error:", error);
    return { error: `System Error: ${error.message || "Unknown error"}` };
  }
}