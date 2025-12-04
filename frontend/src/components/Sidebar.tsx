import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen, X, Plus } from 'lucide-react';
import { useState } from 'react';
import { topicsApi } from '../api/client';
import { useAuthStore } from '../stores/auth';
import styles from './Sidebar.module.css';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Topic {
    id: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    parentId?: string;
    children?: Topic[];
    _count?: { notes: number };
}

function TopicItem({ topic, level = 0 }: { topic: Topic; level?: number }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const location = useLocation();
    const isActive = location.pathname.includes(`/docs/${topic.slug}`);
    const hasChildren = topic.children && topic.children.length > 0;

    return (
        <div className={styles.topicItem}>
            <Link
                to={`/docs/${topic.slug}`}
                className={`${styles.topicLink} ${isActive ? styles.active : ''}`}
                style={{ paddingLeft: `${level * 16 + 12}px` }}
            >
                {hasChildren ? (
                    <button
                        className={styles.expandBtn}
                        onClick={(e) => { e.preventDefault(); setIsExpanded(!isExpanded); }}
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                ) : (
                    <span className={styles.expandPlaceholder} />
                )}
                {hasChildren ? (
                    isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />
                ) : (
                    <FileText size={16} />
                )}
                <span className={styles.topicName}>{topic.name}</span>
                {topic._count && topic._count.notes > 0 && (
                    <span className={styles.count}>{topic._count.notes}</span>
                )}
            </Link>
            {hasChildren && isExpanded && (
                <div className={styles.children}>
                    {topic.children!.map(child => (
                        <TopicItem key={child.id} topic={child} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { isAuthenticated } = useAuthStore();
    const { data, isLoading } = useQuery({
        queryKey: ['topics'],
        queryFn: async () => {
            const res = await topicsApi.list();
            return res.data.topics as Topic[];
        },
    });

    return (
        <>
            <div className={`${styles.overlay} ${isOpen ? styles.visible : ''}`} onClick={onClose} />
            <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Documentation</h2>
                    <button className={`btn btn-ghost btn-icon ${styles.closeBtn}`} onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <nav className={styles.nav}>
                    {isLoading ? (
                        <div className={styles.loading}>
                            <div className={styles.skeleton} />
                            <div className={styles.skeleton} />
                            <div className={styles.skeleton} />
                        </div>
                    ) : data && data.length > 0 ? (
                        data.map(topic => (
                            <TopicItem key={topic.id} topic={topic} />
                        ))
                    ) : (
                        <div className={styles.empty}>
                            <p>No topics yet</p>
                            {isAuthenticated && (
                                <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: '12px' }}>
                                    <Plus size={16} /> Create Topic
                                </Link>
                            )}
                        </div>
                    )}
                </nav>

                {isAuthenticated && (
                    <div className={styles.footer}>
                        <Link to="/dashboard" className="btn btn-secondary" style={{ width: '100%' }}>
                            <Plus size={16} /> New Topic
                        </Link>
                    </div>
                )}
            </aside>
        </>
    );
}
