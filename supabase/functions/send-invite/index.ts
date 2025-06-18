// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Import Supabase client for Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const defaultResponse = ({
  emailSent,
  inviteInserted,
  status,
  message,
}: {
  emailSent: boolean;
  inviteInserted: boolean;
  status: number;
  message?: string;
}) => {
  return new Response(JSON.stringify({ emailSent, inviteInserted, message }), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    },
  });
};

Deno.serve(async (req) => {
  // if (req.method !== "POST") {
  //   return defaultResponse({
  //     message: "Method not allowed",
  //     emailSent: false,
  //     inviteInserted: false,
  //     status: 405,
  //   });
  // }

  // Get JWT from Authorization header
  const authHeader = req.headers.get("Authorization");
  const jwt = authHeader?.replace(/^Bearer /, "");
  if (!jwt) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401 },
    );
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return defaultResponse({
      message: "Invalid JSON",
      emailSent: false,
      inviteInserted: false,
      status: 400,
    });
  }

  const { email, group_id } = payload;
  if (!email || !group_id) {
    return defaultResponse({
      message: "Missing email or group_id",
      emailSent: false,
      inviteInserted: false,
      status: 400,
    });
  }

  // Create Supabase client with JWT for RLS
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("*")
    .eq("id", group_id)
    .single();

  if (groupError) {
    return defaultResponse({
      message: groupError.message,
      emailSent: false,
      inviteInserted: false,
      status: 403,
    });
  }

  // Insert invite
  const { error } = await supabase
    .from("invites")
    .insert({ email, group_id, pending: true })
    .select()
    .single();

  if (error) {
    return defaultResponse({
      message: error.message,
      emailSent: false,
      inviteInserted: false,
      status: 500,
    });
  }

  // Send email using Resend API
  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "noreply@rjborba.com", // Change to your verified sender
      to: [email],
      subject: `You have been invited to ${group.name} on Fina`,
      html: `
      <div>
        <p>You have been invited to join group ${group_id}.</p>
        <p>Click <a href="https://fina.rjborba.com/invite/${group.id}">here</a> to accept the invite.</p>
      </div>`,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.text();

    return defaultResponse({
      message: `Invite created, but failed to send email: ${err}`,
      emailSent: false,
      inviteInserted: true,
      status: 500,
    });
  }

  return defaultResponse({
    message: "Invite created and email sent",
    emailSent: true,
    inviteInserted: true,
    status: 200,
  });
});
