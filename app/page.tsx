"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFFFFF] dark:bg-[#404040]">
      <main className="flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-6 py-16">
        {/* Badge */}
        <Badge
          variant="secondary"
          className="mb-6 bg-[#F7D7FF] text-[#404040] dark:bg-[#B3B3B3] dark:text-[#FFFFFF] border-[#D8D8D8] dark:border-[#B3B3B3]"
        >
          🤫 Speak to your reflection
        </Badge>

        {/* Main Card */}
        <Card className="w-full max-w-2xl border-[#D8D8D8] dark:border-[#404040] shadow-lg bg-white dark:bg-[#404040]">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-[#404040] flex items-center justify-center shadow-lg">
                  <span className="text-5xl">🪞</span>
                </div>
                {/* Animated gradient orb */}
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#F7D7FF] rounded-full blur-sm animate-pulse"></div>
              </div>
            </div>

            <CardTitle className="text-5xl font-bold text-[#404040] dark:text-[#FFFFFF]">
              Mirror
            </CardTitle>

            <CardDescription className="text-lg text-[#404040] dark:text-[#B3B3B3] max-w-md mx-auto">
              Where your reflection talks back. Dare to look deeper into the
              depths of your own voice.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <Authenticated>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto min-w-[200px] border-[#D8D8D8] dark:border-[#404040] hover:bg-[#F7D7FF] dark:hover:bg-[#B3B3B3] transition-all"
              >
                <Link href="/video" className="w-full sm:w-auto min-w-[200px]">
                  Visit Your Mirror
                </Link>
              </Button>
            </Authenticated>
            <Unauthenticated>
              <SignInButton
                mode="modal"
                forceRedirectUrl="/video"
                fallbackRedirectUrl="/video"
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto min-w-[200px] border-[#D8D8D8] dark:border-[#404040] hover:bg-[#F7D7FF] dark:hover:bg-[#B3B3B3] transition-all"
                >
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton
                mode="modal"
                forceRedirectUrl="/video"
                fallbackRedirectUrl="/video"
              >
                <Button
                  size="lg"
                  className="w-full sm:w-auto min-w-[200px] bg-[#404040] dark:bg-[#404040] hover:bg-[#404040]/90 dark:hover:bg-[#404040]/90 text-white shadow-lg"
                >
                  Begin Your Journey
                </Button>
              </SignUpButton>
            </Unauthenticated>
            <AuthLoading>
              <Skeleton className="w-full sm:w-auto min-w-[200px] h-10" />
            </AuthLoading>
          </CardContent>
        </Card>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 w-full max-w-4xl">
          <Card className="border-[#D8D8D8] dark:border-[#404040] bg-white dark:bg-[#404040]">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl mb-2">🎙️</div>
              <p className="text-sm font-medium text-[#404040] dark:text-[#FFFFFF]">
                Voice Capture
              </p>
            </CardContent>
          </Card>

          <Card className="border-[#D8D8D8] dark:border-[#404040] bg-white dark:bg-[#404040]">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl mb-2">✨</div>
              <p className="text-sm font-medium text-[#404040] dark:text-[#FFFFFF]">
                AI Insights
              </p>
            </CardContent>
          </Card>

          <Card className="border-[#D8D8D8] dark:border-[#404040] bg-white dark:bg-[#404040]">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl mb-2">🔮</div>
              <p className="text-sm font-medium text-[#404040] dark:text-[#FFFFFF]">
                Discover Truth
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
