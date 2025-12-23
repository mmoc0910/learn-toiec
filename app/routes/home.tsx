import { Header } from "~/layouts/user-layout/items/header";
import type { Route } from "./+types/home";
import { Footer } from "~/layouts/user-layout/items/footer";
import { Banner } from "components/banner";
import { Courses } from "components/courses";
import { Exams } from "components/exams";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <div className="">
      <Banner />
      <div className="py-10"></div>
      <Courses/>
      <Exams/>
    </div>
  );
}
