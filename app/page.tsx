'use client';

import Image from "next/image";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-16">
        <Image
          className="dark:invert mb-8"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        
        <div className="flex flex-col items-center gap-6 text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Mirror
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-md">
            Where your reflection talks back.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <SignInButton 
            mode="modal"
            forceRedirectUrl="/video"
            fallbackRedirectUrl="/video"
          >
            <button className="flex h-12 items-center justify-center gap-2 rounded-full border border-solid border-black/[.08] dark:border-white/[.145] bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 px-5 text-gray-900 dark:text-white font-medium transition-colors">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton 
            mode="modal"
            forceRedirectUrl="/video"
            fallbackRedirectUrl="/video"
          >
            <button className="flex h-12 items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-5 text-white font-medium transition-colors">
              Sign Up
            </button>
          </SignUpButton>
        </div>
      </main>
    </div>
  );
}