"use client";

import { useLoggedIn } from "@/api/auth";

import LoginBox from "./login-box";

export default function RequireLogin({
  children,
}: {
  children: React.ReactNode;
}) {
  const loggedIn = useLoggedIn();

  if (!loggedIn) {
    return <LoginNotice />;
  }

  return children;
}

function LoginNotice() {
  return (
    <div className="flex-grow flex flex-col items-center place-items-center">
      <LoginBox />
    </div>
  );
}
