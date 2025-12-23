import { Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

export function Banner() {
  return (
    <Swiper
      autoplay={{
        delay: 2500,
        disableOnInteraction: false,
      }}
      pagination={{ clickable: true }}
      modules={[Autoplay, Pagination]}
    >
      <SwiperSlide>
        <img
          src="https://images.unsplash.com/photo-1518082593638-b6e73b35d39a?q=80&w=1168&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          className="banner-item"
        />
      </SwiperSlide>
      <SwiperSlide>
        <img
          src="https://images.unsplash.com/photo-1543109740-4bdb38fda756?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          className="banner-item"
        />
      </SwiperSlide>
      <SwiperSlide>
        <img
          src="https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          className="banner-item"
        />
      </SwiperSlide>
    </Swiper>
  );
}
