import { Table, type Column } from "elements";
import { useState } from "react";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";
type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: string;
};

const columns: Column<User>[] = [
  { key: "name", header: "Tên", field: "name", sortable: true },
  { key: "email", header: "Email", field: "email" },
  {
    key: "role",
    header: "Vai trò",
    field: "role",
    sortable: true,
    render: (u) => (
      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
        {u.role}
      </span>
    ),
  },
  {
    key: "createdAt",
    header: "Ngày tạo",
    field: "createdAt",
    sortable: true,
  },
];
export default function Topics() {
  const [selected, setSelected] = useState<string[]>([]);

  const data: User[] = [
    {
      id: "1",
      name: "Nguyễn Văn A",
      email: "a@mail.com",
      role: "admin",
      createdAt: "2025-12-01",
    },
    {
      id: "2",
      name: "Trần Thị B",
      email: "b@mail.com",
      role: "user",
      createdAt: "2025-12-10",
    },
  ];
  return (
    <ContentLayoutWrapper heading="Chủ đề môn học">
      <div className="">
        <Table
          columns={columns}
          data={data}
          getRowId={(row) => row.id}
          selectable
          selectedIds={selected}
          onSelectedIdsChange={setSelected}
          onRowClick={(row) => console.log("click row", row)}
        />
      </div>
    </ContentLayoutWrapper>
  );
}
