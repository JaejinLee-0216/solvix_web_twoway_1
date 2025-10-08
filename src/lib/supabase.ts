"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !anonKey) {
  throw new Error("Missing Supabase public environment variables");
}

export function createSupabaseClient() {
  return createBrowserClient(supabaseUrl, anonKey);
}


