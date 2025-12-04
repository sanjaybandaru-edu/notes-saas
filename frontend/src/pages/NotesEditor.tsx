import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Save, Eye, EyeOff, ArrowLeft, Upload, Loader2, Globe, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { notesApi, topicsApi, filesApi } from '../api/client';
import styles from './NotesEditor.module.css';

export default function NotesEditor() {
    const { noteId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isNew = noteId === 'new' || !noteId;

    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [content, setContent] = useState('');
    const [topicId, setTopicId] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [isDraft, setIsDraft] = useState(true);
    const [tags, setTags] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    const { data: topics } = useQuery({
        queryKey: ['topics', 'flat'],
        queryFn: async () => {
            const res = await topicsApi.list({ flat: true });
            return res.data.topics;
        },
    });

    const { data: note, isLoading } = useQuery({
        queryKey: ['note', noteId],
        queryFn: async () => {
            const res = await notesApi.get(noteId!);
            return res.data.note;
        },
        enabled: !isNew,
    });

    useEffect(() => {
        if (note) {
            setTitle(note.title);
            setSlug(note.slug);
            setContent(note.content);
            setTopicId(note.topicId);
            setIsPublic(note.isPublic);
            setIsDraft(note.isDraft);
            setTags(note.tags?.map((t: any) => t.name).join(', ') || '');
        }
    }, [note]);

    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            if (isNew) {
                return notesApi.create(data);
            } else {
                return notesApi.update(noteId!, data);
            }
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['notes'] });
            toast.success(isNew ? 'Note created!' : 'Note saved!');
            if (isNew) {
                navigate(`/editor/${res.data.note.id}`);
            }
        },
        onError: (e: any) => {
            toast.error(e.response?.data?.error || 'Failed to save');
        },
    });

    const handleSave = () => {
        if (!title || !topicId) {
            toast.error('Title and topic are required');
            return;
        }

        const noteSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);

        saveMutation.mutate({
            title,
            slug: noteSlug,
            content,
            topicId,
            isPublic,
            isDraft,
            tags: tagList,
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const res = await filesApi.upload(file, isNew ? undefined : noteId);
            const url = res.data.file.url;

            // Insert markdown image/link
            const isImage = file.type.startsWith('image/');
            const markdown = isImage ? `![${file.name}](${url})` : `[${file.name}](${url})`;
            setContent(prev => prev + '\n' + markdown + '\n');
            toast.success('File uploaded!');
        } catch {
            toast.error('Failed to upload file');
        }
    };

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <Loader2 size={32} className={styles.spinner} />
            </div>
        );
    }

    return (
        <div className={styles.editor}>
            <header className={styles.header}>
                <button onClick={() => navigate(-1)} className="btn btn-ghost">
                    <ArrowLeft size={18} /> Back
                </button>
                <div className={styles.actions}>
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={`btn btn-ghost ${showPreview ? styles.active : ''}`}
                    >
                        {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
                        {showPreview ? 'Edit' : 'Preview'}
                    </button>
                    <button onClick={handleSave} className="btn btn-primary" disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? <Loader2 size={18} className={styles.spinner} /> : <Save size={18} />}
                        Save
                    </button>
                </div>
            </header>

            <div className={styles.meta}>
                <input
                    type="text"
                    placeholder="Note title"
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value);
                        if (isNew) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }}
                    className={styles.titleInput}
                />

                <div className={styles.metaRow}>
                    <select
                        value={topicId}
                        onChange={(e) => setTopicId(e.target.value)}
                        className="input"
                    >
                        <option value="">Select topic...</option>
                        {topics?.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>

                    <input
                        type="text"
                        placeholder="slug"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="input"
                        style={{ maxWidth: '200px' }}
                    />

                    <input
                        type="text"
                        placeholder="Tags (comma separated)"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        className="input"
                    />
                </div>

                <div className={styles.toggles}>
                    <label className={styles.toggle}>
                        <input
                            type="checkbox"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                        />
                        <span className={styles.toggleLabel}>
                            {isPublic ? <Globe size={14} /> : <Lock size={14} />}
                            {isPublic ? 'Public' : 'Private'}
                        </span>
                    </label>
                    <label className={styles.toggle}>
                        <input
                            type="checkbox"
                            checked={!isDraft}
                            onChange={(e) => setIsDraft(!e.target.checked)}
                        />
                        <span className={styles.toggleLabel}>
                            {isDraft ? 'Draft' : 'Published'}
                        </span>
                    </label>
                    <label className={styles.uploadBtn}>
                        <Upload size={14} /> Upload File
                        <input type="file" onChange={handleFileUpload} hidden />
                    </label>
                </div>
            </div>

            <div className={styles.content}>
                {showPreview ? (
                    <div className={`markdown-content ${styles.preview}`}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code({ className, children }) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const inline = !match;
                                    return !inline ? (
                                        <SyntaxHighlighter style={oneDark as any} language={match[1]} PreTag="div">
                                            {String(children).replace(/\n$/, '')}
                                        </SyntaxHighlighter>
                                    ) : (
                                        <code className={className}>{children}</code>
                                    );
                                },
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write your note in Markdown..."
                        className={styles.textarea}
                    />
                )}
            </div>
        </div>
    );
}
