"use client";

import { Client } from "react-hydration-provider";

import { useLoggedIn } from "@/api/auth";

import LoginBox from "./login-box";

export default function RequireLogin({
  children,
}: {
  children: React.ReactNode;
}) {
  const loggedIn = useLoggedIn();

  return <Client>{loggedIn ? children : <LoginNotice />}</Client>;
}

function LoginNotice() {
  return (
    <div className="flex-grow flex flex-col items-center place-items-center">
      <LoginBox />
    </div>
  );
}
