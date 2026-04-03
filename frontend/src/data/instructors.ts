export interface ClassOffering {
    course_name: string;
    target_age: string;
    duration?: string; // Made optional to fit data variation
    format?: string; // New field
    focus?: string;
    price_estimate?: string; // New field from JSON
    price_aed?: number; // Keeping for backward compat/existing
    pricing_unit?: string;
    class_size?: string;
    syllabus_highlights?: string[];
}

export interface StudioFacilities {
    type?: string;
    amenities?: string[];
    details?: string; // New field from JSON
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
    studio_name?: string; // New
    location: string;
    languages_spoken: string[];
    years_active: number;
    contact_email: string;
    social_handle: string;
}

export interface ProfessionalBio {
    summary: string;
    certifications: string[];
    teaching_philosophy?: { // New structured field
        core_belief: string;
        style: string;
        methodology: string;
    };
    teaching_style?: string; // Keeping for backward compat
}

export interface VisualAsset {
    description: string;
    file_name?: string;
}

export interface HeroSection {
    headline: string;
    sub_headline: string;
    cta_button: string;
    visual_asset: VisualAsset;
    hosted_by?: string;
}

export interface IntroductionSection {
    heading: string;
    body_text: string;
}

export interface Module {
    title: string;
    description: string;
}

export interface CurriculumSection {
    heading: string;
    modules: Module[];
}

export interface Program {
    name: string;
    focus: string;
    details: string;
    themes: string;
}

export interface ProgramsSection {
    heading: string;
    programs: Program[];
    visual_asset: VisualAsset;
}

export interface WorkshopExperienceSection {
    heading: string;
    description: string;
    learning_outcomes: { role: string; activity: string }[];
    visual_assets_gallery: VisualAsset[];
}

export interface InstructorSection {
    heading: string;
    quote?: string;
    bio_text: string;
    visual_asset: VisualAsset;
}

export interface LogisticsSection {
    who: string;
    where: string;
    requirements: string;
}

export interface BookingSection {
    heading: string;
    details: {
        age_requirement: string;
        location: string;
        whats_included: string;
    };
    cta_button: string;
    visual_asset: VisualAsset;
}

export interface StudioExperienceSection {
    details: string;
}

export interface WebsiteLandingPageContent {
    hero_section: HeroSection;
    introduction_section: IntroductionSection;
    curriculum_section?: CurriculumSection;
    programs_section?: ProgramsSection;
    workshop_experience_section?: WorkshopExperienceSection;
    instructor_section: InstructorSection;
    logistics_section?: LogisticsSection;
    booking_section?: BookingSection;
    studio_experience_section?: StudioExperienceSection;
}

export interface Instructor {
    id: string;
    name: string;
    workshop: string;
    image: string;
    location: string;
    color: string;
    personal_info?: PersonalInfo;
    professional_bio?: ProfessionalBio;
    class_offerings?: ClassOffering[];
    studio_facilities?: StudioFacilities;
    testimonials?: Testimonial[];
    faq?: FAQ;
    website_landing_page_content?: WebsiteLandingPageContent;
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
            teaching_philosophy: {
                core_belief: "It’s okay to make a mess in the kitchen as long as you're having fun.",
                style: "Warm, American hospitality mixed with the international flair of our city.",
                methodology: "Real kitchen skills—measuring, mixing, piping, and decorating—in a safe, encouraging setting."
            },
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
        },
        website_landing_page_content: {
            hero_section: {
                headline: "Welcome to Colette’s Kitchen DXB",
                sub_headline: "Where Dubai’s littlest chefs create big memories. Confidence-building baking classes for kids aged 5–12.",
                cta_button: "Book a Class Today",
                visual_asset: {
                    file_name: "/assets/images/instructor/American baking instructor 2.webp",
                    description: "Colette laughing joyfully while making a floury mess with young kids"
                }
            },
            introduction_section: {
                heading: "About The Classes: More than just sugar and flour.",
                body_text: "Hello diverse families of Dubai! I believe the kitchen is the heart of the home, and there is no better way to learn than getting your hands covered in dough. My classes aren't just about following a recipe; they are interactive workshops designed to spark joy and creativity. We focus on real kitchen skills—measuring, mixing, piping, and decorating—in a safe, encouraging, and quintessentially sunny Dubai setting. Your child will leave with delicious treats, but more importantly, they’ll leave with a sense of accomplishment saying, 'I made this myself!'"
            },
            curriculum_section: {
                heading: "What We Bake",
                modules: [
                    {
                        title: "The Cupcake Studio",
                        description: "Master the perfect swirl! We focus on flavor combinations, making buttercream from scratch, and learning how to use a piping bag like a pro."
                    },
                    {
                        title: "Seasonal Cookie Creations",
                        description: "From festive gingerbread in December to spooky treats in October. Kids learn rolling, cutting dough, and intricate royal icing decoration."
                    },
                    {
                        title: "Edible Engineering",
                        description: "Where baking meets structure! We assemble gingerbread houses or layered treats, learning patience and construction techniques (that taste delicious)."
                    }
                ]
            },
            workshop_experience_section: {
                heading: "The 'Colette's Kitchen' Difference",
                description: "We know you have many choices for activities in the UAE. Here is why parents love our kitchen:",
                learning_outcomes: [
                    {
                        role: "Small Class Sizes",
                        activity: "I keep groups small (max 6 kids) to ensure everyone gets one-on-one attention and stays safe."
                    },
                    {
                        role: "Real Life Skills",
                        activity: "We sneak in math (measuring fractions), science (why does dough rise?), and fine motor skills without them even noticing!"
                    },
                    {
                        role: "All-Inclusive",
                        activity: "We provide all the ingredients, aprons, tools, and boxes to take creations home. Just bring your child!"
                    },
                    {
                        role: "The Dubai Mix",
                        activity: "A wonderful opportunity for your child to socialize and make friends with other kids from diverse backgrounds in a relaxed environment."
                    }
                ],
                visual_assets_gallery: [
                    {
                        file_name: "/assets/images/instructor/American baking instructor.webp",
                        description: "Fun in Action"
                    },
                    {
                        file_name: "/assets/images/instructor/American baking instructor 2.webp",
                        description: "Learning techniques"
                    }
                ]
            },
            instructor_section: {
                heading: "Meet Your Instructor: Colette Davis",
                quote: "Baking is a universal language. It doesn't matter where you are from; everyone speaks 'cookie'.",
                bio_text: "Hi there! I’m Colette. Originally from the States, I now call beautiful Dubai my home. I’m a passionate baker, a patient teacher, and a firm believer that it’s okay to make a mess in the kitchen as long as you're having fun. In my mid-30s, I realized my greatest joy wasn't just baking for others, but teaching the next generation how to bake. My teaching style is warm, American hospitality mixed with the international flair of our city. I ensure every child feels seen, heard, and capable. I’m here to guide their hands until they are ready to fly solo!",
                visual_asset: {
                    file_name: "/assets/images/instructor/Colette Davis.webp",
                    description: "The warm, friendly solo headshot in her kitchen"
                }
            },
            booking_section: {
                heading: "Ready to get baking?",
                cta_button: "View Upcoming Schedule",
                visual_asset: {
                    file_name: "/assets/images/instructor/American baking instructor 2.webp",
                    description: "Ready to bake"
                },
                details: {
                    age_requirement: "5-12 years",
                    location: "Jumeirah, Dubai",
                    whats_included: "All ingredients, aprons, tools, and take-home boxes."
                }
            },
            logistics_section: {
                requirements: "Just bring a smile and a willingness to get messy!",
                who: "Budding pastry chefs or kids who love to lick the spoon.",
                where: "Jumeirah, Dubai"
            }
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
            teaching_philosophy: {
                core_belief: "Every child can learn to draw if the process is broken down into manageable steps.",
                style: "Patient, encouraging, and highly technical.",
                methodology: "Moving beyond doodling to teach the professional language of design—from croquis to collection."
            },
            teaching_style: "Creative and exploratory. Anne encourages students to think outside the box and find their own voice."
        },
        website_landing_page_content: {
            hero_section: {
                headline: "The Atelier of Future Designers",
                sub_headline: "Turning sketches into skill, and imagination into fashion. Professional Fashion Illustration Classes for Ages 8–16 in Sharjah.",
                cta_button: "View Class Schedule",
                visual_asset: {
                    file_name: "/assets/images/instructor/fashion design.webp",
                    description: "Sketches, markers, and fabric swatches artfully arranged in a bright Sharjah studio."
                }
            },
            introduction_section: {
                heading: "Have you ever dreamed of seeing your designs on the runway?",
                body_text: "Does your child fill the margins of their notebooks with drawings of outfits? Do they look at fabric and immediately see a dress or a jacket? Welcome to the studio of Anne Amin. We believe that fashion design is not just a hobby; it is a disciplined art form. Located in Sharjah, the cultural heart of the UAE, our studio provides the structured techniques young creatives need to transform their ideas from fleeting thoughts into professional-level illustrations. We teach the language of design used by professionals in Paris, Milan, and Dubai."
            },
            curriculum_section: {
                heading: "What We Learn: The Art of Fashion Discovery",
                modules: [
                    {
                        title: "The Foundation: The Croquis",
                        description: "Before the clothes, comes the body. Students learn to draw the 'croquis'—the elongated, elegant nine-head fashion figure used in the industry. We master proportions and balance."
                    },
                    {
                        title: "Strike a Pose: Bringing Designs to Life",
                        description: "Fashion is about movement. We move beyond static figures to explore dynamic poses that show off garments to their best advantage. How does a skirt swing? How does a jacket sit?"
                    },
                    {
                        title: "Fabric & Texture Rendering",
                        description: "This is where the magic happens. How do you draw the sheer transparency of chiffon versus the heavy drape of velvet? We learn coloring and shading techniques."
                    },
                    {
                        title: "The Collection: Mood Boards to Final Sketches",
                        description: "Designers don’t just make one outfit; they tell a story. Students learn how to gather inspiration, create mood boards, and develop a cohesive mini-collection of 3-5 looks."
                    }
                ]
            },
            instructor_section: {
                heading: "Meet Your Instructor: Anne Amin",
                quote: "Fashion is an international language, but style is personal. My goal is to give students the technical vocabulary to express their unique voice.",
                bio_text: "Hello, I am Anne Amin. My journey in fashion has taken me from European ateliers to the vibrant, rapidly evolving design scene of the UAE. I chose to establish my teaching studio here in Sharjah because of the emirate's deep reverence for art, culture, and craftsmanship. I am passionate about teaching the 'how' of design. I am here to guide their hands until their skills match their incredible imaginations.",
                visual_asset: {
                    file_name: "/assets/images/instructor/Anne Amin.webp",
                    description: "A professional, warm headshot of Anne in her studio."
                }
            },
            booking_section: {
                heading: "Ready to Start Designing?",
                details: {
                    age_requirement: "8-16 years",
                    location: "The Anne Amin Studio, Al Majaz, Sharjah",
                    whats_included: "Sketchbook, pencils, eraser, and liner pens provided. Alcohol markers optional."
                },
                cta_button: "Enroll Now",
                visual_asset: {
                    file_name: "/assets/images/instructor/fashion design 2.webp",
                    description: "A student proudly displaying their first sketch."
                }
            },
            logistics_section: {
                who: "Young creatives aged 8-16.",
                where: "Anne Amin Studio, Sharjah.",
                requirements: "No prior drawing experience needed—just a passion for style."
            }
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
            title: "Senior Guitar Instructor",
            studio_name: "Kumar Music Studio",
            location: "Al Nuaimia, Ajman, United Arab Emirates",
            languages_spoken: ["English", "Hindi", "Basic Arabic"],
            years_active: 15,
            contact_email: "shailesh@kumarmusicajman.com",
            social_handle: "@StrumWithShailesh"
        },
        professional_bio: {
            summary: "Based in Ajman, Shailesh specializes in taking absolute beginners and turning them into confident players. He believes music belongs to everyone and focuses on overcoming the initial intimidation of the instrument.",
            certifications: [
                "Trinity College London - Grade 8 Guitar",
                "Certified Music Pedagogy Specialist"
            ],
            teaching_philosophy: {
                core_belief: "Patience is the best teacher. The first steps shouldn't be scary—they should be exciting.",
                style: "Warm, encouraging, structured, and stress-free.",
                methodology: "Practical focus on 'magic chords' and rhythm to get students playing songs quickly, skipping complex theory until ready."
            }
        },
        website_landing_page_content: {
            hero_section: {
                headline: "Start Your Musical Journey in Ajman",
                sub_headline: "From holding the pick to playing your first song—no experience needed. Beginner Guitar Lessons with Shailesh Kumar. Patient, personalized, and fun.",
                cta_button: "Book Your First Lesson",
                visual_asset: {
                    file_name: "/assets/images/instructor/Musical Journey 2.webp",
                    description: "A warm, inviting photo of Shailesh smiling patiently, holding an acoustic guitar in a cozy home studio setting in Ajman."
                }
            },
            introduction_section: {
                heading: "Is your guitar gathering dust in the corner?",
                body_text: "Many people dream of playing guitar, but the beginning feels overwhelming. Your fingers hurt, the chords buzz, and YouTube tutorials move too fast. Welcome! I am Shailesh Kumar. Based right here in Ajman, I specialize in taking absolute beginners and turning them into confident players. I believe that music belongs to everyone, and the first steps shouldn't be scary—they should be exciting. Forget the pressure of becoming a rockstar overnight. My classes are about enjoying the process, building a solid foundation, and realizing that yes, you actually can do this."
            },
            workshop_experience_section: {
                heading: "The Class Experience: A Stress-Free Zone",
                description: "Taking inspiration from the best modern teaching methods, my classes are designed to be low-pressure and high-support.",
                learning_outcomes: [
                    {
                        role: "Mistakes are Welcome",
                        activity: "We expect strings to buzz at first! My studio is a safe place to make noise and learn from it."
                    },
                    {
                        role: "At Your Pace",
                        activity: "We don't move on until you are comfortable. There is no rush."
                    },
                    {
                        role: "Practical Focus",
                        activity: "We focus on the skills that get you playing real music quickly, skipping complex theory until you are ready for it."
                    }
                ],
                visual_assets_gallery: [
                    {
                        file_name: "/assets/images/instructor/Musical Journey 2.webp",
                        description: "Student learning chords"
                    },
                    {
                        file_name: "/assets/images/instructor/Shailesh Kumar.webp",
                        description: "Shailesh guiding a student"
                    },
                    {
                        file_name: "/assets/images/instructor/Musical Journey.webp",
                        description: "Playing the first song"
                    }
                ]
            },
            curriculum_section: {
                heading: "What We Will Learn: The Beginner's Foundation",
                modules: [
                    {
                        title: "The Essentials",
                        description: "Understanding your instrument. How to hold the guitar without tension, tuning it correctly, and how to hold a pick."
                    },
                    {
                        title: "Your First Chords",
                        description: "We tackle the 'magic chords'—the 4 or 5 basic shapes (like G, C, D, and Em) that allow you to play thousands of popular songs."
                    },
                    {
                        title: "Rhythm & Strumming",
                        description: "Chords are nothing without rhythm. We learn basic strumming patterns to make your playing sound musical and confident."
                    },
                    {
                        title: "Finger Fitness",
                        description: "Simple, fun exercises to build dexterity and strength in your fretting hand so changing chords becomes smooth."
                    },
                    {
                        title: "Putting It Together",
                        description: "By the end of the beginner module, you will be able to play a complete song from start to finish."
                    }
                ]
            },
            instructor_section: {
                heading: "Meet Your Instructor: Shailesh Kumar",
                quote: "I don't just teach you how to play notes; I teach you how to love the instrument.",
                bio_text: "Hello! I’m Shailesh. I've called the UAE home for many years, and I love sharing the joy of music with my community in Ajman. With over 15 years of playing experience and a decade of teaching, I’ve learned one crucial thing: patience is the best teacher. My teaching style is warm, encouraging, and structured. I know exactly where beginners struggle because I’ve helped hundreds of students overcome those same hurdles. Whether you are a busy professional looking for a relaxing hobby, or a parent wanting their child to learn a new skill, my studio is a welcoming space for all backgrounds.",
                visual_asset: {
                    file_name: "/assets/images/instructor/Shailesh Kumar.webp",
                    description: "Shailesh teaching a diverse group of students, each holding their own guitar."
                }
            },
            booking_section: {
                heading: "Ready to finally learn?",
                cta_button: "SCHEDULE A TRIAL SESSION WITH SHAILESH",
                visual_asset: {
                    file_name: "/assets/images/instructor/Musical Journey.webp",
                    description: "Close up of guitar strings"
                },
                details: {
                    age_requirement: "Adults and kids aged 8+",
                    location: "Al Nuaimia, Ajman (or Online via Zoom)",
                    whats_included: "Personalized instruction and practice materials."
                }
            },
            logistics_section: {
                who: "Absolute beginners. Adults and kids aged 8 and up.",
                where: "Private studio in Al Nuaimia, Ajman (or Online via Zoom).",
                requirements: "Must have your own 6-string acoustic or electric guitar."
            }
        },
        class_offerings: [
            {
                course_name: "Beginner Guitar Lessons",
                target_age: "8+ to Adults",
                format: "Private or Group",
                focus: "Practical playing, Chords, Rhythm",
                price_estimate: "1200 AED for 12 weeks"
            }
        ],
        studio_facilities: {
            type: "Home Music Studio",
            amenities: [
                "Sound-treated practice room",
                "Spare guitars for trial",
                "Recording equipment",
                "Comfortable waiting area"
            ]
        },
        testimonials: [
            {
                student_name: "Rahul M.",
                age: 10,
                quote: "I learned 'Seven Nation Army' in my first week! Shailesh sir makes it easy."
            },
            {
                student_name: "Sarah L.",
                quote: "As an adult beginner, I was nervous. But this is the most relaxing hour of my week.",
                parent_quote: "Highly recommended for busy professionals."
            }
        ],
        faq: {
            "q1": "Do I need to bring my own guitar?",
            "a1": "Yes, having your own instrument to practice on at home is essential. I can advise on what to buy.",
            "q2": "How much should I practice?",
            "a2": "20 minutes a day is better than 2 hours once a week. Consistency is key!"
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
            title: "Lead STEM Educator",
            studio_name: "Galindo Robotics Studio",
            location: "Al Reem Island, Abu Dhabi, United Arab Emirates",
            languages_spoken: ["English"],
            years_active: 15,
            contact_email: "j.galindo@abudhabirobotics.com",
            social_handle: "@GalindoBuildsFuture"
        },
        professional_bio: {
            summary: "An Australian educator bringing future-focused innovation to Abu Dhabi. He combines the fun of LEGO with serious engineering and coding principles.",
            certifications: [
                "LEGO® Education Academy Certified Trainer",
                "Bachelor of Education (Science & Technology)"
            ],
            teaching_philosophy: {
                core_belief: "Resilience is built through debugging. Fail forward.",
                style: "High-energy, inquiry-based, and hands-on.",
                methodology: "Using industry-standard LEGO Education platforms to teach variables, loops, and mechanical principles in a 'Junior Engineer' environment."
            }
        },
        website_landing_page_content: {
            hero_section: {
                headline: "Building the Future, One Brick at a Time in Abu Dhabi",
                sub_headline: "Turn 'playing with LEGOs' into real engineering, coding, and problem-solving skills. Hands-on LEGO® Robotics classes led by educator J. Galindo.",
                cta_button: "View Class Schedule",
                visual_asset: {
                    file_name: "/assets/images/instructor/Hands-on LEGO 2.webp",
                    description: "A wide shot of the bright, modern Abu Dhabi studio lab with J. Galindo in the background assisting diverse students."
                }
            },
            introduction_section: {
                heading: "More Than Just Toys: It’s Engineering.",
                body_text: "Living in Abu Dhabi, we are surrounded by incredible engineering and future-focused innovation. Your child sees this world and wants to know: 'How does that work?' At Galindo Robotics Studio, we answer that question. We take the universal love of LEGO® and combine it with cutting-edge educational technology to teach essential STEM skills. We don’t just follow instructions here. We challenge students to design solutions, program movement, and overcome failures. When a robot falls over, we don't give up—we debug the code, reinforce the structure, and try again. That’s resilience. That’s engineering."
            },
            programs_section: {
                heading: "Our Programs: From Brick Basics to Complex Code",
                programs: [
                    {
                        name: "Junior Innovators (Ages 6–9)",
                        focus: "LEGO® Education SPIKE™ Essential",
                        details: "The perfect entry point. We combine colorful LEGO building elements with simple, intuitive block-based coding on iPads. Skills: Basic mechanical principles (gears, levers), sequencing in code, and collaborative storytelling.",
                        themes: "Great Adventures, Amazing Amusement Park, Quirky Creations."
                    },
                    {
                        name: "Master Builders & Coders (Ages 10–14)",
                        focus: "LEGO® MINDSTORMS® EV3 and SPIKE™ Prime",
                        details: "For students ready for a bigger challenge. We build complex robots using smart hubs, motors, and precise sensors (color, distance, and touch). Skills: Variables, loops, if/then logic, sensor integration, and iterative design testing.",
                        themes: "The Mars Rover Mission, Robot Sumo Wrestling, Automated Recycling Plant."
                    }
                ],
                visual_asset: {
                    file_name: "/assets/images/instructor/Hands-on LEGO.webp",
                    description: "J. Galindo with older students working on a complex white/grey tread robot."
                }
            },
            instructor_section: {
                heading: "Meet Your Instructor: J. Galindo",
                quote: "G'day! I believe the best learning happens when kids are having so much fun they don't realize how hard their brains are working.",
                bio_text: "I brought my passion for hands-on education from Australia to the UAE because I believe in equipping the next generation with the tools they need to succeed in a technological world. With over 15 years of teaching experience, my classroom philosophy is simple: give it a go. My studio is a safe space to make mistakes, ask 'what if,' and get loud when a project finally works. Whether your child is shy or outgoing, a total beginner or a budding coder, I am here to guide them from their first gear connection to complex programming.",
                visual_asset: {
                    file_name: "/assets/images/instructor/J. Galindo.webp",
                    description: "Headshot of J. Galindo smiling, wearing a blue polo or grey shirt holding a robot."
                }
            },
            studio_experience_section: {
                details: "Small classes (max 8 students). State-of-the-Art Lab: Learning takes place in a bright, purpose-built environment equipped with individual workstations, laptops/iPads, and extensive robotics kits. All Equipment Provided: You don't need to buy expensive kits. We provide everything needed for the class. Just bring a water bottle and a curious mind!"
            },
            booking_section: {
                heading: "Ready to Activate Their Potential?",
                cta_button: "ENROLL NOW",
                visual_asset: {
                    file_name: "/assets/images/instructor/Hands-on LEGO 2.webp",
                    description: "Students collaborating in the lab"
                },
                details: {
                    age_requirement: "6-14 years",
                    location: "Galindo Robotics Studio, Abu Dhabi",
                    whats_included: "All LEGO kits, iPads, and software provided."
                }
            }
        },
        class_offerings: [
            {
                course_name: "Junior Innovators",
                target_age: "6-9 years",
                price_estimate: "1600 AED for 8 weeks"
            },
            {
                course_name: "Master Builders & Coders",
                target_age: "10-14 years",
                price_estimate: "2200 AED for 10 weeks"
            }
        ],
        studio_facilities: {
            type: "Robotics & Innovation Lab",
            amenities: [
                "Individual coding workstations",
                "LEGO SPIKE & EV3 Kits",
                "Robot testing arenas",
                "3D Printing Station"
            ]
        },
        testimonials: [
            {
                student_name: "Omar K.",
                age: 12,
                quote: "Building the sumo bot was the best. We had to code it to stay in the ring!"
            },
            {
                student_name: "Fatima A.",
                parent_quote: "My son used to give up easily. Now he says 'I need to debug this' instead of 'I quit'."
            }
        ],
        faq: {
            "q1": "Do students get to keep the robots?",
            "a1": "No, we use sophisticated educational kits that remain in the studio. Students keep their code and 3D prints (if applicable).",
            "q2": "Is prior coding experience needed?",
            "a2": "Not at all. We start with visual block coding and advance to text-based coding as they grow."
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
            title: "Artisan Soap Maker & Founder",
            studio_name: "The RAK Creative Studio",
            location: "Al Hamra Village, Ras Al Khaimah, United Arab Emirates",
            languages_spoken: ["Arabic", "English"],
            years_active: 6,
            contact_email: "mariyam@rakcreative.ae",
            social_handle: "@MariyamMakes"
        },
        professional_bio: {
            summary: "A proud Emirati creator sharing the art of soap making. She focuses on natural ingredients and nurturing creativity in a safe environment. Mariyam draws inspiration from the natural beauty of Ras Al Khaimah, from the mountains to the sea.",
            certifications: [
                "Diploma in Organic Skincare Formulation",
                "Certified Children's Art Facilitator"
            ],
            teaching_philosophy: {
                core_belief: "Creativity is a natural instinct in every child, just waiting to be nurtured.",
                style: "Warm, encouraging, sensory, and fun. A safe space to make a little mess and leave with a big smile.",
                methodology: "The 'Melt and Pour' method—the perfect blend of science and art without harsh chemicals."
            }
        },
        website_landing_page_content: {
            hero_section: {
                headline: "Discover the Art of Natural Soap Making in Ras Al Khaimah",
                sub_headline: "Little Hands, Big Creativity: A sweet-smelling adventure for young makers.",
                hosted_by: "Hosted by Mariyam Fatima at The RAK Creative Studio",
                cta_button: "Book a Workshop Now",
                visual_asset: {
                    file_name: '/assets/images/instructor/Ras Al Khaimah 2.webp',
                    description: "A wide shot of Mariyam pouring soap while the children watch intently in the bright studio."
                }
            },
            introduction_section: {
                heading: "Welcome to a World of Color and Scent",
                body_text: "Welcome to my studio, nestled here in the beautiful emirate of Ras Al Khaimah. In a world full of screens and plastic toys, there is something magical about creating something beautiful and useful with your own hands. I believe that creativity is a natural instinct in every child, just waiting to be nurtured. Our beginner soap-making workshops are designed to be a safe, fun, and fragrant escape where children can learn a new skill, express their artistic side, and take home something they are truly proud of."
            },
            workshop_experience_section: {
                heading: "What We Will Do: Mix, Pour, and Create!",
                description: "This class uses the 'Melt and Pour' method. This means we work with pre-made, high-quality soap bases (like clear glycerin or creamy shea butter). It is completely safe for children as there is no handling of harsh chemicals (like lye) and no waiting weeks for the soap to cure. It’s the perfect blend of science and art!",
                learning_outcomes: [
                    {
                        role: "Be a Scientist",
                        activity: "Learn the basic science of how soap works and why it cleans."
                    },
                    {
                        role: "Be a Perfumer",
                        activity: "Choose from a variety of skin-safe essential oils and fragrance oils—think calming lavender, zesty orange, or traditional rose."
                    },
                    {
                        role: "Be an Artist",
                        activity: "Select vibrant colors and embed natural botanicals like dried flower petals, lavender buds, or dried citrus slices into their creations."
                    },
                    {
                        role: "Take It Home",
                        activity: "Every child will make and package 2-3 unique bars of soap that are ready to use immediately!"
                    }
                ],
                visual_assets_gallery: [
                    {
                        file_name: "/assets/images/instructor/Mariyam Fatima.webp",
                        description: "Child selecting essential oils."
                    },
                    {
                        file_name: "/assets/images/instructor/Ras Al Khaimah 1.webp",
                        description: "Child pouring liquid soap base into molds."
                    },
                    {
                        file_name: "/assets/images/instructor/Ras Al Khaimah 2.webp",
                        description: "Child adding dried petals to the cooling soap."
                    }
                ]
            },
            instructor_section: {
                heading: "Marhaba! I am Mariyam Fatima.",
                bio_text: "As a proud Emirati growing up in Ras Al Khaimah, I have always been inspired by the natural beauty surrounding us—from the mountains to the sea. I started soap making years ago as a way to ensure my family was using natural, gentle products on their skin. It quickly turned from a hobby into a passion. I opened my studio to share the joy of this craft with the community. I love teaching children because they have no fear in their creativity. My goal is to provide a warm, encouraging environment where they can experiment, make a little mess, and leave with a big smile.",
                visual_asset: {
                    file_name: "/assets/images/instructor/Mariyam Fatima.webp",
                    description: "The warm headshot of Mariyam smiling."
                }
            },
            booking_section: {
                heading: "Ready to make something amazing?",
                details: {
                    age_requirement: "Suitable for children ages 6 to 12.",
                    location: "The RAK Creative Studio, Al Hamra Village, Ras Al Khaimah.",
                    whats_included: "All materials (soap base, molds, scents, colors, botanicals) and aprons provided."
                },
                cta_button: "View Upcoming Schedule & Register",
                visual_asset: {
                    file_name: "/assets/images/instructor/Ras Al Khaimah 1.webp",
                    description: "The group shot of happy kids holding their finished soaps."
                }
            },
        },
        class_offerings: [
            {
                course_name: "Little Perfumers & Soap Makers",
                target_age: "6-12 years",
                duration: "90 Minute Workshop",
                price_estimate: "180 AED per child"
            }
        ],
        studio_facilities: {
            type: "Artisan Craft Studio",
            amenities: [
                "Soap curing racks",
                "Essential oil library",
                "Botanical garden access",
                "Packaging station"
            ]
        },
        testimonials: [
            {
                student_name: "Aisha R.",
                age: 8,
                quote: "It smells so good in here! I made a lemon soap for my mom."
            },
            {
                student_name: "John D.",
                parent_quote: "A wonderful, screen-free activity. Mariyam is so patient with the little ones."
            }
        ],
        faq: {
            "q1": "Is the soap safe for sensitive skin?",
            "a1": "Yes, we use gentle, natural bases. However, please inform us of any nut allergies as we use shea butter.",
            "q2": "How long does the class take?",
            "a2": "90 minutes. The soap hardens during the class so you can take it home immediately."
        }
    }
];

