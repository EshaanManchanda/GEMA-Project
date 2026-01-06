export interface ClassOffering {
    course_name: string;
    target_age: string;
    duration: string;
    price_aed: number;
    pricing_unit?: string;
    class_size?: string;
    syllabus_highlights?: string[];
    focus?: string;
}

export interface StudioFacilities {
    type: string;
    amenities: string[];
}

export interface Testimonial {
    student_name: string;
    age?: number;
    quote?: string;
    parent_quote?: string;
}

export interface FAQ {
    [key: string]: string;
}

export interface PersonalInfo {
    name: string;
    title: string;
    location: string;
    languages_spoken: string[];
    years_active: number;
    contact_email: string;
    social_handle: string;
}

export interface ProfessionalBio {
    summary: string;
    certifications: string[];
    teaching_style: string;
}

export interface Instructor {
    id: string;
    name: string;
    workshop: string;
    image: string;
    location: string;
    color: string;
    // New rich data fields (optional for backward compatibility if we had partial data, but we'll try to fill all)
    personal_info?: PersonalInfo;
    professional_bio?: ProfessionalBio;
    class_offerings?: ClassOffering[];
    studio_facilities?: StudioFacilities;
    testimonials?: Testimonial[];
    faq?: FAQ;
}

export const instructors: Instructor[] = [
    {
        id: 'colette-davis',
        name: 'Colette Davis',
        workshop: 'Baking Workshop',
        image: '/assets/images/instructor/Colette Davis.webp',
        location: 'Dubai',
        color: 'from-orange-500/80',
        personal_info: {
            name: "Colette Davis",
            title: "Expert Pastry Chef & Baking Instructor",
            location: "Downtown Dubai, Dubai, United Arab Emirates",
            languages_spoken: ["English", "French"],
            years_active: 12,
            contact_email: "colette@sweetcreations.ae",
            social_handle: "@ColetteBakes"
        },
        professional_bio: {
            summary: "Colette is a classically trained pastry chef who brings the art of French patisserie to young bakers. She believes that baking is a perfect blend of science and art, teaching patience and precision through delicious results.",
            certifications: [
                "Diplôme de Pâtisserie - Le Cordon Bleu",
                "Certified Food Safety Manager"
            ],
            teaching_style: "Hands-on and interactive. Colette focuses on technique while encouraging creativity in decoration."
        },
        class_offerings: [
            {
                course_name: "Junior Bakers Academy",
                target_age: "8-12 years",
                duration: "4 Weeks",
                price_aed: 1400,
                class_size: "Max 6 Students",
                syllabus_highlights: [
                    "Week 1: Cookie fundamentals & dough science",
                    "Week 2: Cupcake mastery & frosting techniques",
                    "Week 3: Introduction to pastry & tarts",
                    "Week 4: Celebration cakes"
                ]
            }
        ],
        studio_facilities: {
            type: "Professional Teaching Kitchen",
            amenities: [
                "Individual baking stations",
                "Commercial grade ovens",
                "Decorating tools library",
                "Parent viewing lounge"
            ]
        },
        testimonials: [
            {
                student_name: "Sarah J.",
                age: 9,
                quote: "I made a birthday cake for my dad and he couldn't believe I did it all by myself!"
            }
        ],
        faq: {
            "q1": "Are ingredients provided?",
            "a1": "Yes, all high-quality ingredients and tools are included in the course fee."
        }
    },
    {
        id: 'anne-amin',
        name: 'Anne Amin',
        workshop: 'Fashion Designing',
        image: '/assets/images/instructor/Anne Amin.webp',
        location: 'Sharjah',
        color: 'from-pink-500/80',
        personal_info: {
            name: "Anne Amin",
            title: "Fashion Designer & Textile Artist",
            location: "Al Majaz, Sharjah, United Arab Emirates",
            languages_spoken: ["English", "Arabic"],
            years_active: 10,
            contact_email: "anne@fashionforward.ae",
            social_handle: "@DesignsByAnne"
        },
        professional_bio: {
            summary: "Anne inspires the next generation of designers by combining traditional techniques with sustainable fashion concepts. Her workshops empower students to express their unique style through fabric and form.",
            certifications: [
                "BA in Fashion Design",
                "Sustainability in Fashion Certificate"
            ],
            teaching_style: "Creative and exploratory. Anne encourages students to think outside the box and find their own voice.",

        },
        class_offerings: [
            {
                course_name: "Young Designers Studio",
                target_age: "10-15 years",
                duration: "6 Weeks",
                price_aed: 1800,
                class_size: "Max 8 Students",
                syllabus_highlights: [
                    "Week 1: Sketching & Mood Boards",
                    "Week 2: Fabric Science & Selection",
                    "Week 3-4: Hand Sewing & Embroidery",
                    "Week 5-6: Creating your first garment"
                ]
            }
        ],
        studio_facilities: {
            type: "Design Atelier",
            amenities: [
                "Pattern making tables",
                "Sewing machine stations",
                "Fabric library",
                "Sketching corner"
            ]
        },
        testimonials: [
            {
                student_name: "Layla K.",
                age: 12,
                quote: "I learned how to sew my own skirt! Ms. Anne made it so easy to understand."
            }
        ],
        faq: {
            "q1": "Do we need a sewing machine at home?",
            "a1": "It's helpful but not required. Students can practice hand stitching at home."
        }
    },
    {
        id: 'shailesh-kumar',
        name: 'Shailesh Kumar',
        workshop: 'Guitar Workshop',
        image: '/assets/images/instructor/Shailesh Kumar.webp',
        location: 'Ajman',
        color: 'from-blue-500/80',
        personal_info: {
            name: "Shailesh Kumar",
            title: "Senior Guitar Instructor & Founder, Kumar Music Studio",
            location: "Al Nuaimia, Ajman, United Arab Emirates",
            languages_spoken: ["English", "Hindi", "Basic Arabic"],
            years_active: 15,
            contact_email: "shailesh@kumarmusicajman.com",
            social_handle: "@StrumWithShailesh"
        },
        professional_bio: {
            summary: "Shailesh is a dedicated musician and patient educator who has transformed a corner of his home in Ajman into a sanctuary for budding musicians. With a background in classical and contemporary acoustic guitar, he specializes in helping students overcome the initial 'finger pain' barrier to find joy in music.",
            certifications: [
                "Trinity College London - Grade 8 Guitar",
                "Certified Music Pedagogy Specialist"
            ],
            teaching_style: "The 'Small Wins' Approach. Shailesh breaks down complex movements into micro-tasks, ensuring the student feels a sense of accomplishment in every 30-minute session."
        },
        class_offerings: [
            {
                course_name: "Guitar Zero to Hero (Level 1)",
                target_age: "8-14 years",
                duration: "12 Weeks (1 session/week)",
                price_aed: 1200,
                class_size: "Individual or Pair",
                syllabus_highlights: [
                    "Week 1-2: Anatomy of the guitar & The 'Spider' finger exercise",
                    "Week 3-6: The 'Magic Four' chords (G, C, D, Em)",
                    "Week 7-9: Rhythm basics & the 4/4 strum",
                    "Week 10-12: Learning your first full pop song"
                ]
            },
            {
                course_name: "Adult Hobbyist Evening Sessions",
                target_age: "18+",
                duration: "Ongoing / Flexible",
                price_aed: 150,
                pricing_unit: "per hour",
                focus: "Stress relief through music, learning specific favorite songs, and basic theory."
            }
        ],
        studio_facilities: {
            type: "Home Studio (converted majestic room)",
            amenities: [
                "Sound-proofed practice area",
                "Spare guitars for trial lessons",
                "Recording equipment for student progress reviews",
                "Comfortable waiting area for parents"
            ]
        },
        testimonials: [
            {
                student_name: "Rohan M.",
                age: 10,
                quote: "I wanted to quit because my fingers hurt, but Mr. Shailesh showed me a trick to hold the strings easier. Now I can play 'Happy Birthday' for my mom."
            },
            {
                student_name: "Sarah A.",
                parent_quote: "We tried online videos, but Shailesh's patience is what actually got my daughter playing. He is very kind and creates a zero-pressure environment."
            }
        ],
        faq: {
            "q1": "Do I need to buy a guitar before the first lesson?",
            "a1": "For the trial lesson, you can use one of mine. After that, I can recommend affordable starter models available in Ajman."
        }
    },
    {
        id: 'j-galindo',
        name: 'J. Galindo',
        workshop: 'Robotics Workshop',
        image: '/assets/images/instructor/J. Galindo.webp',
        location: 'Abu Dhabi',
        color: 'from-red-500/80',
        personal_info: {
            name: "J. Galindo",
            title: "Lead STEM Educator & Robotics Director",
            location: "Al Reem Island, Abu Dhabi, United Arab Emirates",
            languages_spoken: ["English"],
            years_active: 15,
            contact_email: "j.galindo@abudhabirobotics.com",
            social_handle: "@GalindoBuildsFuture"
        },
        professional_bio: {
            summary: "An energetic Australian expat, J. Galindo brings a 'fail-forward' philosophy to STEM education. He treats his classroom like a startup incubator where kids are treated as junior engineers. His classes are known for high energy, loud cheers when robots work, and deep focus during coding sprints.",
            certifications: [
                "LEGO® Education Academy Certified Trainer",
                "Bachelor of Education (Science & Technology)",
                "First LEGO League (FLL) Coach"
            ],
            teaching_style: "Inquiry-Based Learning. He rarely gives the answer; instead, he asks, 'Why do you think the robot turned left instead of right?' guiding students to debug their own logic."
        },
        class_offerings: [
            {
                course_name: "Junior Innovators (SPIKE Essential)",
                target_age: "6-9 years",
                duration: "8 Weeks",
                price_aed: 1600,
                class_size: "Max 8 Students",
                syllabus_highlights: [
                    "Week 1-2: Motors and Sensors basics",
                    "Week 3-4: Building a carnival ride (Gears & Speed)",
                    "Week 5-6: Storytelling with code (Lights & Sound)",
                    "Week 7-8: Final Group Challenge: The Smart City"
                ]
            },
            {
                course_name: "Master Coders (Python & SPIKE Prime)",
                target_age: "10-14 years",
                duration: "10 Weeks",
                price_aed: 2200,
                class_size: "Max 6 Students",
                syllabus_highlights: [
                    "Week 1-3: Transitioning from blocks to Python text coding",
                    "Week 4-6: Advanced sensor logic (Gyro & Color)",
                    "Week 7-10: The Mars Rover Mission (Autonomous Navigation)"
                ]
            }
        ],
        studio_facilities: {
            type: "Commercial Education Lab",
            amenities: [
                "Individual workstations with MacBooks/iPads",
                "Competition-grade robotics tables",
                "3D Printer station for custom parts",
                "Lounge area with live feed for parents"
            ]
        },
        testimonials: [
            {
                student_name: "Khalifa Al Nahyan",
                age: 11,
                quote: "Mr. Galindo let us build a robot that could wrestle! It was the best class ever."
            },
            {
                student_name: "Mrs. Wilson",
                parent_quote: "Finally, a screen-time activity that is actually productive. My son talks about 'loops' and 'variables' at the dinner table now."
            }
        ],
        faq: {
            "q1": "Is this just playing with LEGOs?",
            "a1": "No. While we use LEGO bricks, the core of the class is physics, mechanics, and computer science logic. The bricks are just the medium."
        }
    },
    {
        id: 'mariyam-fatima',
        name: 'Mariyam Fatima',
        workshop: 'Soap Making',
        image: '/assets/images/instructor/Mariyam Fatima.webp',
        location: 'Ras Al Khaimah',
        color: 'from-green-500/80',
        personal_info: {
            name: "Mariyam Fatima",
            title: "Artisan Soap Maker & Creative Director",
            location: "Al Hamra Village, Ras Al Khaimah, United Arab Emirates",
            languages_spoken: ["Arabic", "English"],
            years_active: 6,
            contact_email: "mariyam@rakcreative.ae",
            social_handle: "@MariyamMakes"
        },
        professional_bio: {
            summary: "Mariyam combines her Emirati heritage with modern crafting techniques. She is passionate about natural living and sustainable art. Her workshops are designed to be a sensory retreat, focusing on the therapeutic aspects of scent and texture while teaching the chemistry of saponification in a kid-safe way.",
            certifications: [
                "Diploma in Organic Skincare Formulation",
                "Certified Children's Art Facilitator"
            ],
            teaching_style: "Sensory & Nurturing. Mariyam encourages students to smell, touch, and observe. She emphasizes that there are 'no mistakes in art,' only new designs."
        },
        class_offerings: [
            {
                course_name: "Little Perfumers & Soap Makers",
                target_age: "6-12 years",
                duration: "90 Minute Workshop",
                price_aed: 180,
                pricing_unit: "per child (materials included)",
                class_size: "Max 10 Students",
                syllabus_highlights: [
                    "Introduction to Melt & Pour bases (Shea Butter vs. Glycerin)",
                    "Scent blending math (Top, Middle, Base notes)",
                    "Color mixing theory",
                    "Embedding botanicals (Rose petals, Lavender, Dried Orange)"
                ]
            },
            {
                course_name: "Mommy & Me: Natural Spa Day",
                target_age: "4-8 years (with parent)",
                duration: "2 Hours",
                price_aed: 300,
                pricing_unit: "per couple",
                focus: "Creating a matching set of soaps and bath salts using local RAK ingredients like Sidr Honey and Camel Milk powder."
            }
        ],
        studio_facilities: {
            type: "Boutique Art Studio",
            amenities: [
                "Large, low-height crafting tables for kids",
                "Scent Library wall with over 30 essential oils",
                "Drying racks and professional packaging station",
                "Natural light and view of the Al Hamra lagoon"
            ]
        },
        testimonials: [
            {
                student_name: "Aisha",
                age: 7,
                quote: "My soap smells like vanilla and oranges! I put a real flower inside it."
            },
            {
                student_name: "Fatima Z.",
                parent_quote: "Mariyam is so gentle with the kids. It was a wonderful break from technology, and the soaps they made are actually high quality."
            }
        ],
        faq: {
            "q1": "Is it safe? Are there chemicals?",
            "a1": "We use the 'Melt and Pour' method for kids, which involves NO lye handling. The soap base is pre-cured and safe. We use only skin-safe cosmetic grade oils."
        }
    }
];
