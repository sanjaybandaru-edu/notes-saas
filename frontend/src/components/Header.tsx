import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, User, LogOut, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/auth';
import styles from './Header.module.css';

interface HeaderProps {
    onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const { user, isAuthenticated, logout } = useAuthStore();
    const navigate = useNavigate();
    const [theme, setTheme] = useState(() =>
        localStorage.getItem('theme') || 'dark'
    );
    const [showUserMenu, setShowUserMenu] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const toggleTheme = () => {
        setTheme(t => t === 'dark' ? 'light' : 'dark');
    };

    return (
        <header className={styles.header}>
            <div className={styles.left}>
                <button className={`btn btn-ghost btn-icon ${styles.menuBtn}`} onClick={onMenuClick}>
                    <Menu size={20} />
                </button>
                <Link to="/" className={styles.logo}>
                    <span className="text-gradient">Notes</span>SaaS
                </Link>
            </div>

            <div className={styles.center}>
                <div className={styles.search}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search notes..."
                        className={styles.searchInput}
                    />
                    <kbd className={styles.kbd}>⌘K</kbd>
                </div>
            </div>

            <div className={styles.right}>
                <button className="btn btn-ghost btn-icon" onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {isAuthenticated ? (
                    <div className={styles.userMenu}>
                        <button
                            className={styles.userBtn}
                            onClick={() => setShowUserMenu(!showUserMenu)}
                        >
                            {user?.avatar ? (
                                <img src={user.avatar} alt={user.name || 'User'} className={styles.avatar} />
                            ) : (
                                <div className={styles.avatarPlaceholder}>
                                    {user?.name?.[0] || user?.email?.[0] || 'U'}
                                </div>
                            )}
                        </button>
                        {showUserMenu && (
                            <div className={styles.dropdown}>
                                <div className={styles.dropdownHeader}>
                                    <p className={styles.userName}>{user?.name || 'User'}</p>
                                    <p className={styles.userEmail}>{user?.email}</p>
                                </div>
                                <hr />
                                <Link to="/dashboard" className={styles.dropdownItem}>
                                    <User size={16} /> Dashboard
                                </Link>
                                <button onClick={handleLogout} className={styles.dropdownItem}>
                                    <LogOut size={16} /> Logout
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={styles.authLinks}>
                        <Link to="/login" className="btn btn-ghost">Login</Link>
                        <Link to="/register" className="btn btn-primary">Get Started</Link>
                    </div>
                )}
            </div>
        </header>
    );
}
