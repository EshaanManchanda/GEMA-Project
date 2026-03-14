import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { FaStar, FaStarHalfAlt, FaRegStar, FaQuoteLeft } from "react-icons/fa";
import { TestimonialReview } from '../../types/review';

// Static reviews
const staticReviews: TestimonialReview[] = [
  {
    _id: "review-1",
    title: "Kidzania",
    comment: "5 stars for the venue itself...my 6 year just loves it and the variety here is commendable.",
    rating: 4.3,
    user: {
      name: "Meghan Nicole",
    },
    date: "2 weeks ago",
    verified: true,
  },
  {
    _id: "review-2",
    title: "Museum of The Future",
    comment: "One of the iconic location in Dubai. You can explore future technologies and Dubai vision ⭐⭐⭐⭐⭐ Absolutely incredible experience at the Museum of the Future! From the moment you see the building, you feel like you are in another world.",
    rating: 4.4,
    user: {
      name: "Niyas Pulpadan",
    },
    date: "1 month ago",
    verified: true,
  },
  {
    _id: "review-3",
    title: "Legoland® Dubai",
    comment: "Legoland theme park and water park is an absolutely amazing experience and a true heaven for children. My family had a wonderful time exploring both parks",
    rating: 4.4,
    user: {
      name: "moeen iqbal",
    },
    date: "3 weeks ago",
    verified: true,
  },
  {
    _id: "review-4",
    title: "Ferrari World Yas Island, Abu Dhabi",
    comment: "SUPER INCREDIBLE EXPERIENCE. The turbo ride is simply the best feeling of being alive and experiencing quickness. It was beautiful.",
    rating: 4.5,
    user: {
      name: "Essence Pickett",
    },
    date: "2 months ago",
    verified: true,
  },
];

const renderStars = (rating: number) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) stars.push(<FaStar key={i} className="text-yellow-400" />);
    else if (i - rating < 1) stars.push(<FaStarHalfAlt key={i} className="text-yellow-400" />);
    else stars.push(<FaRegStar key={i} className="text-gray-300" />);
  }
  return <div className="flex gap-1">{stars}</div>;
};

export default function ReviewCarouselSwiper() {
  
  return (
    <section className="w-full py-20" style={{
      backgroundImage: 'url(/assets/images/review-background.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }}>
      <div className="max-w-screen-xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-2">Our customers love it! ⭐ 4.7/5</h2>
          <p className="text-gray-700 max-w-2xl mx-auto">100,000 reviews to help you choose</p>
        </div>

        <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            navigation
            pagination={{ clickable: true }}
            spaceBetween={30}
            slidesPerView={1}
            breakpoints={{
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 3 }
            }}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            loop={true}
            className="pb-14"
          >
            {staticReviews.map((review) => (
              <SwiperSlide key={review._id}>
                <div className="bg-white rounded-xl shadow-md p-8 min-h-[320px] flex flex-col gap-4 hover:shadow-lg transition-all duration-300 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <FaQuoteLeft className="text-3xl opacity-20" style={{ color: 'var(--primary-color)' }} />
                    {review.verified && (
                      <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Verified
                      </div>
                    )}
                  </div>
                  <h4 className="font-semibold text-lg line-clamp-1" style={{ color: 'var(--primary-color)' }}>{review.title}</h4>
                  <p className="text-gray-700 flex-grow line-clamp-4">{review.comment}</p>
                  <div className="pt-4 mt-auto border-t border-gray-100 flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 142, 199, 0.1)' }}>
                      {review.user.avatar ? (
                        <img src={review.user.avatar} alt={review.user.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold" style={{ color: 'var(--primary-color)' }}>
                          {review.user.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{review.user.name}</p>
                      <p className="text-sm text-gray-700">{review.date}</p>
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-sm text-gray-700">{review.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
      </div>
    </section>
  );
}
