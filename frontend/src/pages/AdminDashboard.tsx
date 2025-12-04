import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './AdminDashboard.module.css';

// Stat Card Component
interface StatCardProps {
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon: React.ReactNode;
}

function StatCard({ title, value, change, changeType = 'neutral', icon }: StatCardProps) {
    return (
        <div className={styles.statCard}>
            <div className={styles.statIcon}>{icon}</div>
            <div className={styles.statContent}>
                <span className={styles.statTitle}>{title}</span>
                <span className={styles.statValue}>{value}</span>
                {change && (
                    <span className={`${styles.statChange} ${styles[changeType]}`}>
                        {change}
                    </span>
                )}
            </div>
        </div>
    );
}

// Quick Action Card
interface QuickActionProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    to: string;
}

function QuickAction({ title, description, icon, to }: QuickActionProps) {
    return (
        <Link to={to} className={styles.quickAction}>
            <div className={styles.quickActionIcon}>{icon}</div>
            <span className={styles.quickActionTitle}>{title}</span>
            <span className={styles.quickActionDesc}>{description}</span>
        </Link>
    );
}

// Recent Activity Item
interface ActivityItemProps {
    action: string;
    target: string;
    user: string;
    time: string;
    type: 'create' | 'update' | 'delete' | 'publish';
}

function ActivityItem({ action, target, user, time, type }: ActivityItemProps) {
    const typeColors = {
        create: '#22C55E',
        update: '#3B82F6',
        delete: '#EF4444',
        publish: '#C9A962',
    };

    return (
        <div className={styles.activityItem}>
            <div
                className={styles.activityDot}
                style={{ backgroundColor: typeColors[type] }}
            />
            <div className={styles.activityContent}>
                <span className={styles.activityText}>
                    <strong>{user}</strong> {action} <strong>{target}</strong>
                </span>
                <span className={styles.activityTime}>{time}</span>
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalTopics: 0,
        totalUsers: 0,
        totalViews: 0,
        activeUsers: 0,
    });

    useEffect(() => {
        // Mock data - would fetch from API
        setStats({
            totalTopics: 156,
            totalUsers: 1247,
            totalViews: 45892,
            activeUsers: 342,
        });
    }, []);

    return (
        <div className={styles.dashboard}>
            {/* Page Header */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Dashboard</h1>
                    <p className={styles.pageSubtitle}>
                        Welcome back! Here's what's happening with your platform.
                    </p>
                </div>
                <Link to="/admin/content/new" className="btn btn-primary">
                    <span>+</span> New Topic
                </Link>
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <StatCard
                    title="Total Topics"
                    value={stats.totalTopics}
                    change="+12 this week"
                    changeType="positive"
                    icon={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                        </svg>
                    }
                />
                <StatCard
                    title="Total Users"
                    value={stats.totalUsers.toLocaleString()}
                    change="+89 this month"
                    changeType="positive"
                    icon={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    }
                />
                <StatCard
                    title="Page Views"
                    value={stats.totalViews.toLocaleString()}
                    change="+23% from last week"
                    changeType="positive"
                    icon={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    }
                />
                <StatCard
                    title="Active Now"
                    value={stats.activeUsers}
                    changeType="neutral"
                    icon={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                    }
                />
            </div>

            {/* Content Grid */}
            <div className={styles.contentGrid}>
                {/* Quick Actions */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Quick Actions</h2>
                    <div className={styles.quickActionsGrid}>
                        <QuickAction
                            title="Create Topic"
                            description="Add new content"
                            to="/admin/content/new"
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            }
                        />
                        <QuickAction
                            title="Review Queue"
                            description="5 pending"
                            to="/admin/content?status=review"
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="9 11 12 14 22 4" />
                                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                </svg>
                            }
                        />
                        <QuickAction
                            title="Manage Users"
                            description="User management"
                            to="/admin/users"
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                </svg>
                            }
                        />
                        <QuickAction
                            title="View Analytics"
                            description="Performance data"
                            to="/admin/analytics"
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="20" x2="18" y2="10" />
                                    <line x1="12" y1="20" x2="12" y2="4" />
                                    <line x1="6" y1="20" x2="6" y2="14" />
                                </svg>
                            }
                        />
                    </div>
                </div>

                {/* Recent Activity */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Recent Activity</h2>
                        <Link to="/admin/audit" className={styles.sectionLink}>
                            View all
                        </Link>
                    </div>
                    <div className={styles.activityList}>
                        <ActivityItem
                            user="Admin"
                            action="published"
                            target="Introduction to Arrays"
                            time="2 minutes ago"
                            type="publish"
                        />
                        <ActivityItem
                            user="John Doe"
                            action="created"
                            target="Database Normalization"
                            time="15 minutes ago"
                            type="create"
                        />
                        <ActivityItem
                            user="Admin"
                            action="updated"
                            target="Operating Systems Overview"
                            time="1 hour ago"
                            type="update"
                        />
                        <ActivityItem
                            user="Jane Smith"
                            action="submitted for review"
                            target="Machine Learning Basics"
                            time="2 hours ago"
                            type="update"
                        />
                        <ActivityItem
                            user="Admin"
                            action="archived"
                            target="Deprecated Content"
                            time="3 hours ago"
                            type="delete"
                        />
                    </div>
                </div>
            </div>

            {/* Content Overview */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Content by Status</h2>
                <div className={styles.statusGrid}>
                    <div className={`${styles.statusCard} ${styles.draft}`}>
                        <span className={styles.statusCount}>12</span>
                        <span className={styles.statusLabel}>Drafts</span>
                    </div>
                    <div className={`${styles.statusCard} ${styles.review}`}>
                        <span className={styles.statusCount}>5</span>
                        <span className={styles.statusLabel}>In Review</span>
                    </div>
                    <div className={`${styles.statusCard} ${styles.approved}`}>
                        <span className={styles.statusCount}>8</span>
                        <span className={styles.statusLabel}>Approved</span>
                    </div>
                    <div className={`${styles.statusCard} ${styles.published}`}>
                        <span className={styles.statusCount}>131</span>
                        <span className={styles.statusLabel}>Published</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
