import mongoose from 'mongoose';
import { Blog, BlogCategory } from '../models';
import { IBlogCategory } from '../models/BlogCategory';
import { config } from '../config';

const MONGODB_URI = config.mongodbUri;

// Sample blog categories
const blogCategories = [
  {
    name: 'Activities',
    description: 'Fun and educational activities for children',
    color: '#FF6B35'
  },
  {
    name: 'Education',
    description: 'Educational tips and learning resources',
    color: '#4ECDC4'
  },
  {
    name: 'Events',
    description: 'Event planning and party ideas',
    color: '#45B7D1'
  },
  {
    name: 'Family',
    description: 'Family bonding and budget-friendly ideas',
    color: '#F9CA24'
  },
  {
    name: 'Child Development',
    description: 'Tips for healthy child development',
    color: '#6C5CE7'
  },
  {
    name: 'Creativity',
    description: 'Arts, crafts, and creative activities',
    color: '#FD79A8'
  },
  {
    name: 'Parenting',
    description: 'Parenting advice and tips',
    color: '#00B894'
  },
  {
    name: 'Health & Safety',
    description: 'Child health and safety information',
    color: '#E17055'
  }
];

// Sample blog posts
const blogPosts = [
  {
    title: 'Top 10 Summer Activities for Kids',
    excerpt: 'Discover the best summer activities to keep your kids entertained and engaged during the hot months. From outdoor adventures to creative indoor projects.',
    content: `
      <p>Summer is here, and it's time to keep your little ones entertained with fun and engaging activities! Whether you're looking for outdoor adventures or indoor creative projects, we've got you covered with these amazing summer activities.</p>
      
      <h2>Outdoor Adventures</h2>
      <p><strong>1. Water Play Activities</strong><br>
      Set up sprinklers, organize water balloon fights, or create a DIY car wash station. These activities are perfect for hot summer days and help kids cool off while having fun.</p>
      
      <p><strong>2. Nature Scavenger Hunt</strong><br>
      Create a list of items for kids to find in your backyard or local park. Include things like specific leaves, rocks, flowers, or insects to encourage exploration and learning about nature.</p>
      
      <p><strong>3. Outdoor Movie Night</strong><br>
      Set up a projector in your backyard, lay out blankets and pillows, and enjoy a family movie under the stars. Don't forget the popcorn!</p>
      
      <h2>Creative Indoor Projects</h2>
      <p><strong>4. DIY Science Experiments</strong><br>
      Conduct simple science experiments using household items. Make volcanoes with baking soda and vinegar, or create colorful slime with glue and contact solution.</p>
      
      <p><strong>5. Arts and Crafts Corner</strong><br>
      Set up a dedicated space for creativity with supplies like colored paper, markers, glue, and scissors. Let kids create their own masterpieces and display them proudly.</p>
      
      <p>Remember, the best summer activities are those that bring families together and create lasting memories. Have fun exploring these ideas with your children!</p>
    `,
    featuredImage: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=400&fit=crop',
    categoryName: 'Activities',
    author: {
      name: 'Sarah Johnson',
      email: 'sarah@kidzapp.com',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b192?w=150&h=150&fit=crop&crop=face',
      bio: 'Sarah is a certified child development specialist and mother of three. She has over 10 years of experience in creating engaging activities for children and regularly writes about parenting and child development.'
    },
    tags: ['summer', 'activities', 'kids', 'outdoor', 'indoor', 'creative'],
    status: 'published' as const,
    featured: true,
    seo: {
      metaTitle: 'Top 10 Summer Activities for Kids - Fun Ideas for Children',
      metaDescription: 'Discover amazing summer activities for kids including outdoor adventures and creative indoor projects. Keep your children entertained all season long.',
      metaKeywords: ['summer activities', 'kids activities', 'children entertainment', 'outdoor activities', 'indoor activities']
    }
  },
  {
    title: 'How to Choose the Right Educational Events for Your Child',
    excerpt: 'A comprehensive guide to selecting educational events that match your child\'s interests, learning style, and developmental stage.',
    content: `
      <p>Choosing the right educational events for your child can be overwhelming with so many options available. This guide will help you make informed decisions that benefit your child's learning and development.</p>
      
      <h2>Understanding Your Child's Learning Style</h2>
      <p>Every child learns differently. Some are visual learners who benefit from seeing information, while others are kinesthetic learners who need hands-on experiences. Observe how your child naturally approaches learning to choose events that align with their style.</p>
      
      <h2>Age-Appropriate Selection</h2>
      <p><strong>Preschoolers (3-5 years):</strong> Look for events with short durations, interactive elements, and sensory experiences. Music classes, story time, and simple science demonstrations work well.</p>
      
      <p><strong>School-age children (6-12 years):</strong> Consider workshops that combine learning with doing, such as coding classes, art workshops, or nature camps.</p>
      
      <p><strong>Teenagers (13+ years):</strong> Focus on events that align with their interests and potential career paths, such as robotics competitions or entrepreneurship workshops.</p>
      
      <h2>Quality Indicators</h2>
      <p>Look for events that have qualified instructors, clear learning objectives, and positive reviews from other parents. The best educational events combine fun with learning and leave children excited to explore more.</p>
      
      <p>Remember, the goal is to foster a love of learning while building new skills and confidence.</p>
    `,
    featuredImage: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=400&fit=crop',
    categoryName: 'Education',
    author: {
      name: 'Dr. Michael Chen',
      email: 'michael@kidzapp.com',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      bio: 'Dr. Chen is an educational psychologist with 15 years of experience in child development. He holds a Ph.D. in Educational Psychology and specializes in learning styles and cognitive development in children.'
    },
    tags: ['education', 'learning', 'child development', 'events', 'parenting'],
    status: 'published' as const,
    featured: true,
    seo: {
      metaTitle: 'How to Choose Educational Events for Your Child - Parent Guide',
      metaDescription: 'Learn how to select the best educational events for your child based on their learning style, age, and interests. Expert tips for parents.',
      metaKeywords: ['educational events', 'child education', 'learning style', 'parent guide', 'child development']
    }
  },
  {
    title: 'The Benefits of Outdoor Play for Child Development',
    excerpt: 'Research shows that outdoor play is crucial for physical, cognitive, and emotional development in children. Discover why nature matters.',
    content: `
      <p>In our increasingly digital world, outdoor play has become more important than ever for children's healthy development. Research consistently shows that time spent in nature provides unique benefits that cannot be replicated indoors.</p>
      
      <h2>Physical Development Benefits</h2>
      <p>Outdoor play naturally encourages physical activity, helping children develop:</p>
      <ul>
        <li>Gross motor skills through running, climbing, and jumping</li>
        <li>Fine motor skills through collecting natural objects and manipulating outdoor materials</li>
        <li>Balance and coordination through uneven terrain navigation</li>
        <li>Overall fitness and strength</li>
      </ul>
      
      <h2>Cognitive Benefits</h2>
      <p>Nature provides a rich learning environment that stimulates cognitive development:</p>
      <ul>
        <li>Enhanced creativity and imagination</li>
        <li>Improved problem-solving skills</li>
        <li>Better attention span and focus</li>
        <li>Scientific thinking through nature observation</li>
      </ul>
      
      <h2>Emotional and Social Benefits</h2>
      <p>Outdoor play also supports emotional well-being:</p>
      <ul>
        <li>Reduced stress and anxiety</li>
        <li>Improved mood and self-esteem</li>
        <li>Better social skills through group outdoor activities</li>
        <li>Greater independence and confidence</li>
      </ul>
      
      <p>Make outdoor play a regular part of your child's routine. Even 30 minutes a day can make a significant difference in their development and well-being.</p>
    `,
    featuredImage: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&h=400&fit=crop',
    categoryName: 'Child Development',
    author: {
      name: 'Dr. Emily Roberts',
      email: 'emily@kidzapp.com',
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face',
      bio: 'Dr. Roberts is a pediatric developmental specialist and researcher who has published extensively on the benefits of outdoor play. She advocates for nature-based learning and has consulted for numerous schools and childcare centers.'
    },
    tags: ['outdoor play', 'child development', 'nature', 'physical activity', 'cognitive development'],
    status: 'published' as const,
    featured: true,
    seo: {
      metaTitle: 'Benefits of Outdoor Play for Child Development - Research-Based Guide',
      metaDescription: 'Discover the proven benefits of outdoor play for children\'s physical, cognitive, and emotional development. Expert insights on nature-based learning.',
      metaKeywords: ['outdoor play', 'child development', 'nature benefits', 'physical development', 'cognitive development']
    }
  },
  {
    title: 'Planning the Perfect Birthday Party: A Parent\'s Guide',
    excerpt: 'Step-by-step instructions for planning a memorable and stress-free birthday celebration for your child, from theme selection to party favors.',
    content: `
      <p>Planning your child's birthday party should be fun, not stressful! This comprehensive guide will help you create a memorable celebration that your child and their friends will love.</p>
      
      <h2>Step 1: Start with Your Child</h2>
      <p>The most important aspect of party planning is involving your birthday child. Ask about their preferences for:</p>
      <ul>
        <li>Theme or favorite characters</li>
        <li>Activities they'd like to include</li>
        <li>Friends they want to invite</li>
        <li>Special foods or treats they're hoping for</li>
      </ul>
      
      <h2>Step 2: Set Your Budget and Timeline</h2>
      <p>Determine your budget early and plan backwards from the party date. A good timeline:</p>
      <ul>
        <li>3-4 weeks before: Send invitations</li>
        <li>2 weeks before: Confirm RSVPs and finalize headcount</li>
        <li>1 week before: Shop for supplies and prepare decorations</li>
        <li>Day before: Set up decorations and prepare food</li>
      </ul>
      
      <h2>Step 3: Choose Age-Appropriate Activities</h2>
      <p><strong>Ages 2-4:</strong> Simple games like musical chairs, bubbles, and coloring activities</p>
      <p><strong>Ages 5-8:</strong> Treasure hunts, craft activities, and group games</p>
      <p><strong>Ages 9-12:</strong> More complex activities like escape rooms, sports competitions, or DIY projects</p>
      
      <h2>Pro Tips for Success</h2>
      <ul>
        <li>Have a backup plan for outdoor parties in case of weather</li>
        <li>Prepare party favors in advance</li>
        <li>Delegate tasks to other parents if needed</li>
        <li>Take lots of photos to capture the memories</li>
      </ul>
      
      <p>Remember, the goal is to create happy memories. Don't stress about perfection – your child will remember the love and effort you put in!</p>
    `,
    featuredImage: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&h=400&fit=crop',
    categoryName: 'Events',
    author: {
      name: 'Jessica Williams',
      email: 'jessica@kidzapp.com',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      bio: 'Jessica is a certified event planner specializing in children\'s parties and celebrations. She has organized over 500 children\'s events and is known for her creative themes and stress-free planning approach.'
    },
    tags: ['birthday party', 'party planning', 'celebrations', 'kids party', 'event planning'],
    status: 'published' as const,
    featured: false,
    seo: {
      metaTitle: 'Perfect Birthday Party Planning Guide for Parents - Step by Step',
      metaDescription: 'Learn how to plan the perfect birthday party for your child with this comprehensive guide. Tips for themes, activities, and stress-free planning.',
      metaKeywords: ['birthday party planning', 'kids party ideas', 'children celebrations', 'party themes', 'event planning']
    }
  },
  {
    title: 'Budget-Friendly Family Activities in the City',
    excerpt: 'Discover affordable and fun activities for the whole family that won\'t break the bank. Great ideas for urban families on a budget.',
    content: `
      <p>Having fun as a family doesn't have to be expensive! Cities offer numerous free or low-cost activities that can create wonderful memories without straining your budget.</p>
      
      <h2>Free City Adventures</h2>
      <p><strong>Parks and Playgrounds:</strong> Most cities have beautiful parks with playgrounds, walking trails, and open spaces perfect for picnics and outdoor games.</p>
      
      <p><strong>Library Programs:</strong> Public libraries often host free story times, craft sessions, and educational programs for children of all ages.</p>
      
      <p><strong>Museums on Free Days:</strong> Many museums offer free admission days for residents or reduced-price family passes.</p>
      
      <h2>Low-Cost Entertainment</h2>
      <p><strong>Community Centers:</strong> Often offer affordable classes, swimming pools, and family events at fraction of commercial prices.</p>
      
      <p><strong>Seasonal Festivals:</strong> Look for free community festivals, farmers markets, and outdoor concerts throughout the year.</p>
      
      <p><strong>Nature Centers:</strong> Many cities have nature centers with trails, educational exhibits, and programs at very reasonable rates.</p>
      
      <h2>DIY Family Fun</h2>
      <ul>
        <li>Create photo scavenger hunts around your neighborhood</li>
        <li>Have movie marathons at home with homemade popcorn</li>
        <li>Start a family garden, even if it's just herbs on a windowsill</li>
        <li>Cook meals together from different cultures</li>
      </ul>
      
      <h2>Money-Saving Tips</h2>
      <ul>
        <li>Look for Groupon deals and city discount websites</li>
        <li>Join membership programs for places you visit frequently</li>
        <li>Pack your own snacks and drinks</li>
        <li>Check for free parking options or use public transportation</li>
      </ul>
      
      <p>The best family activities are often the simplest ones that bring everyone together and create lasting memories.</p>
    `,
    featuredImage: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&h=400&fit=crop',
    categoryName: 'Family',
    author: {
      name: 'David Thompson',
      email: 'david@kidzapp.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      bio: 'David is a father of two and personal finance blogger who specializes in helping families enjoy life on a budget. He has been featured in several parenting magazines for his practical money-saving tips.'
    },
    tags: ['budget activities', 'family fun', 'free activities', 'city activities', 'affordable entertainment'],
    status: 'published' as const,
    featured: false,
    seo: {
      metaTitle: 'Budget-Friendly Family Activities - Affordable Fun in the City',
      metaDescription: 'Discover free and low-cost family activities in your city. Budget-friendly ideas for fun family time without breaking the bank.',
      metaKeywords: ['budget family activities', 'free family fun', 'affordable activities', 'city activities', 'cheap entertainment']
    }
  },
  {
    title: 'The Impact of Arts and Crafts on Children\'s Creativity',
    excerpt: 'How engaging in arts and crafts activities can boost your child\'s creative thinking, problem-solving skills, and emotional development.',
    content: `
      <p>Arts and crafts activities are more than just fun pastimes for children. They play a crucial role in developing creativity, fine motor skills, and cognitive abilities that benefit children throughout their lives.</p>
      
      <h2>Cognitive Development Benefits</h2>
      <p><strong>Creative Problem-Solving:</strong> When children engage in arts and crafts, they learn to think outside the box and find creative solutions to challenges.</p>
      
      <p><strong>Planning and Organization:</strong> Craft projects require children to plan their approach, gather materials, and follow steps in sequence.</p>
      
      <p><strong>Attention to Detail:</strong> Working on detailed projects helps improve focus and concentration skills.</p>
      
      <h2>Physical Development</h2>
      <p>Arts and crafts activities are excellent for developing fine motor skills:</p>
      <ul>
        <li>Cutting with scissors improves hand-eye coordination</li>
        <li>Drawing and painting strengthen hand muscles</li>
        <li>Threading beads enhances dexterity</li>
        <li>Clay modeling develops bilateral coordination</li>
      </ul>
      
      <h2>Emotional and Social Benefits</h2>
      <p><strong>Self-Expression:</strong> Art provides a safe outlet for children to express their feelings and thoughts.</p>
      
      <p><strong>Confidence Building:</strong> Completing craft projects gives children a sense of accomplishment and pride in their work.</p>
      
      <p><strong>Social Skills:</strong> Group art activities encourage collaboration and communication.</p>
      
      <h2>Simple Craft Ideas to Try</h2>
      <ul>
        <li>Paper collages using magazines and newspapers</li>
        <li>Nature art with leaves, flowers, and sticks</li>
        <li>Simple sewing projects with large needles and yarn</li>
        <li>Clay or playdough sculptures</li>
        <li>Painting with different textures and tools</li>
      </ul>
      
      <h2>Creating the Right Environment</h2>
      <p>Set up a dedicated craft space where children can be messy and creative. Stock it with basic supplies and encourage experimentation rather than perfection.</p>
      
      <p>Remember, the process is more important than the product. Celebrate creativity and effort, not just the final result.</p>
    `,
    featuredImage: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=400&fit=crop',
    categoryName: 'Creativity',
    author: {
      name: 'Lisa Martinez',
      email: 'lisa@kidzapp.com',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
      bio: 'Lisa is an art therapist and elementary school art teacher with 12 years of experience. She holds a Master\'s degree in Art Education and specializes in using creative activities to support children\'s emotional and cognitive development.'
    },
    tags: ['arts and crafts', 'creativity', 'child development', 'fine motor skills', 'art education'],
    status: 'published' as const,
    featured: false,
    seo: {
      metaTitle: 'Arts and Crafts Benefits for Children - Creativity and Development',
      metaDescription: 'Discover how arts and crafts activities boost children\'s creativity, problem-solving skills, and emotional development. Expert insights and activity ideas.',
      metaKeywords: ['arts and crafts benefits', 'children creativity', 'art activities', 'child development', 'creative activities']
    }
  }
];

async function seedBlogs() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing blog data
    await Blog.deleteMany({});
    await BlogCategory.deleteMany({});
    console.log('Cleared existing blog data');

    // Create categories (using save() to trigger pre-save middleware)
    const createdCategories: IBlogCategory[] = [];
    for (const categoryData of blogCategories) {
      const category = new BlogCategory(categoryData);
      const savedCategory = await category.save();
      createdCategories.push(savedCategory);
    }
    console.log(`Created ${createdCategories.length} blog categories`);

    // Create blog posts with category references
    const blogsWithCategoryIds = blogPosts.map(post => {
      const category = createdCategories.find(cat => cat.name === post.categoryName);
      const { categoryName, ...postWithoutCategoryName } = post;
      return {
        ...postWithoutCategoryName,
        category: category?._id,
        publishedAt: new Date(),
        readTime: Math.ceil(post.content.split(' ').length / 200) // Calculate read time based on word count
      };
    });

    // Create blog posts (using save() to trigger pre-save middleware)
    const createdBlogs = [];
    for (const blogData of blogsWithCategoryIds) {
      const blog = new Blog(blogData);
      const savedBlog = await blog.save();
      createdBlogs.push(savedBlog);
    }
    console.log(`Created ${createdBlogs.length} blog posts`);

    // Update category post counts
    for (const category of createdCategories) {
      const postCount = createdBlogs.filter(blog => 
        (blog.category as any).toString() === (category._id as any).toString()
      ).length;
      
      await BlogCategory.findByIdAndUpdate(category._id, {
        postsCount: postCount
      });
    }
    console.log('Updated category post counts');

    console.log('Blog seeding completed successfully!');
    console.log(`Total categories: ${createdCategories.length}`);
    console.log(`Total blog posts: ${createdBlogs.length}`);
    console.log(`Featured posts: ${createdBlogs.filter(blog => blog.featured).length}`);

  } catch (error) {
    console.error('Error seeding blogs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedBlogs();
}

export default seedBlogs;