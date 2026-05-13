import DefaultLayout from '@/layouts/DefaultLayouts';
import {
    BuildingOfficeIcon,
    CalendarIcon,
    CheckCircleIcon,
    ClockIcon,
    FolderIcon,
    MapPinIcon,
    PencilIcon,
    StarIcon,
    TrashIcon,
    UserIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';
import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import '../../../css/MyBids.css';

import StatusBar from '@/components/StatusBar';

interface Bid {
    id: number;
    user_id: number;
    institution_id: number;
    name: string;
    phone: string;
    tg_username: string;
    buy_method: string;
    created_at: string;
    status?: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
    institution_status: 'SENT_TO_UNIVERSITY' | 'OFFER' | 'VISA_ISSUED' | 'REJECTED_BY_UNIVERSITY';
    instruction: boolean;
    institution?: Institution;
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

type Props = {
    bids: Array<Bid>;
};

const MyBids = ({ bids }: Props) => {
    const [processing, setProcessing] = useState<number | null>(null);
    const { auth } = usePage().props;
    const user = auth.user as User | null;

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusStyles = (status: string = 'pending') => {
        switch (status) {
            case 'approved':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'rejected':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'completed':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'cancelled':
                return 'bg-gray-100 text-gray-800 border-gray-300';
            case 'accepted':
                return 'bg-green-100 text-green-800';
            case 'denied':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        }
    };

    const getStatusProgress = (status: string = 'SENT_TO_UNIVERSITY') => {
        switch (status) {
            case 'SENT_TO_UNIVERSITY':
                return 25;
            case 'OFFER':
                return 50;
            case 'VISA_ISSUED':
                return 100;
            case 'REJECTED_BY_UNIVERSITY':
                return 0;
            default:
                return 25;
        }
    };

    const getStatusText = (status: string = 'pending') => {
        switch (status) {
            case 'pending':
                return 'На рассмотрении';
            case 'approved':
                return 'Одобрена';
            case 'rejected':
                return 'Отклонена';
            case 'completed':
                return 'Завершена';
            case 'cancelled':
                return 'Отменена';
            case 'accepted':
                return 'Документы в порядке';
            case 'denied':
                return 'Документы не прошли';
            default:
                return 'На рассмотрении';
        }
    };

    const getStatusIcon = (status: string = 'pending') => {
        const iconClass = 'w-4 h-4 mr-1';
        switch (status) {
            case 'approved':
                return <CheckCircleIcon className={`${iconClass} text-green-600`} />;
            case 'rejected':
                return <XCircleIcon className={`${iconClass} text-red-600`} />;
            case 'completed':
                return <CheckCircleIcon className={`${iconClass} text-blue-600`} />;
            case 'cancelled':
                return <XCircleIcon className={`${iconClass} text-gray-600`} />;
            case 'accepted':
                return <CheckCircleIcon className={`${iconClass} text-green-600`} />;
            case 'denied':
                return <XCircleIcon className={`${iconClass} text-red-600`} />;
            default:
                return <ClockIcon className={`${iconClass} text-yellow-600`} />;
        }
    };

    const handleCancel = (bidId: number) => {
        setProcessing(bidId);

        router.put(
            `/profile/bids/${bidId}`,
            {
                status: 'cancelled',
            },
            {
                onSuccess() {
                    setProcessing(null);
                },
                onError: (errors) => {
                    setProcessing(null);
                    alert('Ошибка при отмене заявки');
                    console.error(errors);
                },
                preserveScroll: true,
            },
        );
    };

    const confirmArrival = (bidId: number) => {
        router.put(`/profile/bids/${bidId}`, {
            status: 'completed',
        });
    };

    useEffect(() => {
        if (!user) {
            router.get('/login');
        }
    });

    if (!user) {
        return (
            <DefaultLayout>
                <div className="flex min-h-screen items-center justify-center">
                    <div className="text-center">
                        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                        <p className="mt-4 text-gray-600">Перенаправление на страницу входа...</p>
                    </div>
                </div>
            </DefaultLayout>
        );
    }

    return (
        <DefaultLayout>
            <div className="profile-container">
                <div className="profile-content">
                    <div className="mb-8">
                        <h2 className="user-bids-title">Ваши заявки</h2>
                        <p className="mt-2 text-sm text-gray-600">Здесь вы можете отслеживать статус своих заявок и управлять ими</p>
                    </div>

                    {bids.length === 0 ? (
                        <div className="py-12 text-center">
                            <div className="mb-4 text-gray-400">
                                <FolderIcon className="mx-auto h-16 w-16" />
                            </div>
                            <h3 className="mb-2 text-xl font-semibold text-gray-700">Заявок пока нет</h3>
                            <p className="text-gray-500">Создайте свою первую заявку на обучение</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {bids.map((bid) => (
                                <div key={bid.id} className="bid-card">
                                    <div className="bid-card-image-container">
                                        <img
                                            src={bid.institution?.image_url || '/default-institution.jpg'}
                                            alt={bid.institution?.name}
                                            className="bid-card-image"
                                        />
                                        <div className="bid-card-rating">
                                            <span className="flex items-center">
                                                <StarIcon className="mr-1 h-4 w-4 text-yellow-400" />
                                                {bid.institution?.rating || 'Н/Д'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="bid-card-content">
                                        <div className="mb-4 flex items-start justify-between">
                                            <div>
                                                <h3 className="bid-card-institution-name">{bid.institution?.name || 'Учебное заведение'}</h3>
                                                <div className="mt-1 flex items-center text-sm text-gray-600">
                                                    <MapPinIcon className="mr-1 h-4 w-4" />
                                                    <span>
                                                        {bid.institution?.city}, {bid.institution?.country}
                                                    </span>
                                                </div>
                                            </div>
                                            <span
                                                className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusStyles(bid.status)} flex items-center`}
                                            >
                                                {getStatusIcon(bid.status)}
                                                {getStatusText(bid.status)}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                            <div className="bid-card-section">
                                                <h4 className="bid-card-section-title">
                                                    <BuildingOfficeIcon className="mr-2 inline h-4 w-4" />
                                                    Информация о месте
                                                </h4>
                                                <div className="space-y-2">
                                                    <div className="bid-card-info-item">
                                                        <span className="bid-card-info-label">Тип:</span>
                                                        <span className="bid-card-info-value">{bid.institution?.type || 'Не указано'}</span>
                                                    </div>
                                                    <div className="bid-card-info-item">
                                                        <span className="bid-card-info-label">Программы:</span>
                                                        <span className="bid-card-info-value truncate-text text-right">
                                                            {bid.institution?.programs
                                                                ? typeof bid.institution.programs === 'string'
                                                                    ? JSON.parse(bid.institution.programs).join(', ')
                                                                    : bid.institution.programs.join(', ')
                                                                : 'Не указано'}
                                                        </span>
                                                    </div>
                                                    <div className="bid-card-info-item">
                                                        <span className="bid-card-info-label">Стоимость:</span>
                                                        <span className="bid-card-info-value">
                                                            {bid.institution?.price_from
                                                                ? `${bid.institution.price_from} - ${bid.institution.price_to} ${bid.institution.currency}`
                                                                : 'По запросу'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bid-card-section">
                                                <h4 className="bid-card-section-title">
                                                    <UserIcon className="mr-2 inline h-4 w-4" />
                                                    Ваши данные
                                                </h4>
                                                <div className="space-y-2">
                                                    <div className="bid-card-info-item">
                                                        <span className="bid-card-info-label">Имя:</span>
                                                        <span className="bid-card-info-value">{bid.name}</span>
                                                    </div>
                                                    <div className="bid-card-info-item">
                                                        <span className="bid-card-info-label">Телефон:</span>
                                                        <span className="bid-card-info-value">{bid.phone}</span>
                                                    </div>
                                                    <div className="bid-card-info-item">
                                                        <span className="bid-card-info-label">Telegram:</span>
                                                        <span className="bid-card-info-value">{bid.tg_username}</span>
                                                    </div>
                                                    <div className="bid-card-info-item">
                                                        <span className="bid-card-info-label">Метод оплаты:</span>
                                                        <span className="bid-card-info-value">{bid.buy_method}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {bid.status !== 'completed' ? (
                                            <>
                                                {bid.institution_status ? (
                                                    <div className="mt-6 border-t border-gray-100 pt-6">
                                                        <div className="bid-card-status-section">
                                                            <span className="bid-card-status-label">Статус вашего поступления</span>
                                                            <StatusBar value={getStatusProgress(bid.institution_status)} max={100} dotCount={5} />
                                                            <p className="bid-card-status-text">
                                                                {bid.institution_status === 'SENT_TO_UNIVERSITY'
                                                                    ? 'Ожидаем ответ от университета'
                                                                    : bid.institution_status === 'OFFER'
                                                                      ? 'Вы приняты в университет! Начните оформление визы!'
                                                                      : bid.institution_status === 'VISA_ISSUED'
                                                                        ? 'Виза оформлена! Приятного полёта'
                                                                        : 'Ожидаем ответ от университета'}
                                                            </p>
                                                        </div>
                                                        {bid.instruction == true ? (
                                                            <div className="bid-card-status-section">
                                                                <span className="bid-card-status-label mt-5">
                                                                    Воспользуйтесь следующей инструкцией
                                                                </span>
                                                                <div className="mt-3 w-[100%]">
                                                                    <a
                                                                        href="/instruction.pdf"
                                                                        target="_blank"
                                                                        className="rounded-xl border-2 border-blue-500 bg-blue-100 px-3 py-2 text-blue-600 duration-300 hover:bg-blue-500 hover:text-blue-50"
                                                                    >
                                                                        Скачать инструкцию по перелёту
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                ) : null}
                                            </>
                                        ) : null}

                                        <div className="mt-6 border-t border-gray-100 pt-6">
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm text-gray-500">
                                                    <span className="flex items-center">
                                                        <CalendarIcon className="mr-1 h-4 w-4" />
                                                        Дата заявки: {formatDate(bid.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {bid.status !== 'cancelled' && bid.status !== 'completed' && (
                                        <div className="bid-card-actions">
                                            {bid.status === 'pending' ? (
                                                <div className="bid-card-action-primary cursor-not-allowed opacity-50">
                                                    <PencilIcon className="mr-2 h-4 w-4" />
                                                    Ожидайте одобрения
                                                </div>
                                            ) : bid.status == 'approved' ? (
                                                <Link href={`/profile/bids/fillBid/${bid.id}`} className="bid-card-action-primary">
                                                    <PencilIcon className="mr-2 h-4 w-4" />
                                                    Заполнить данные
                                                </Link>
                                            ) : (
                                                <></>
                                            )}
                                            {bid?.status && bid?.institution_status !== 'completed' && (
                                                <button className="confirm-arrival" onClick={() => confirmArrival(bid.id)}>
                                                    Подтвердить прибытие
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleCancel(bid.id)}
                                                disabled={processing === bid.id}
                                                className="bid-card-action-secondary"
                                            >
                                                {processing === bid.id ? (
                                                    <>
                                                        <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                            <circle
                                                                className="opacity-25"
                                                                cx="12"
                                                                cy="12"
                                                                r="10"
                                                                stroke="currentColor"
                                                                strokeWidth="4"
                                                            />
                                                            <path
                                                                className="opacity-75"
                                                                fill="currentColor"
                                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                            />
                                                        </svg>
                                                        Отмена...
                                                    </>
                                                ) : bid.status == 'rejected' ? (
                                                    <>
                                                        <TrashIcon className="mr-2 h-4 w-4" />
                                                        Удалить
                                                    </>
                                                ) : bid.status !== 'completed' ? (
                                                    <>
                                                        <TrashIcon className="mr-2 h-4 w-4" />
                                                        Отменить заявку
                                                    </>
                                                ) : null}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DefaultLayout>
    );
};

export default MyBids;
