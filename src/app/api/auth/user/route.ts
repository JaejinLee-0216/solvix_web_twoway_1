import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const userInfo = request.cookies.get("userInfo");
    
    if (!userInfo) {
      return NextResponse.json({ success: false, message: "Not logged in" });
    }

    const user = JSON.parse(userInfo.value);
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Get user info error:", error);
    return NextResponse.json({ success: false, message: "Failed to get user info" });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === "logout") {
      const response = NextResponse.json({ success: true, message: "Logged out" });
      response.cookies.delete("userInfo");
      return response;
    }
    
    return NextResponse.json({ success: false, message: "Invalid action" });
  } catch (error) {
    console.error("User action error:", error);
    return NextResponse.json({ success: false, message: "Failed to process action" });
  }
}
