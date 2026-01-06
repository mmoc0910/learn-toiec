import { Outlet } from "react-router";
import { Header } from "./items/header";
import { Footer } from "./items/footer";
import { Chatbox } from "./items/chatbox";
import { useAuth } from "hooks/useAuth";

export default function UserLayout() {
  useAuth();
  return (
    <div className="min-h-screen flex flex-col relative pt-16">
      <Header />

      <div className="flex flex-1">
        <main className="w-full">
          <Outlet />
        </main>
      </div>

      {/* <Footer /> */}

      {/* ✅ Chatbox floating */}
      <Chatbox />
    </div>
  );
}
