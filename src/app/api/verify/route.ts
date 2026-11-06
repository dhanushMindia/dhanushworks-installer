import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { provider, token } = await request.json();

    if (!token) {
      return NextResponse.json({ verified: false, error: "Token is required" }, { status: 400 });
    }

    if (provider === "github") {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "Dhanushworks-Installer",
        },
      });
      if (res.ok) {
        const user = await res.json();
        return NextResponse.json({ verified: true, username: user.login });
      } else {
        return NextResponse.json({ verified: false, error: "Invalid GitHub Personal Access Token" });
      }
    }

    if (provider === "supabase") {
      const res = await fetch("https://api.supabase.com/v1/organizations", {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "Dhanushworks-Installer",
        },
      });
      if (res.ok) {
        const orgs = await res.json();
        return NextResponse.json({ verified: true, orgs });
      } else {
        return NextResponse.json({ verified: false, error: "Invalid Supabase Management API Token" });
      }
    }

    if (provider === "vercel") {
      const res = await fetch("https://api.vercel.com/v2/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "Dhanushworks-Installer",
        },
      });
      if (res.ok) {
        const user = await res.json();
        return NextResponse.json({ verified: true, user: user.user?.username || user.username });
      } else {
        return NextResponse.json({ verified: false, error: "Invalid Vercel API Token" });
      }
    }

    return NextResponse.json({ verified: false, error: "Unknown provider" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ verified: false, error: error.message || "Verification failed" }, { status: 500 });
  }
}
