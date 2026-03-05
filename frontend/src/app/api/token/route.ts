import { getServerSession } from "next-auth";
import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

  const token = await new SignJWT({
    email: session.user.email,
    name: session.user.name,
    picture: session.user.image,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);

  return NextResponse.json({ token });
}
