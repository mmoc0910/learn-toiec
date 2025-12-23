import { div } from "framer-motion/client";
import type React from "react";

type Props = { children?: React.ReactNode; heading?: string };
export const ContentLayoutWrapper: React.FC<Props> = ({
  children,
  heading,
}) => {
  return (
    <div >
      <header className="fixed w-full top-0 bg-white px-4 py-5 border-b border-slate-200 h-16">
        <h1 className="text-xl font-semibold">{heading}</h1>
      </header>
      <main className="pt-20 p-5">{children}</main>
    </div>
  );
};
