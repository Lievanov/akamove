import { NextResponse } from "next/server";
import moment from "moment";
import { getPushTokens } from "@/api/profiles/profiles";
import supabaseAdmin from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    const event = await request.json();
    const tokens = await getPushTokens(supabaseAdmin);
    if (tokens.length === 0) return NextResponse.json({ sent: 0 });

    const messages = tokens.map((token) => ({
      to: token,
      title: `${event.event_name} 🔥`,
      body: event.event_date
        ? moment(event.event_date).format("MMMM D, YYYY")
        : "Check the app for details!",
      data: { eventId: event.id },
    }));

    for (let i = 0; i < messages.length; i += 100) {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messages.slice(i, i + 100)),
      });
      const result = await response.json();
      console.log("[notify-event] expo response:", JSON.stringify(result));
    }

    return NextResponse.json({ sent: messages.length });
  } catch (error) {
    console.error("Error sending event push notifications", error);
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 }
    );
  }
}
