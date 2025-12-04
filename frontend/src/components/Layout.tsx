import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import styles from './Layout.module.css';

interface LayoutProps {
    showSidebar?: boolean;
}

export default function Layout({ showSidebar = true }: LayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className={styles.layout}>
            <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
            <div className={styles.container}>
                {showSidebar && (
                    <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                )}
                <main className={`${styles.main} ${!showSidebar ? styles.full : ''}`}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
