import { useKeenSlider } from 'keen-slider/react';
import 'keen-slider/keen-slider.min.css';
import { FaStar, FaStarHalfAlt, FaRegStar, FaQuoteLeft, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { TestimonialReview } from '../../types/review';

// Autoplay plugin with 5-second interval (matches BannerCarousel.tsx pattern)
const AutoplayPlugin = (slider: any) => {
  let timeout: NodeJS.Timeout;
  let mouseOver = false;

  function clearNextTimeout() {
    clearTimeout(timeout);
  }

  function nextTimeout() {
    clearTimeout(timeout);
    if (mouseOver) return;
    timeout = setTimeout(() => {
      slider.next();
    }, 5000);
  }

  slider.on("created", () => {
    slider.container.addEventListener("mouseover", () => {
      mouseOver = true;
      clearNextTimeout();
    });
    slider.container.addEventListener("mouseout", () => {
      mouseOver = false;
      nextTimeout();
    });
    nextTimeout();
  });

  slider.on("animationEnded", nextTimeout);
  slider.on("updated", nextTimeout);
};

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
  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>(
    {
      loop: true,
      slides: { perView: 1, spacing: 30 },
      breakpoints: {
        '(min-width: 640px)': { slides: { perView: 2, spacing: 30 } },
        '(min-width: 1024px)': { slides: { perView: 3, spacing: 30 } },
      },
    },
    [AutoplayPlugin]
  );

  return (
    <section className="w-full py-12 sm:py-20" style={{
      backgroundImage: 'url(/assets/images/review-background.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-3xl md:text-4xl font-bold mb-2">Our customers love it! ⭐ 4.7/5</h2>
          <p className="text-sm sm:text-base text-gray-700 max-w-2xl mx-auto">100,000 reviews to help you choose</p>
        </div>

        <div className="relative">
          <div ref={sliderRef} className="keen-slider pb-14">
            {staticReviews.map((review) => (
              <div key={review._id} className="keen-slider__slide">
                <div className="bg-white rounded-xl shadow-md p-4 sm:p-8 min-h-[280px] sm:min-h-[320px] flex flex-col gap-3 sm:gap-4 hover:shadow-lg transition-all duration-300 border border-gray-100">
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
              </div>
            ))}
          </div>

          {/* Custom navigation buttons */}
          <button
            onClick={() => instanceRef.current?.prev()}
            className="review-prev absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:shadow-lg transition-all duration-200 hidden sm:flex"
            aria-label="Previous review"
          >
            <FaChevronLeft size={14} />
          </button>
          <button
            onClick={() => instanceRef.current?.next()}
            className="review-next absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:shadow-lg transition-all duration-200 hidden sm:flex"
            aria-label="Next review"
          >
            <FaChevronRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
