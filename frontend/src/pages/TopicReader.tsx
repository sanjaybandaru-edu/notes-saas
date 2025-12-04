import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styles from './TopicReader.module.css';

// Icons
const ChevronLeftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 18l-6-6 6-6" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 18l6-6-6-6" />
    </svg>
);

const BookmarkIcon = ({ filled }: { filled?: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
);

const ShareIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
);

const PrintIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
    </svg>
);

const MenuIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
);

const CloseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

interface Topic {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    order: number;
    publishedAt?: string;
    createdBy?: {
        id: string;
        name: string;
        avatar?: string;
    };
    chapter: {
        id: string;
        title: string;
        slug: string;
        subject: {
            id: string;
            name: string;
            code: string;
        };
        topics: Array<{
            id: string;
            title: string;
            slug: string;
            order: number;
        }>;
    };
}

interface TableOfContentsItem {
    id: string;
    text: string;
    level: number;
}

export default function TopicReader() {
    const { subjectId, chapterId, topicId } = useParams();
    const navigate = useNavigate();
    const contentRef = useRef<HTMLDivElement>(null);

    const [topic, setTopic] = useState<Topic | null>(null);
    const [loading, setLoading] = useState(true);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([]);
    const [activeHeading, setActiveHeading] = useState<string>('');
    const [progress, setProgress] = useState(0);

    // Mock data - replace with API call
    useEffect(() => {
        setLoading(true);
        // Simulating API call
        setTimeout(() => {
            setTopic({
                id: '1',
                title: 'Introduction to Arrays',
                slug: 'introduction-to-arrays',
                content: `# Introduction to Arrays

An **array** is a collection of elements stored at contiguous memory locations. It is one of the most fundamental data structures in computer science.

## Why Use Arrays?

- **Constant-time access**: Access any element using its index in O(1) time
- **Memory efficiency**: Elements stored contiguously in memory
- **Cache friendly**: Better cache locality due to contiguous storage

## Declaring Arrays

\`\`\`c
// C/C++
int arr[5] = {1, 2, 3, 4, 5};

// Java
int[] arr = new int[5];

// Python
arr = [1, 2, 3, 4, 5]
\`\`\`

## Time Complexity

| Operation | Average | Worst |
|-----------|---------|-------|
| Access | O(1) | O(1) |
| Search | O(n) | O(n) |
| Insert | O(n) | O(n) |
| Delete | O(n) | O(n) |

## Types of Arrays

### One-Dimensional Arrays
The simplest form of an array, containing elements in a single row.

### Multi-Dimensional Arrays
Arrays that contain more than one dimension, like 2D or 3D arrays.

\`\`\`python
# 2D Array
matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
]
\`\`\`

## Key Points to Remember

1. Arrays are zero-indexed (first element at index 0)
2. Size is typically fixed at creation time
3. All elements must be of the same type

> **Note**: In languages like Python and JavaScript, arrays (lists) are dynamically sized and can hold mixed types.

## Practice Problems

Try solving these problems to solidify your understanding:

1. Find the maximum element in an array
2. Reverse an array in-place
3. Rotate an array by k positions
`,
                order: 1,
                publishedAt: new Date().toISOString(),
                createdBy: {
                    id: '1',
                    name: 'Admin',
                },
                chapter: {
                    id: '1',
                    title: 'Arrays',
                    slug: 'arrays',
                    subject: {
                        id: '1',
                        name: 'Data Structures',
                        code: '21CS32',
                    },
                    topics: [
                        { id: '1', title: 'Introduction to Arrays', slug: 'introduction-to-arrays', order: 1 },
                        { id: '2', title: 'Array Operations', slug: 'array-operations', order: 2 },
                        { id: '3', title: 'Multi-dimensional Arrays', slug: 'multi-dimensional-arrays', order: 3 },
                    ],
                },
            });
            setLoading(false);
        }, 500);
    }, [topicId]);

    // Extract table of contents from content
    useEffect(() => {
        if (topic?.content) {
            const headings = topic.content.match(/^#{1,3}\s.+$/gm) || [];
            const toc = headings.map((heading) => {
                const level = (heading.match(/^#+/) || [''])[0].length;
                const text = heading.replace(/^#+\s/, '');
                const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                return { id, text, level };
            });
            setTableOfContents(toc);
        }
    }, [topic?.content]);

    // Track scroll progress
    useEffect(() => {
        const handleScroll = () => {
            if (!contentRef.current) return;
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            const scrollProgress = (scrollTop / (scrollHeight - clientHeight)) * 100;
            setProgress(Math.min(scrollProgress, 100));

            // Find active heading
            const headings = contentRef.current.querySelectorAll('h1, h2, h3');
            let currentHeading = '';
            headings.forEach((heading) => {
                const rect = heading.getBoundingClientRect();
                if (rect.top < 150) {
                    currentHeading = heading.id;
                }
            });
            setActiveHeading(currentHeading);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleBookmark = () => {
        setIsBookmarked(!isBookmarked);
        // TODO: API call to save bookmark
    };

    const handleShare = async () => {
        try {
            await navigator.share({
                title: topic?.title,
                url: window.location.href,
            });
        } catch {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const navigateToTopic = (direction: 'prev' | 'next') => {
        if (!topic) return;
        const currentIndex = topic.chapter.topics.findIndex(t => t.id === topic.id);
        const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
        const targetTopic = topic.chapter.topics[targetIndex];
        if (targetTopic) {
            navigate(`/read/${subjectId}/${chapterId}/${targetTopic.id}`);
        }
    };

    const currentIndex = topic ? topic.chapter.topics.findIndex(t => t.id === topic.id) : -1;
    const hasPrev = currentIndex > 0;
    const hasNext = topic ? currentIndex < topic.chapter.topics.length - 1 : false;

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.skeleton} style={{ height: 40, width: '60%' }} />
                <div className={styles.skeleton} style={{ height: 20, width: '40%', marginTop: 16 }} />
                <div className={styles.skeleton} style={{ height: 200, marginTop: 32 }} />
                <div className={styles.skeleton} style={{ height: 100, marginTop: 16 }} />
            </div>
        );
    }

    if (!topic) {
        return (
            <div className={styles.error}>
                <h2>Topic not found</h2>
                <p>The requested topic could not be found.</p>
                <Link to="/docs" className="btn btn-primary">Browse Documentation</Link>
            </div>
        );
    }

    return (
        <div className={styles.reader}>
            {/* Progress Bar */}
            <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>

            {/* Mobile Menu Toggle */}
            <button
                className={styles.mobileMenuBtn}
                onClick={() => setSidebarOpen(!sidebarOpen)}
            >
                {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
                {/* Breadcrumb */}
                <div className={styles.breadcrumb}>
                    <Link to="/docs">{topic.chapter.subject.name}</Link>
                    <span>/</span>
                    <span>{topic.chapter.title}</span>
                </div>

                {/* Chapter Topics */}
                <nav className={styles.topicsNav}>
                    <h3 className={styles.navTitle}>In This Chapter</h3>
                    {topic.chapter.topics.map((t) => (
                        <Link
                            key={t.id}
                            to={`/read/${subjectId}/${chapterId}/${t.id}`}
                            className={`${styles.topicLink} ${t.id === topic.id ? styles.active : ''}`}
                        >
                            <span className={styles.topicNumber}>{t.order}</span>
                            {t.title}
                        </Link>
                    ))}
                </nav>

                {/* Table of Contents */}
                {tableOfContents.length > 0 && (
                    <nav className={styles.tableOfContents}>
                        <h3 className={styles.navTitle}>On This Page</h3>
                        {tableOfContents.map((item) => (
                            <a
                                key={item.id}
                                href={`#${item.id}`}
                                className={`${styles.tocLink} ${styles[`level${item.level}`]} ${activeHeading === item.id ? styles.active : ''}`}
                            >
                                {item.text}
                            </a>
                        ))}
                    </nav>
                )}
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                {/* Header */}
                <header className={styles.header}>
                    <div className={styles.headerTop}>
                        <span className={`badge badge-gold`}>{topic.chapter.subject.code}</span>
                        <div className={styles.actions}>
                            <button
                                className={`${styles.actionBtn} ${isBookmarked ? styles.bookmarked : ''}`}
                                onClick={handleBookmark}
                                title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                            >
                                <BookmarkIcon filled={isBookmarked} />
                            </button>
                            <button className={styles.actionBtn} onClick={handleShare} title="Share">
                                <ShareIcon />
                            </button>
                            <button className={styles.actionBtn} onClick={handlePrint} title="Print">
                                <PrintIcon />
                            </button>
                        </div>
                    </div>
                    <h1 className={styles.title}>{topic.title}</h1>
                    {topic.createdBy && (
                        <div className={styles.meta}>
                            <span>By {topic.createdBy.name}</span>
                            {topic.publishedAt && (
                                <>
                                    <span className={styles.dot}>•</span>
                                    <span>{new Date(topic.publishedAt).toLocaleDateString()}</span>
                                </>
                            )}
                        </div>
                    )}
                </header>

                {/* Content */}
                <article className={`${styles.content} markdown-content`} ref={contentRef}>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            h1: ({ children, ...props }) => {
                                const id = String(children).toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                                return <h1 id={id} {...props}>{children}</h1>;
                            },
                            h2: ({ children, ...props }) => {
                                const id = String(children).toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                                return <h2 id={id} {...props}>{children}</h2>;
                            },
                            h3: ({ children, ...props }) => {
                                const id = String(children).toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                                return <h3 id={id} {...props}>{children}</h3>;
                            },
                            code({ className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || '');
                                const inline = !match;
                                return !inline ? (
                                    <SyntaxHighlighter
                                        style={oneDark}
                                        language={match ? match[1] : 'text'}
                                        PreTag="div"
                                    >
                                        {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                ) : (
                                    <code className={className} {...props}>
                                        {children}
                                    </code>
                                );
                            },
                        }}
                    >
                        {topic.content}
                    </ReactMarkdown>
                </article>

                {/* Navigation */}
                <nav className={styles.navigation}>
                    <button
                        className={`${styles.navBtn} ${styles.prev}`}
                        onClick={() => navigateToTopic('prev')}
                        disabled={!hasPrev}
                    >
                        <ChevronLeftIcon />
                        <span>
                            <small>Previous</small>
                            <strong>{hasPrev && topic.chapter.topics[currentIndex - 1].title}</strong>
                        </span>
                    </button>
                    <button
                        className={`${styles.navBtn} ${styles.next}`}
                        onClick={() => navigateToTopic('next')}
                        disabled={!hasNext}
                    >
                        <span>
                            <small>Next</small>
                            <strong>{hasNext && topic.chapter.topics[currentIndex + 1].title}</strong>
                        </span>
                        <ChevronRightIcon />
                    </button>
                </nav>
            </main>
        </div>
    );
}
