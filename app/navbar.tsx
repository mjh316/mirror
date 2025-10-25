"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";

export default function Navbar() {
  return (
    <header className="flex justify-end items-center p-4 gap-4 h-16">
      <Unauthenticated>
        <SignInButton />
        <SignUpButton>Sign Up</SignUpButton>
      </Unauthenticated>
      <Authenticated>
        <UserButton />
      </Authenticated>
      <AuthLoading>Loading…</AuthLoading>
    </header>
  );
}
