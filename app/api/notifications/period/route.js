import { NextResponse } from "next/server";
import { getPushTokens } from "@/api/profiles/profiles";

export async function POST(request) {
  try {
    const period = await request.json();
    const tokens = await getPushTokens();
    if (tokens.length === 0) return NextResponse.json({ sent: 0 });

    const messages = tokens.map((token) => ({
      to: token,
      title: `${period.name} has been released 🔥🚀`,
      body: "Open the app now to join your classes!",
      data: { periodId: period.id },
    }));

    for (let i = 0; i < messages.length; i += 100) {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messages.slice(i, i + 100)),
      });
      const result = await response.json();
      console.log("[notify-period] expo response:", JSON.stringify(result));
    }

    return NextResponse.json({ sent: messages.length });
  } catch (error) {
    console.error("Error sending period push notifications", error);
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 }
    );
  }
}
