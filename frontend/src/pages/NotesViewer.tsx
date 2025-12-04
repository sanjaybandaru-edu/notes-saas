import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Calendar, User, Eye, Clock, Tag } from 'lucide-react';
import { notesApi, topicsApi } from '../api/client';
import styles from './NotesViewer.module.css';

export default function NotesViewer() {
    const { topicSlug, noteSlug } = useParams();

    const { data: note, isLoading } = useQuery({
        queryKey: ['note', topicSlug, noteSlug],
        queryFn: async () => {
            if (topicSlug && noteSlug) {
                const res = await notesApi.getBySlug(topicSlug, noteSlug);
                return res.data.note;
            }
            return null;
        },
        enabled: !!topicSlug && !!noteSlug,
    });

    const { data: topic } = useQuery({
        queryKey: ['topic', topicSlug],
        queryFn: async () => {
            if (topicSlug && !noteSlug) {
                const res = await topicsApi.getBySlug(topicSlug);
                return res.data.topic;
            }
            return null;
        },
        enabled: !!topicSlug && !noteSlug,
    });

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <div className={styles.skeleton} style={{ width: '60%', height: '40px' }} />
                <div className={styles.skeleton} style={{ width: '100%', height: '20px' }} />
                <div className={styles.skeleton} style={{ width: '90%', height: '20px' }} />
                <div className={styles.skeleton} style={{ width: '80%', height: '20px' }} />
            </div>
        );
    }

    if (!note && !topic) {
        return (
            <div className={styles.welcome}>
                <h1>Welcome to <span className="text-gradient">NotesSaaS</span></h1>
                <p>Select a topic or note from the sidebar to get started.</p>
            </div>
        );
    }

    if (topic && !note) {
        return (
            <div className={styles.topicView}>
                <h1>{topic.name}</h1>
                {topic.description && <p className={styles.description}>{topic.description}</p>}

                <div className={styles.notesList}>
                    <h2>Notes in this topic</h2>
                    {topic.notes && topic.notes.length > 0 ? (
                        <div className={styles.notesGrid}>
                            {topic.notes.map((n: any) => (
                                <a key={n.id} href={`/docs/${topicSlug}/${n.slug}`} className={styles.noteCard}>
                                    <h3>{n.title}</h3>
                                    {n.excerpt && <p>{n.excerpt}</p>}
                                </a>
                            ))}
                        </div>
                    ) : (
                        <p className={styles.empty}>No notes in this topic yet.</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <article className={styles.article}>
            <header className={styles.header}>
                <h1>{note.title}</h1>
                <div className={styles.meta}>
                    {note.user && (
                        <span><User size={14} /> {note.user.name || 'Anonymous'}</span>
                    )}
                    <span><Calendar size={14} /> {new Date(note.publishedAt || note.createdAt).toLocaleDateString()}</span>
                    {note.views > 0 && <span><Eye size={14} /> {note.views} views</span>}
                    <span><Clock size={14} /> {Math.ceil(note.content.length / 1000)} min read</span>
                </div>
                {note.tags && note.tags.length > 0 && (
                    <div className={styles.tags}>
                        {note.tags.map((tag: any) => (
                            <span key={tag.id} className="badge badge-primary">
                                <Tag size={12} /> {tag.name}
                            </span>
                        ))}
                    </div>
                )}
            </header>

            <div className={`markdown-content ${styles.content}`}>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        code({ className, children }) {
                            const match = /language-(\w+)/.exec(className || '');
                            const inline = !match;
                            return !inline ? (
                                <SyntaxHighlighter
                                    style={oneDark as any}
                                    language={match[1]}
                                    PreTag="div"
                                >
                                    {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                            ) : (
                                <code className={className}>
                                    {children}
                                </code>
                            );
                        },
                    }}
                >
                    {note.content}
                </ReactMarkdown>
            </div>
        </article>
    );
}
