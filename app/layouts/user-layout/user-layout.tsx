import { Outlet } from "react-router";
import { Header } from "./items/header";
import { Footer } from "./items/footer";

export default function UserLayout() {
  return (
    <div className="min-h-screen flex flex-col relative pt-16">
      <Header />
      <div className="flex flex-1">
        <main className="w-full">
          <Outlet></Outlet>
        </main>
      </div>
      <Footer />
    </div>
  );
}
