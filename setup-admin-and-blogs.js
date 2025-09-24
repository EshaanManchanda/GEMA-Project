const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection string - update with your actual connection string
const MONGODB_URI = 'mongodb://localhost:27017/kidzapp-clone';

// User schema (simplified version)
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  phone: String,
  role: { type: String, enum: ['admin', 'customer', 'vendor', 'employee'], default: 'customer' },
  status: { type: String, enum: ['active', 'inactive', 'suspended', 'pending'], default: 'pending' },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false }
}, { timestamps: true });

// Blog Category schema
const blogCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, unique: true },
  description: String,
  color: { type: String, required: true, default: '#3B82F6' },
  isActive: { type: Boolean, default: true },
  postsCount: { type: Number, default: 0 }
}, { timestamps: true });

// Blog schema
const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: String,
  excerpt: { type: String, required: true },
  content: { type: String, required: true },
  featuredImage: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogCategory', required: true },
  author: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    avatar: String,
    bio: String
  },
  tags: [String],
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  featured: { type: Boolean, default: false },
  readTime: { type: Number, required: true },
  viewCount: { type: Number, default: 0 },
  likeCount: { type: Number, default: 0 },
  shareCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  seo: {
    metaTitle: String,
    metaDescription: String,
    metaKeywords: [String],
    canonicalUrl: String
  },
  publishedAt: Date
}, { timestamps: true });

// Pre-save middleware for blog
blogSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  if (this.isModified('content')) {
    const wordCount = this.content.trim().split(/\s+/).length;
    this.readTime = Math.max(1, Math.ceil(wordCount / 200));
  }

  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  if (this.isModified('status') && this.status !== 'published') {
    this.publishedAt = undefined;
  }

  next();
});

// Pre-save middleware for category
blogCategorySchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

const User = mongoose.model('User', userSchema);
const BlogCategory = mongoose.model('BlogCategory', blogCategorySchema);
const Blog = mongoose.model('Blog', blogSchema);

// Admin user data
const adminUserData = {
  firstName: 'Blog',
  lastName: 'Admin',
  email: 'blogadmin@gema.com',
  passwordHash: 'BlogAdmin123!',
  phone: '+971501234567',
  role: 'admin',
  status: 'active',
  isEmailVerified: true,
  isPhoneVerified: true
};

// Categories data
const categoriesData = [
  {
    name: 'Event Planning Tips',
    description: 'Expert advice and strategies for planning successful events',
    color: '#3B82F6'
  },
  {
    name: 'Venue Spotlights',
    description: 'Showcasing unique and exceptional event venues',
    color: '#10B981'
  },
  {
    name: 'Industry Trends',
    description: 'Latest trends and insights in the event management industry',
    color: '#F59E0B'
  },
  {
    name: 'Technology & Innovation',
    description: 'How technology is transforming event experiences',
    color: '#8B5CF6'
  },
  {
    name: 'Success Stories',
    description: 'Real-world case studies and event success stories',
    color: '#EF4444'
  },
  {
    name: 'Event Marketing',
    description: 'Marketing strategies to promote and grow your events',
    color: '#06B6D4'
  }
];

// Blog posts data
const getBlogPostsData = (categoryMap) => [
  {
    title: 'The Ultimate Guide to Event Planning in 2024',
    excerpt: 'Master the art of event planning with our comprehensive guide covering everything from budgeting to execution. Learn the latest strategies and best practices for creating successful events.',
    content: `
      <h2>Introduction</h2>
      <p>Event planning has evolved significantly in recent years, with new technologies, changing attendee expectations, and post-pandemic considerations reshaping the industry. Whether you're planning a corporate conference, wedding, or community gathering, success depends on meticulous planning and attention to detail.</p>

      <h2>Phase 1: Pre-Planning (6-12 months before)</h2>
      <h3>Define Your Objectives</h3>
      <p>Before diving into logistics, clearly define what you want to achieve. Are you looking to:</p>
      <ul>
        <li>Generate leads and build brand awareness</li>
        <li>Educate your audience about new products or services</li>
        <li>Celebrate milestones and build team morale</li>
        <li>Raise funds for a cause</li>
      </ul>

      <h3>Budget Planning</h3>
      <p>Allocate your budget across key categories:</p>
      <ul>
        <li><strong>Venue (30-40%)</strong>: Location rental, setup fees</li>
        <li><strong>Catering (25-35%)</strong>: Food, beverages, service</li>
        <li><strong>Marketing (10-15%)</strong>: Promotion, advertising</li>
        <li><strong>Entertainment (10-20%)</strong>: Speakers, performers</li>
        <li><strong>Contingency (10%)</strong>: Unexpected expenses</li>
      </ul>

      <h2>Phase 2: Planning & Organization (3-6 months before)</h2>
      <h3>Venue Selection</h3>
      <p>Choose a venue that aligns with your event's purpose, expected attendance, and budget. Consider factors like accessibility, technical capabilities, and catering options.</p>

      <h3>Vendor Management</h3>
      <p>Build relationships with reliable vendors for catering, decorations, photography, and technical support. Always have backup options and clear contracts.</p>

      <h2>Phase 3: Execution & Follow-up</h2>
      <h3>Day-of Coordination</h3>
      <p>Create detailed timelines and assign specific roles to team members. Maintain open communication channels and be prepared to adapt to unexpected situations.</p>

      <h3>Post-Event Analysis</h3>
      <p>Gather feedback from attendees, analyze metrics, and document lessons learned for future events.</p>

      <h2>Conclusion</h2>
      <p>Successful event planning requires a balance of creativity, organization, and adaptability. By following this guide and continuously refining your approach, you'll be well-equipped to create memorable experiences that achieve your objectives.</p>
    `,
    featuredImage: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=600&fit=crop',
    category: categoryMap['Event Planning Tips'],
    author: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@gema.com',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150&h=150&fit=crop&crop=face',
      bio: 'Senior Event Planning Consultant with over 10 years of experience in corporate and social events.'
    },
    tags: ['event planning', 'guide', 'tips', '2024', 'strategy'],
    status: 'published',
    featured: true,
    seo: {
      metaTitle: 'Ultimate Event Planning Guide 2024 | Expert Tips & Strategies',
      metaDescription: 'Master event planning with our comprehensive 2024 guide. Expert tips on budgeting, venue selection, vendor management, and execution.',
      metaKeywords: ['event planning', 'event management', 'corporate events', 'wedding planning', 'event strategy']
    }
  },
  {
    title: 'Top 10 Unique Venues for Corporate Events in Dubai',
    excerpt: 'Discover extraordinary venues that will make your corporate events unforgettable, from rooftop gardens to historic landmarks in Dubai.',
    content: `
      <h2>Introduction</h2>
      <p>Dubai offers some of the world's most spectacular venues for corporate events. Whether you're planning a product launch, team building retreat, or annual gala, the right venue can transform your event from ordinary to extraordinary.</p>

      <h2>1. Burj Al Arab - Sky View Bar</h2>
      <p>Nothing says luxury like hosting your event 200 meters above sea level with panoramic views of Dubai's coastline.</p>
      <ul>
        <li><strong>Capacity:</strong> 50-80 guests</li>
        <li><strong>Best for:</strong> Executive dinners, product launches</li>
        <li><strong>Unique feature:</strong> Floor-to-ceiling windows with stunning views</li>
      </ul>

      <h2>2. Dubai Aquarium & Underwater Zoo</h2>
      <p>Create an immersive experience by hosting your event surrounded by marine life.</p>
      <ul>
        <li><strong>Capacity:</strong> 100-300 guests</li>
        <li><strong>Best for:</strong> Team building, networking events</li>
        <li><strong>Unique feature:</strong> 270-degree aquarium tunnel</li>
      </ul>

      <h2>3. Zero Gravity Beach Club</h2>
      <p>Combine business with beach vibes at this waterfront venue.</p>
      <ul>
        <li><strong>Capacity:</strong> 200-500 guests</li>
        <li><strong>Best for:</strong> Company parties, award ceremonies</li>
        <li><strong>Unique feature:</strong> Private beach access and infinity pool</li>
      </ul>

      <h2>Booking Tips</h2>
      <ul>
        <li>Book at least 6 months in advance for popular venues</li>
        <li>Consider seasonal weather when choosing outdoor spaces</li>
        <li>Negotiate package deals that include catering and A/V equipment</li>
        <li>Always visit venues in person before making final decisions</li>
      </ul>
    `,
    featuredImage: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop',
    category: categoryMap['Venue Spotlights'],
    author: {
      name: 'Ahmed Al-Rashid',
      email: 'ahmed.alrashid@gema.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      bio: 'Dubai-based venue specialist with extensive knowledge of the region\'s premier event locations.'
    },
    tags: ['venues', 'Dubai', 'corporate events', 'luxury', 'unique locations'],
    status: 'published',
    featured: true
  },
  {
    title: 'How Technology is Revolutionizing Event Management',
    excerpt: 'Explore the latest technological innovations transforming how we plan, execute, and experience events in the digital age.',
    content: `
      <h2>The Digital Transformation of Events</h2>
      <p>The event industry has undergone a dramatic digital transformation, accelerated by recent global changes. From virtual reality experiences to AI-powered personalization, technology is reshaping every aspect of event management.</p>

      <h2>Event Planning & Management Software</h2>
      <h3>Integrated Platforms</h3>
      <p>Modern event management platforms combine multiple functions:</p>
      <ul>
        <li><strong>Registration & Ticketing:</strong> Streamlined online registration with dynamic pricing</li>
        <li><strong>Attendee Management:</strong> Comprehensive attendee profiles and communication tools</li>
        <li><strong>Venue & Vendor Coordination:</strong> Centralized communication and contract management</li>
        <li><strong>Real-time Analytics:</strong> Live dashboards tracking registration, engagement, and ROI</li>
      </ul>

      <h2>Virtual & Hybrid Events</h2>
      <h3>Streaming Technology</h3>
      <p>Professional-grade streaming platforms now offer:</p>
      <ul>
        <li>Multi-camera setups with automated switching</li>
        <li>Interactive breakout rooms and networking spaces</li>
        <li>HD video quality with minimal latency</li>
        <li>Global accessibility with automatic translation</li>
      </ul>

      <h2>Artificial Intelligence & Machine Learning</h2>
      <p>AI powers personalized experiences through:</p>
      <ul>
        <li><strong>Recommendation Engines:</strong> Suggesting relevant sessions and networking opportunities</li>
        <li><strong>Chatbots:</strong> 24/7 attendee support and information delivery</li>
        <li><strong>Predictive Analytics:</strong> Anticipating attendee needs and preferences</li>
      </ul>

      <h2>Future Trends</h2>
      <ul>
        <li><strong>5G Connectivity:</strong> Ultra-fast networks enabling seamless experiences</li>
        <li><strong>Blockchain Technology:</strong> Secure, transparent ticketing systems</li>
        <li><strong>IoT Integration:</strong> Smart venues with automated systems</li>
      </ul>

      <h2>Conclusion</h2>
      <p>Technology continues to push the boundaries of what's possible in event management. By embracing these innovations thoughtfully, event professionals can create more engaging, efficient, and memorable experiences.</p>
    `,
    featuredImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600&fit=crop',
    category: categoryMap['Technology & Innovation'],
    author: {
      name: 'Dr. Rachel Kim',
      email: 'rachel.kim@gema.com',
      avatar: 'https://images.unsplash.com/photo-1559548331-f9cb98d7c9a4?w=150&h=150&fit=crop&crop=face',
      bio: 'Technology strategist specializing in digital transformation for the events industry.'
    },
    tags: ['technology', 'innovation', 'digital transformation', 'VR', 'AI', 'event tech'],
    status: 'published',
    featured: false
  },
  {
    title: 'Building Memorable Brand Experiences Through Events',
    excerpt: 'Learn how to create powerful brand experiences that resonate with your audience and drive business results.',
    content: `
      <h2>The Power of Experiential Marketing</h2>
      <p>In today's crowded marketplace, brands need more than traditional advertising to connect with their audience. Experiential marketing through events creates emotional connections that drive loyalty, advocacy, and business growth.</p>

      <h2>Understanding Your Brand Story</h2>
      <h3>Define Your Brand Essence</h3>
      <p>Before planning any event, clearly articulate:</p>
      <ul>
        <li><strong>Brand Values:</strong> What does your brand stand for?</li>
        <li><strong>Brand Personality:</strong> How would you describe your brand as a person?</li>
        <li><strong>Brand Promise:</strong> What unique value do you deliver?</li>
        <li><strong>Brand Positioning:</strong> How do you differ from competitors?</li>
      </ul>

      <h2>Event Experience Design</h2>
      <h3>The Customer Journey</h3>
      <p>Map the complete attendee experience from awareness to post-event follow-up.</p>

      <h3>Sensory Branding</h3>
      <p>Engage all five senses through visual design, audio experiences, tactile interactions, signature scents, and branded food experiences.</p>

      <h2>Interactive Engagement Strategies</h2>
      <ul>
        <li><strong>Product Demonstrations:</strong> Hands-on trials and testing</li>
        <li><strong>Virtual Reality:</strong> Transport attendees to different environments</li>
        <li><strong>Gamification:</strong> Contests, challenges, and reward systems</li>
        <li><strong>Storytelling Zones:</strong> Narrative-driven brand experiences</li>
      </ul>

      <h2>Measuring Brand Impact</h2>
      <p>Track both quantitative metrics (attendance, engagement, sales) and qualitative feedback (brand perception, emotional connection, advocacy).</p>

      <h2>Best Practices</h2>
      <ul>
        <li>Stay authentic to your brand values</li>
        <li>Create emotional connections</li>
        <li>Extend the experience beyond the event</li>
        <li>Measure and optimize continuously</li>
      </ul>

      <h2>Conclusion</h2>
      <p>Successful brand events create meaningful connections between brands and their audiences. Focus on authentic storytelling, immersive experiences, and genuine value creation to build lasting relationships that drive business growth.</p>
    `,
    featuredImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop',
    category: categoryMap['Event Marketing'],
    author: {
      name: 'Marcus Thompson',
      email: 'marcus.thompson@gema.com',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      bio: 'Brand experience strategist with 15 years of experience in creating memorable marketing events.'
    },
    tags: ['brand experience', 'marketing', 'engagement', 'storytelling', 'ROI'],
    status: 'published',
    featured: false
  },
  {
    title: 'Sustainable Event Planning: Eco-Friendly Practices for Modern Events',
    excerpt: 'Discover how to reduce your event\'s environmental impact while creating meaningful experiences for attendees.',
    content: `
      <h2>The Rise of Sustainable Events</h2>
      <p>As environmental consciousness grows, event organizers are increasingly focusing on sustainability. Eco-friendly events not only reduce environmental impact but also resonate with environmentally-conscious attendees and can even reduce costs.</p>

      <h2>Pre-Event Planning</h2>
      <h3>Venue Selection</h3>
      <ul>
        <li>Choose LEED-certified or environmentally friendly venues</li>
        <li>Select locations accessible by public transportation</li>
        <li>Consider venues with renewable energy sources</li>
        <li>Look for facilities with comprehensive recycling programs</li>
      </ul>

      <h3>Digital-First Approach</h3>
      <ul>
        <li>Electronic invitations and registration</li>
        <li>Mobile event apps instead of printed programs</li>
        <li>QR codes for session information and networking</li>
        <li>Digital business card exchanges</li>
      </ul>

      <h2>Catering & Food Service</h2>
      <h3>Sustainable Menu Planning</h3>
      <ul>
        <li>Partner with local, organic food suppliers</li>
        <li>Offer plant-based menu options</li>
        <li>Implement portion control to reduce waste</li>
        <li>Use seasonal ingredients</li>
      </ul>

      <h2>Waste Management Strategy</h2>
      <ul>
        <li>Set up clearly labeled recycling stations</li>
        <li>Implement composting programs</li>
        <li>Use biodegradable name badges and lanyards</li>
        <li>Repurpose decorations and signage for future events</li>
      </ul>

      <h2>Green Technology Integration</h2>
      <ul>
        <li>Solar-powered charging stations</li>
        <li>Energy-efficient LED lighting</li>
        <li>Digital displays instead of printed signage</li>
        <li>Live streaming to reduce travel needs</li>
      </ul>

      <h2>Measuring Environmental Impact</h2>
      <p>Track key metrics like carbon footprint, waste diversion rates, water consumption, energy usage, and percentage of local suppliers.</p>

      <h2>Future of Sustainable Events</h2>
      <ul>
        <li>Circular economy principles in event design</li>
        <li>Blockchain technology for carbon credit tracking</li>
        <li>AI-powered waste management systems</li>
        <li>Virtual and hybrid events to reduce travel</li>
      </ul>

      <h2>Conclusion</h2>
      <p>Sustainable event planning is both a responsibility and opportunity. By implementing eco-friendly practices, event organizers can reduce environmental impact, cut costs, and create more meaningful experiences that align with attendee values.</p>
    `,
    featuredImage: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&h=600&fit=crop',
    category: categoryMap['Event Planning Tips'],
    author: {
      name: 'Elena Rodriguez',
      email: 'elena.rodriguez@gema.com',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      bio: 'Sustainability consultant specializing in green event practices and environmental impact reduction.'
    },
    tags: ['sustainability', 'eco-friendly', 'green events', 'environmental impact', 'waste reduction'],
    status: 'published',
    featured: false
  }
];

async function setupDatabase() {
  console.log('🚀 Setting up admin user and blog content...\n');

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Create/Update Admin User
    console.log('\n👤 Setting up admin user...');
    const hashedPassword = await bcrypt.hash(adminUserData.passwordHash, 12);
    adminUserData.passwordHash = hashedPassword;

    const existingAdmin = await User.findOne({ email: adminUserData.email });
    let adminUser;

    if (existingAdmin) {
      // Update existing user to admin
      adminUser = await User.findByIdAndUpdate(
        existingAdmin._id,
        { ...adminUserData },
        { new: true }
      );
      console.log('✅ Updated existing user to admin role');
    } else {
      // Create new admin user
      adminUser = await User.create(adminUserData);
      console.log('✅ Created new admin user');
    }

    // 2. Create Categories
    console.log('\n📂 Creating blog categories...');
    const categoryMap = {};
    let categoriesCreated = 0;

    for (const categoryData of categoriesData) {
      try {
        const existingCategory = await BlogCategory.findOne({ name: categoryData.name });
        if (existingCategory) {
          categoryMap[categoryData.name] = existingCategory._id;
          console.log(`ℹ️  Category already exists: ${categoryData.name}`);
        } else {
          const category = await BlogCategory.create(categoryData);
          categoryMap[categoryData.name] = category._id;
          categoriesCreated++;
          console.log(`✅ Created category: ${categoryData.name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create category ${categoryData.name}:`, error.message);
      }
    }

    // 3. Create Blog Posts
    console.log('\n📝 Creating blog posts...');
    const blogPostsData = getBlogPostsData(categoryMap);
    let postsCreated = 0;

    for (const postData of blogPostsData) {
      try {
        const existingPost = await Blog.findOne({ title: postData.title });
        if (existingPost) {
          console.log(`ℹ️  Blog post already exists: ${postData.title}`);
        } else {
          await Blog.create(postData);
          postsCreated++;
          console.log(`✅ Created blog post: ${postData.title}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create blog post ${postData.title}:`, error.message);
      }
    }

    // 4. Update category post counts
    console.log('\n🔄 Updating category post counts...');
    for (const [categoryName, categoryId] of Object.entries(categoryMap)) {
      const postCount = await Blog.countDocuments({ category: categoryId });
      await BlogCategory.findByIdAndUpdate(categoryId, { postsCount: postCount });
    }

    // 5. Summary
    console.log('\n🎉 Setup completed successfully!\n');
    console.log('📋 Summary:');
    console.log(`├── Admin user: ${adminUser.email} (${adminUser.role})`);
    console.log(`├── Categories created: ${categoriesCreated}`);
    console.log(`├── Blog posts created: ${postsCreated}`);
    console.log(`└── Total categories: ${Object.keys(categoryMap).length}`);

    console.log('\n🔑 Admin Credentials:');
    console.log(`Email: ${adminUserData.email}`);
    console.log(`Password: BlogAdmin123!`);
    console.log('\n🌐 Access Points:');
    console.log('Admin Dashboard: http://localhost:3000/admin/blogs');
    console.log('Blog Categories: http://localhost:3000/admin/blog-categories');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the setup
setupDatabase();