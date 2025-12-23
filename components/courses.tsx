export function Courses() {
  return (
    <div className="section-wrapper pb-20 space-y-5">
      <h3 className="text-center font-medium text-3xl capitalize">
        Lớp học nổi bật
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div
            key={item}
            className="bg-[#fde685] rounded-2xl border border-black p-3 space-y-2"
          >
            <img
              src="https://images.unsplash.com/photo-1518082593638-b6e73b35d39a?q=80&w=1168&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt={`Course ${item}`}
              className="w-full aspect-4/3 object-cover rounded-sm border border-black"
            />
            <div className="">
              <h4 className="text-lg">Khóa học {item}</h4>
              <p className="line-clamp-3 text-sm">
                Lorem ipsum dolor sit amet consectetur adipisicing elit.
                Repellendus fugiat magni recusandae eveniet odit, neque delectus
                ex veniam iste, ratione placeat? Dolorem sapiente aliquam
                blanditiis eveniet ducimus non obcaecati delectus.
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
