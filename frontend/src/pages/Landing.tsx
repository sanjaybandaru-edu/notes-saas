import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Zap, Shield, Cloud, ArrowRight, Github } from 'lucide-react';
import styles from './Landing.module.css';

const features = [
    {
        icon: FileText,
        title: 'Beautiful Documentation',
        description: 'Write in Markdown, publish beautiful documentation instantly.',
    },
    {
        icon: Zap,
        title: 'Lightning Fast',
        description: 'Powered by CDN for instant page loads worldwide.',
    },
    {
        icon: Shield,
        title: 'Secure & Private',
        description: 'Your data is encrypted and protected with enterprise security.',
    },
    {
        icon: Cloud,
        title: 'Cloud Hosted',
        description: 'No servers to manage. We handle everything for you.',
    },
];

export default function Landing() {
    return (
        <div className={styles.landing}>
            {/* Header */}
            <header className={styles.header}>
                <Link to="/" className={styles.logo}>
                    <span className="text-gradient">Notes</span>SaaS
                </Link>
                <nav className={styles.nav}>
                    <Link to="/docs">Documentation</Link>
                    <Link to="/login">Login</Link>
                    <Link to="/register" className="btn btn-primary">
                        Get Started <ArrowRight size={16} />
                    </Link>
                </nav>
            </header>

            {/* Hero */}
            <section className={styles.hero}>
                <motion.div
                    className={styles.heroContent}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <span className={styles.badge}>✨ Now with AI-powered search</span>
                    <h1 className={styles.title}>
                        Beautiful <span className="text-gradient">Documentation</span>
                        <br />Made Simple
                    </h1>
                    <p className={styles.subtitle}>
                        Create, organize, and share your notes and documentation with a
                        stunning interface. Built for developers, teams, and creators.
                    </p>
                    <div className={styles.heroActions}>
                        <Link to="/register" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '16px' }}>
                            Start for Free <ArrowRight size={18} />
                        </Link>
                        <Link to="/docs" className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '16px' }}>
                            View Demo
                        </Link>
                    </div>
                </motion.div>

                <motion.div
                    className={styles.heroImage}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <div className={styles.mockup}>
                        <div className={styles.mockupHeader}>
                            <div className={styles.dots}>
                                <span /><span /><span />
                            </div>
                        </div>
                        <div className={styles.mockupContent}>
                            <div className={styles.mockupSidebar}>
                                <div className={styles.mockupItem} />
                                <div className={styles.mockupItem} />
                                <div className={styles.mockupItem} />
                            </div>
                            <div className={styles.mockupMain}>
                                <div className={styles.mockupTitle} />
                                <div className={styles.mockupLine} />
                                <div className={styles.mockupLine} style={{ width: '80%' }} />
                                <div className={styles.mockupLine} style={{ width: '60%' }} />
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Features */}
            <section className={styles.features}>
                <div className={styles.featuresHeader}>
                    <h2>Everything you need</h2>
                    <p>Powerful features to help you write and share documentation</p>
                </div>
                <div className={styles.featuresGrid}>
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            className={styles.featureCard}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: i * 0.1 }}
                        >
                            <div className={styles.featureIcon}>
                                <feature.icon size={24} />
                            </div>
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className={styles.cta}>
                <motion.div
                    className={styles.ctaContent}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2>Ready to get started?</h2>
                    <p>Join thousands of developers and teams using NotesSaaS</p>
                    <Link to="/register" className="btn btn-primary" style={{ padding: '14px 28px' }}>
                        Create Free Account <ArrowRight size={18} />
                    </Link>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.footerContent}>
                    <div className={styles.footerBrand}>
                        <span className="text-gradient">Notes</span>SaaS
                        <p>Beautiful documentation made simple</p>
                    </div>
                    <div className={styles.footerLinks}>
                        <div>
                            <h4>Product</h4>
                            <Link to="/docs">Documentation</Link>
                            <Link to="/register">Pricing</Link>
                        </div>
                        <div>
                            <h4>Company</h4>
                            <a href="#">About</a>
                            <a href="#">Blog</a>
                        </div>
                        <div>
                            <h4>Connect</h4>
                            <a href="#"><Github size={16} /> GitHub</a>
                        </div>
                    </div>
                </div>
                <div className={styles.footerBottom}>
                    <p>© 2024 NotesSaaS. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
