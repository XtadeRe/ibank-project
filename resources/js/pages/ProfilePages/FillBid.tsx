import DefaultLayout from '@/layouts/DefaultLayouts';
import { PageProps } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import '../../../css/FillBid.css';

interface User {
    id: number;
    avatar: string;
    login: string;
    email: string;
    phone: string;
    password: string;
    created_at?: string;
    updated_at?: string;
}

interface Institution {
    id: number;
    name: string;
    description: string;
    country: string;
    city: string;
    type: string;
    image_url: string;
    rating: number;
    featured: number;
    programs: string;
    price_from: number;
    price_to: number;
    currency: string;
    views: number;
}

interface FileInfo {
    name: string;
    path: string;
    url: string;
    size: number;
    mime: string;
}

interface Bid {
    id: number;
    user_id: number;
    institution_id: number;
    name: string;
    phone: string;
    tg_username: string;
    buy_method: string;
    files: FileInfo[] | null;
    created_at: string;
    status?: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
    institution?: Institution;
}

interface Props extends PageProps {
    user: User;
    bid: Bid;
}

interface UploadedFile extends File {
    id: string;
    preview?: string;
}

const FillBid = ({ bid: initialBid }: Props) => {
    const [bid, setBid] = useState<Bid>(initialBid);
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        setBid(initialBid);
    }, [initialBid]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFiles = acceptedFiles.map((file) => {
            const uploadedFile = file as UploadedFile;
            uploadedFile.id = `${file.name}-${Date.now()}-${Math.random()}`;

            if (file.type.startsWith('image/')) {
                uploadedFile.preview = URL.createObjectURL(file);
            }

            return uploadedFile;
        });

        setFiles((prev) => [...prev, ...newFiles]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: true,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        },
    });

    const removeFile = (id: string) => {
        setFiles((prev) => {
            const fileToRemove = prev.find((f) => f.id === id);
            if (fileToRemove?.preview) {
                URL.revokeObjectURL(fileToRemove.preview);
            }
            return prev.filter((f) => f.id !== id);
        });
    };

    const downloadFile = (bidId: number, index: number) => {
        const url = `/bids/${bidId}/download/${index + 1}`;
        window.location.href = url;
    };

    const deleteServerFile = (filePath: string) => {
        setDeleting(filePath);

        router.delete(`/bids/${bid.id}/delete-file`, {
            data: { file_path: filePath },
            preserveScroll: true,
            preserveState: true,
            onSuccess: (page) => {
                if (page.props.bid) {
                    setBid(page.props.bid as Bid);
                }
                router.reload({ only: ['bid'] });
            },
            onError: (errors) => {
                console.error('Ошибка при удалении:', errors);
            },
            onFinish: () => {
                setDeleting(null);
            },
        });
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (files.length === 0) {
            return;
        }

        setUploading(true);

        const formData = new FormData();
        files.forEach((file) => {
            formData.append('files[]', file);
        });

        router.post(`/bids/${bid.id}/upload-files`, formData, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: (page) => {
                if (page.props.bid) {
                    setBid(page.props.bid as Bid);
                }
                files.forEach((file) => {
                    if (file.preview) {
                        URL.revokeObjectURL(file.preview);
                    }
                });
                setFiles([]);
            },
            onError: (errors) => {
                console.error('Ошибка загрузки:', errors);
            },
            onFinish: () => {
                setUploading(false);
            },
        });
    };

    return (
        <DefaultLayout>
            <div className="FillBid-container">
                <div className="FillBid-content mt-20">
                    <h1 className="mb-6 text-2xl font-bold">Добавление документов</h1>

                    <form onSubmit={handleSubmit} className="bid-info-form mx-auto max-w-2xl">
                        <div className="user-documents mb-6">
                            <label className="mb-2 block text-sm font-bold text-gray-700">Приложите сюда свои документы</label>

                            <div
                                {...getRootProps()}
                                className={`dropzone cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                                    isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                                }`}
                            >
                                <input {...getInputProps()} />
                                {isDragActive ? (
                                    <p className="text-blue-500">Отпустите файлы для загрузки...</p>
                                ) : (
                                    <div>
                                        <p className="mb-2 text-gray-600">Перетащите файлы сюда или кликните для выбора</p>
                                        <p className="text-sm text-gray-500">Поддерживаются: изображения, PDF, DOC, DOCX (макс. 30MB)</p>
                                    </div>
                                )}
                            </div>

                            {files.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="mb-2 font-medium">Новые файлы для загрузки ({files.length}):</h4>
                                    <div className="space-y-2">
                                        {files.map((file, index) => (
                                            <div key={file.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-2">
                                                <div className="flex items-center space-x-3">
                                                    {file.preview ? (
                                                        <img src={file.preview} alt={file.name} className="h-10 w-10 rounded object-cover" />
                                                    ) : (
                                                        <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-200">
                                                            <span className="text-lg">{index + 1}</span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">
                                                            {file.name.length > 30 ? file.name.substring(0, 27) + '...' : file.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(file.id)}
                                                    className="p-1 text-red-500 hover:text-red-700"
                                                    title="Удалить файл"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {bid.institution && (
                            <div className="mb-6 w-full rounded-lg bg-gray-100 p-4">
                                <h3 className="mb-2 text-lg font-bold">Информация об учебном заведении</h3>
                                <p className="text-gray-700">
                                    <span className="font-medium">Название:</span> {bid.institution.name}
                                </p>
                                <p className="text-gray-700">
                                    <span className="font-medium">Город:</span> {bid.institution.city}, {bid.institution.country}
                                </p>
                                <p className="text-gray-700">
                                    <span className="font-medium">Стоимость от:</span> {bid.institution.price_from} {bid.institution.currency}
                                </p>
                            </div>
                        )}

                        <div className="mt-6 flex w-full gap-4">
                            <button
                                type="submit"
                                disabled={uploading}
                                className={`flex-1 rounded-lg px-4 py-3 font-bold transition duration-300 ${
                                    uploading ? 'cursor-not-allowed bg-gray-400' : 'bg-blue-500 text-white hover:bg-blue-700'
                                }`}
                            >
                                {uploading ? 'Загрузка...' : 'Отправить документы'}
                            </button>
                            <button
                                type="button"
                                className="flex-1 rounded-lg bg-gray-300 px-4 py-3 font-bold text-gray-800 transition duration-300 hover:bg-gray-400"
                                onClick={() => window.history.back()}
                                disabled={uploading}
                            >
                                Отмена
                            </button>
                        </div>
                    </form>

                    {bid.files && Array.isArray(bid.files) && bid.files.length > 0 && (
                        <div className="mt-8">
                            <h3 className="mb-4 text-lg font-bold">Загруженные документы:</h3>
                            <p className="text-green-500">Мы получили ваши файлы, пожалуйста дождитесь проверки!</p>
                            <div className="mt-5 space-y-2">
                                {bid.files.map((file: FileInfo, index: number) => (
                                    <div key={index} className="flex items-center justify-between rounded-lg border border-gray-300 bg-gray-50 p-3">
                                        <div className="flex items-center space-x-3">
                                            <span className="rounded-3xl border-2 border-blue-500 pr-2.5 pl-2.5 text-lg">{index + 1}</span>
                                            <div>
                                                <p className="text-sm font-medium">{file.name}</p>
                                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                className="cursor-pointer rounded border border-blue-500 px-3 py-1 text-sm text-blue-500 transition hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                onClick={() => downloadFile(bid.id, index)}
                                            >
                                                Скачать
                                            </button>
                                            <button
                                                onClick={() => deleteServerFile(file.path)}
                                                disabled={deleting === file.path}
                                                className="cursor-pointer rounded border border-red-500 px-3 py-1 text-sm text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {deleting === file.path ? 'Удаление...' : 'Удалить'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DefaultLayout>
    );
};

export default FillBid;
