"use client";

import { useAtomValue } from "jotai";

import {
  pendingRememberMeChoiceAtom,
  useLoggedIn,
} from "@/api/auth";

import LoginBox from "./login";

export default function RequireLogin({
  children,
}: {
  children: React.ReactNode;
}) {
  const loggedIn = useLoggedIn();
  const pendingRememberMeChoice = useAtomValue(pendingRememberMeChoiceAtom);

  if (!loggedIn || pendingRememberMeChoice) {
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
