import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Folder, MoreHorizontal, Pencil, Trash2, Eye, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { topicsApi, notesApi } from '../api/client';
import styles from './Dashboard.module.css';

interface Topic {
    id: string;
    name: string;
    slug: string;
    description?: string;
    isPublic: boolean;
    _count?: { notes: number };
}

interface Note {
    id: string;
    title: string;
    slug: string;
    isPublic: boolean;
    isDraft: boolean;
    topic?: { name: string };
    updatedAt: string;
}

export default function Dashboard() {
    const [showNewTopic, setShowNewTopic] = useState(false);
    const [newTopicName, setNewTopicName] = useState('');
    const [newTopicSlug, setNewTopicSlug] = useState('');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { data: topicsData, isLoading: topicsLoading } = useQuery({
        queryKey: ['topics', 'flat'],
        queryFn: async () => {
            const res = await topicsApi.list({ flat: true });
            return res.data.topics as Topic[];
        },
    });

    const { data: notesData, isLoading: notesLoading } = useQuery({
        queryKey: ['notes'],
        queryFn: async () => {
            const res = await notesApi.list({ limit: 10 });
            return res.data.notes as Note[];
        },
    });

    const createTopicMutation = useMutation({
        mutationFn: (data: { name: string; slug: string }) => topicsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['topics'] });
            setShowNewTopic(false);
            setNewTopicName('');
            setNewTopicSlug('');
            toast.success('Topic created!');
        },
        onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to create topic'),
    });

    const deleteTopicMutation = useMutation({
        mutationFn: (id: string) => topicsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['topics'] });
            toast.success('Topic deleted');
        },
        onError: () => toast.error('Failed to delete topic'),
    });

    const deleteNoteMutation = useMutation({
        mutationFn: (id: string) => notesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notes'] });
            toast.success('Note deleted');
        },
        onError: () => toast.error('Failed to delete note'),
    });

    const handleCreateTopic = (e: React.FormEvent) => {
        e.preventDefault();
        const slug = newTopicSlug || newTopicName.toLowerCase().replace(/\s+/g, '-');
        createTopicMutation.mutate({ name: newTopicName, slug });
    };

    return (
        <div className={styles.dashboard}>
            <header className={styles.header}>
                <h1>Dashboard</h1>
                <Link to="/editor/new" className="btn btn-primary">
                    <Plus size={18} /> New Note
                </Link>
            </header>

            {/* Stats */}
            <div className={styles.stats}>
                <div className={styles.statCard}>
                    <Folder size={24} />
                    <div>
                        <span className={styles.statValue}>{topicsData?.length || 0}</span>
                        <span className={styles.statLabel}>Topics</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <FileText size={24} />
                    <div>
                        <span className={styles.statValue}>{notesData?.length || 0}</span>
                        <span className={styles.statLabel}>Notes</span>
                    </div>
                </div>
            </div>

            <div className={styles.grid}>
                {/* Topics */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>Topics</h2>
                        <button className="btn btn-ghost" onClick={() => setShowNewTopic(true)}>
                            <Plus size={16} /> Add
                        </button>
                    </div>

                    <AnimatePresence>
                        {showNewTopic && (
                            <motion.form
                                className={styles.newTopicForm}
                                onSubmit={handleCreateTopic}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <input
                                    type="text"
                                    placeholder="Topic name"
                                    value={newTopicName}
                                    onChange={(e) => {
                                        setNewTopicName(e.target.value);
                                        if (!newTopicSlug || newTopicSlug === e.target.value.slice(0, -1).toLowerCase().replace(/\s+/g, '-')) {
                                            setNewTopicSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                                        }
                                    }}
                                    className="input"
                                    autoFocus
                                />
                                <input
                                    type="text"
                                    placeholder="slug"
                                    value={newTopicSlug}
                                    onChange={(e) => setNewTopicSlug(e.target.value)}
                                    className="input"
                                />
                                <div className={styles.formActions}>
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowNewTopic(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={createTopicMutation.isPending}>
                                        {createTopicMutation.isPending ? <Loader2 size={16} className={styles.spinner} /> : 'Create'}
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    <div className={styles.list}>
                        {topicsLoading ? (
                            <div className={styles.loading}><Loader2 size={24} className={styles.spinner} /></div>
                        ) : topicsData && topicsData.length > 0 ? (
                            topicsData.map((topic) => (
                                <div key={topic.id} className={styles.listItem}>
                                    <div className={styles.itemInfo}>
                                        <Folder size={18} />
                                        <div>
                                            <span className={styles.itemTitle}>{topic.name}</span>
                                            <span className={styles.itemMeta}>
                                                {topic._count?.notes || 0} notes • {topic.isPublic ? 'Public' : 'Private'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.itemActions}>
                                        <button
                                            className="btn btn-ghost btn-icon"
                                            onClick={() => setActiveMenu(activeMenu === topic.id ? null : topic.id)}
                                        >
                                            <MoreHorizontal size={16} />
                                        </button>
                                        {activeMenu === topic.id && (
                                            <div className={styles.menu}>
                                                <Link to={`/docs/${topic.slug}`} className={styles.menuItem}>
                                                    <Eye size={14} /> View
                                                </Link>
                                                <button
                                                    className={styles.menuItem}
                                                    onClick={() => deleteTopicMutation.mutate(topic.id)}
                                                >
                                                    <Trash2 size={14} /> Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className={styles.empty}>No topics yet. Create your first topic!</div>
                        )}
                    </div>
                </section>

                {/* Recent Notes */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>Recent Notes</h2>
                        <Link to="/editor/new" className="btn btn-ghost">
                            <Plus size={16} /> New
                        </Link>
                    </div>

                    <div className={styles.list}>
                        {notesLoading ? (
                            <div className={styles.loading}><Loader2 size={24} className={styles.spinner} /></div>
                        ) : notesData && notesData.length > 0 ? (
                            notesData.map((note) => (
                                <div key={note.id} className={styles.listItem}>
                                    <div className={styles.itemInfo}>
                                        <FileText size={18} />
                                        <div>
                                            <span className={styles.itemTitle}>
                                                {note.title}
                                                {note.isDraft && <span className="badge" style={{ marginLeft: '8px' }}>Draft</span>}
                                            </span>
                                            <span className={styles.itemMeta}>
                                                {note.topic?.name} • {new Date(note.updatedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.itemActions}>
                                        <Link to={`/editor/${note.id}`} className="btn btn-ghost btn-icon">
                                            <Pencil size={16} />
                                        </Link>
                                        <button
                                            className="btn btn-ghost btn-icon"
                                            onClick={() => deleteNoteMutation.mutate(note.id)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className={styles.empty}>No notes yet. Create your first note!</div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
