import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/auth';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import TopicReader from './pages/TopicReader';
import NotesViewer from './pages/NotesViewer';
import NotesEditor from './pages/NotesEditor';
import TopicPage from './pages/TopicPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    const { checkAuth } = useAuthStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    return (
        <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Documentation viewer (public) */}
            <Route path="/docs" element={<Layout />}>
                <Route index element={<NotesViewer />} />
                <Route path=":topicSlug" element={<TopicPage />} />
                <Route path=":topicSlug/:noteSlug" element={<NotesViewer />} />
            </Route>

            {/* Reader - Public access to content */}
            <Route path="/read/:subjectId/:chapterId/:topicId" element={<TopicReader />} />

            {/* Protected routes - User Dashboard */}
            <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Layout showSidebar />}>
                    <Route index element={<Dashboard />} />
                    <Route path="topics" element={<Dashboard />} />
                    <Route path="notes" element={<Dashboard />} />
                    <Route path="files" element={<Dashboard />} />
                </Route>
                <Route path="/editor" element={<Layout showSidebar />}>
                    <Route path="new" element={<NotesEditor />} />
                    <Route path=":noteId" element={<NotesEditor />} />
                </Route>
            </Route>

            {/* Admin Routes */}
            <Route element={<ProtectedRoute />}>
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="content" element={<AdminDashboard />} />
                    <Route path="users" element={<AdminDashboard />} />
                    <Route path="analytics" element={<AdminDashboard />} />
                    <Route path="api" element={<AdminDashboard />} />
                    <Route path="audit" element={<AdminDashboard />} />
                    <Route path="settings" element={<AdminDashboard />} />
                </Route>
            </Route>
        </Routes>
    );
}

export default App;
