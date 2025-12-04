import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Check if demo user exists
    const existingUser = await prisma.user.findUnique({
        where: { email: 'sanjay@collegehive.in' }
    });

    if (existingUser) {
        console.log('Demo content already exists, skipping...');
        return;
    }

    // Create demo user
    const passwordHash = await bcrypt.hash('NotesApp123!', 12);
    const user = await prisma.user.create({
        data: {
            email: 'sanjay@collegehive.in',
            passwordHash,
            name: 'Sanjay',
            role: 'admin',
        }
    });

    console.log('✅ Created user:', user.email);

    // Create Business Topics
    const businessTopic = await prisma.topic.create({
        data: {
            name: 'Business Management',
            slug: 'business-management',
            description: 'Essential business management concepts and strategies',
            authorId: user.id,
            order: 1,
        }
    });

    const marketingTopic = await prisma.topic.create({
        data: {
            name: 'Marketing',
            slug: 'marketing',
            description: 'Marketing strategies and digital marketing guides',
            authorId: user.id,
            order: 2,
        }
    });

    const financeTopic = await prisma.topic.create({
        data: {
            name: 'Finance',
            slug: 'finance',
            description: 'Financial management and investment strategies',
            authorId: user.id,
            order: 3,
        }
    });

    const startupTopic = await prisma.topic.create({
        data: {
            name: 'Startup Guide',
            slug: 'startup-guide',
            description: 'Complete guide to starting and scaling a startup',
            authorId: user.id,
            order: 4,
        }
    });

    console.log('✅ Created topics');

    // Create Notes
    const notes = [
        {
            title: 'Introduction to Business Strategy',
            slug: 'intro-business-strategy',
            content: `# Introduction to Business Strategy

## What is Business Strategy?

Business strategy is a plan that defines how your organization will achieve its goals and objectives. It encompasses the decisions and actions that guide your company's direction.

## Key Components

### 1. Vision and Mission
- **Vision**: Where you want to be in the future
- **Mission**: What you do and why you exist

### 2. Core Values
Your fundamental beliefs that guide decision-making:
- Integrity
- Innovation
- Customer Focus
- Excellence

### 3. Strategic Objectives
\`\`\`
SMART Goals:
- Specific
- Measurable
- Achievable
- Relevant
- Time-bound
\`\`\`

## Porter's Five Forces

1. **Competitive Rivalry** - How intense is the competition?
2. **Supplier Power** - How much leverage do suppliers have?
3. **Buyer Power** - How much leverage do customers have?
4. **Threat of Substitution** - Are there alternative products?
5. **Threat of New Entry** - How easy is it for new competitors?

## SWOT Analysis

| Internal | External |
|----------|----------|
| **Strengths** | **Opportunities** |
| **Weaknesses** | **Threats** |

> "Strategy is about making choices, trade-offs; it's about deliberately choosing to be different." - Michael Porter
`,
            topicId: businessTopic.id,
            authorId: user.id,
            isPublic: true,
            order: 1,
        },
        {
            title: 'Leadership and Team Management',
            slug: 'leadership-team-management',
            content: `# Leadership and Team Management

## The Role of a Leader

Great leaders inspire, motivate, and guide their teams toward success. Leadership is not about authority—it's about influence.

## Leadership Styles

### 1. Transformational Leadership
- Inspires change through vision
- Encourages innovation
- Develops team members

### 2. Servant Leadership
- Puts team needs first
- Empowers employees
- Focuses on development

### 3. Democratic Leadership
- Involves team in decisions
- Values diverse opinions
- Builds consensus

## Building High-Performance Teams

\`\`\`javascript
const highPerformanceTeam = {
  trust: "Foundation of teamwork",
  communication: "Open and transparent",
  accountability: "Ownership of results",
  diversity: "Different perspectives",
  goals: "Aligned objectives"
};
\`\`\`

## Key Management Skills

1. **Communication** - Clear, frequent, and honest
2. **Delegation** - Right task to right person
3. **Conflict Resolution** - Address issues promptly
4. **Time Management** - Prioritize effectively
5. **Emotional Intelligence** - Understand and manage emotions

## Team Development Stages (Tuckman's Model)

| Stage | Description |
|-------|-------------|
| Forming | Team comes together |
| Storming | Conflicts arise |
| Norming | Rules established |
| Performing | Peak productivity |

> "A leader is one who knows the way, goes the way, and shows the way." - John C. Maxwell
`,
            topicId: businessTopic.id,
            authorId: user.id,
            isPublic: true,
            order: 2,
        },
        {
            title: 'Digital Marketing Fundamentals',
            slug: 'digital-marketing-fundamentals',
            content: `# Digital Marketing Fundamentals

## What is Digital Marketing?

Digital marketing encompasses all marketing efforts that use electronic devices or the internet to connect with potential customers.

## Key Channels

### 1. Search Engine Optimization (SEO)
Optimizing your website to rank higher in search results:
- On-page SEO
- Off-page SEO
- Technical SEO

### 2. Content Marketing
Creating valuable content to attract and engage audiences:
- Blog posts
- Videos
- Infographics
- Podcasts

### 3. Social Media Marketing
Building brand awareness on social platforms:
- Facebook, Instagram, LinkedIn
- Twitter (X), TikTok
- YouTube

### 4. Email Marketing
Direct communication with subscribers:
\`\`\`
Open Rate: 20-25% (good)
Click Rate: 2-5% (good)
Conversion: 1-3% (good)
\`\`\`

## The Marketing Funnel

\`\`\`
        AWARENESS
           ↓
        INTEREST
           ↓
       CONSIDERATION
           ↓
         INTENT
           ↓
        PURCHASE
           ↓
        LOYALTY
\`\`\`

## Key Metrics to Track

| Metric | Description |
|--------|-------------|
| CAC | Customer Acquisition Cost |
| LTV | Customer Lifetime Value |
| ROAS | Return on Ad Spend |
| CTR | Click-Through Rate |
| CVR | Conversion Rate |

> "Content is fire, social media is gasoline." - Jay Baer
`,
            topicId: marketingTopic.id,
            authorId: user.id,
            isPublic: true,
            order: 1,
        },
        {
            title: 'Financial Planning for Businesses',
            slug: 'financial-planning-businesses',
            content: `# Financial Planning for Businesses

## Why Financial Planning Matters

Sound financial planning ensures your business has the resources to achieve its goals and weather economic challenges.

## Key Financial Statements

### 1. Income Statement (P&L)
Shows profitability over a period:
\`\`\`
Revenue
- Cost of Goods Sold (COGS)
= Gross Profit
- Operating Expenses
= Operating Income
- Interest & Taxes
= Net Income
\`\`\`

### 2. Balance Sheet
Snapshot of financial position:
- **Assets** = Liabilities + Equity

### 3. Cash Flow Statement
Tracks cash movement:
- Operating activities
- Investing activities
- Financing activities

## Important Financial Ratios

| Ratio | Formula | Good Range |
|-------|---------|------------|
| Current Ratio | Current Assets / Current Liabilities | 1.5 - 3.0 |
| Gross Margin | Gross Profit / Revenue | Industry varies |
| Net Margin | Net Income / Revenue | 10%+ |
| ROE | Net Income / Equity | 15%+ |

## Budgeting Best Practices

1. **Zero-based budgeting** - Justify every expense
2. **Rolling forecasts** - Update regularly
3. **Variance analysis** - Compare actual vs planned
4. **Contingency reserves** - Plan for unexpected

## Cash Flow Management

\`\`\`javascript
const healthyCashFlow = {
  invoicing: "Send immediately",
  collections: "Follow up within 7 days",
  payables: "Negotiate favorable terms",
  reserves: "3-6 months expenses",
  forecast: "Weekly cash projections"
};
\`\`\`

> "Cash is king, but cash flow is the kingdom." - Unknown
`,
            topicId: financeTopic.id,
            authorId: user.id,
            isPublic: true,
            order: 1,
        },
        {
            title: 'How to Start a Startup',
            slug: 'how-to-start-startup',
            content: `# How to Start a Startup

## The Startup Journey

Starting a company is one of the most challenging and rewarding things you can do. Here's your roadmap to success.

## Step 1: Find a Problem Worth Solving

The best startups solve real problems:
- Talk to potential customers
- Identify pain points
- Validate the market size

\`\`\`
Problem → Solution → Business Model
\`\`\`

## Step 2: Validate Your Idea

Before building, validate:
1. **Customer interviews** (20+ conversations)
2. **Landing page test** (measure signups)
3. **MVP** (Minimum Viable Product)

## Step 3: Build Your MVP

Focus on core features only:
- What's the ONE thing users need?
- Launch fast, iterate faster
- Get real user feedback

## Step 4: Find Product-Market Fit

Signs you have PMF:
- Users are disappointed when product is unavailable
- Word-of-mouth growth
- Retention is strong
- Usage is increasing

## Funding Options

| Stage | Funding Source | Amount |
|-------|---------------|--------|
| Pre-seed | Friends, Family, Angels | $50K - $500K |
| Seed | Angel Investors, Seed Funds | $500K - $2M |
| Series A | VCs | $2M - $15M |
| Series B+ | Growth VCs | $15M+ |

## Key Metrics for Startups

\`\`\`javascript
const startupMetrics = {
  MRR: "Monthly Recurring Revenue",
  ARR: "Annual Recurring Revenue", 
  churn: "Customer churn rate",
  CAC: "Customer Acquisition Cost",
  LTV: "Lifetime Value",
  runway: "Months of cash remaining"
};
\`\`\`

## Common Startup Mistakes

1. ❌ Building without validation
2. ❌ Ignoring unit economics
3. ❌ Scaling too early
4. ❌ Wrong co-founder
5. ❌ Running out of cash

> "The only way to win is to learn faster than anyone else." - Eric Ries
`,
            topicId: startupTopic.id,
            authorId: user.id,
            isPublic: true,
            order: 1,
        },
    ];

    for (const note of notes) {
        await prisma.note.create({ data: note });
    }

    console.log('✅ Created', notes.length, 'notes');
    console.log('🎉 Seeding complete!');
}

main()
    .catch((e) => {
        console.error('Error seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
