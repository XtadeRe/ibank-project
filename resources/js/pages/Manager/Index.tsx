import StatusModal from '@/components/modalChangeStatus';
import DefaultLayout from '@/layouts/DefaultLayouts';
import { CalendarIcon, CurrencyDollarIcon, DocumentTextIcon, PhoneIcon, UserIcon } from '@heroicons/react/24/outline';
import { PageProps } from '@inertiajs/core';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';

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
    institution_status: 'SENT_TO_UNIVERSITY' | 'OFFER' | 'VISA_ISSUED' | 'REJECTED_BY_UNIVERSITY';
    instruction?: boolean;
    institution?: Institution;
}

interface Props extends PageProps {
    bids: Bid[];
}

const deleteBid = async (bidId: number) => {
    router.delete(`/profile/manager_menu/${bidId}/delete`);
};

const Manager = ({ bids }: Props) => {
    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'approved':
                return 'bg-green-100 text-green-800';
            case 'rejected':
                return 'bg-red-100 text-red-800';
            case 'completed':
                return 'bg-blue-100 text-blue-800';
            case 'cancelled':
                return 'bg-gray-100 text-gray-800';
            case 'accepted':
                return 'bg-green-100 text-green-800';
            case 'denied':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status?: string) => {
        switch (status) {
            case 'pending':
                return 'В ожидании';
            case 'approved':
                return 'Одобрено';
            case 'rejected':
                return 'Отклонено';
            case 'completed':
                return 'Завершено';
            case 'cancelled':
                return 'Отменено';
            case 'accepted':
                return 'Документы в порядке';
            case 'denied':
                return 'Документы не прошли';
            default:
                return 'Не указан';
        }
    };

    const getInstitutionStatus = (institution_status?: string) => {
        switch (institution_status) {
            case 'SENT_TO_UNIVERSITY':
                return 'Ожидаем ответ от университета';
            case 'OFFER':
                return 'Оформление визы!';
            case 'VISA_ISSUED':
                return 'Виза оформлена';
            case 'REJECTED_BY_UNIVERSITY':
                return 'Отклонена университетом';
            case 'completed':
                return 'Завершена';
            default:
                return 'Ожидаем ответ от университета';
        }
    };

    const [modal, setModal] = useState(false);
    const [selectedBid, setSelectedBid] = useState<Bid | null>(null);

    const openModal = (bid: Bid) => {
        setSelectedBid(bid);
        setModal(true);
    };

    const closeModal = () => {
        setModal(false);
        setSelectedBid(null);
    };

    return (
        <>
            {modal && <StatusModal bid={selectedBid} onClose={closeModal} />}
            <DefaultLayout>
                <div className="profile-container">
                    <div className="profile-content">
                        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div className="stat-item">
                                <div className="stat-label">Всего заявок</div>
                                <div className="stat-value">{bids.length}</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-label">В ожидании</div>
                                <div className="stat-value text-yellow-600">{bids.filter((b) => b.status === 'pending').length}</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-label">Одобрено</div>
                                <div className="stat-value text-green-600">{bids.filter((b) => b.status === 'approved').length}</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-label">Завершено</div>
                                <div className="stat-value text-blue-600">{bids.filter((b) => b.status === 'completed').length}</div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {bids.length > 0 ? (
                                bids.map((bid) => (
                                    <div key={bid.id} className="profile-card transition-shadow duration-300 hover:shadow-2xl">
                                        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
                                            <div className="flex-1">
                                                <div className="mb-4 flex items-start justify-between">
                                                    <div>
                                                        <h2 className="mb-2 text-2xl font-bold text-gray-900">Заявка #{bid.id}</h2>
                                                        {bid.institution_status ? (
                                                            <span
                                                                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(bid.status)}`}
                                                            >
                                                                Статус от УЗ: {getInstitutionStatus(bid.institution_status)}
                                                            </span>
                                                        ) : (
                                                            <span
                                                                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(bid.status)}`}
                                                            >
                                                                Статус на сайте: {getStatusText(bid.status)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-3">
                                                            <UserIcon className="h-5 w-5 text-gray-400" />
                                                            <div>
                                                                <p className="text-sm text-gray-500">Имя клиента</p>
                                                                <p className="text-base font-semibold text-gray-900">{bid.name}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            <PhoneIcon className="h-5 w-5 text-gray-400" />
                                                            <div>
                                                                <p className="text-sm text-gray-500">Телефон</p>
                                                                <p className="text-base font-semibold text-gray-900">{bid.phone}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-3">
                                                            <svg
                                                                className="h-5 w-5 text-gray-400"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                                                />
                                                            </svg>
                                                            <div>
                                                                <p className="text-sm text-gray-500">Telegram</p>
                                                                <p className="text-base font-semibold text-gray-900">{bid.tg_username}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                                                            <div>
                                                                <p className="text-sm text-gray-500">Метод оплаты</p>
                                                                <p className="text-base font-semibold text-gray-900">{bid.buy_method}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {bid.institution && (
                                                    <div className="mt-4 border-t border-gray-100 pt-4">
                                                        <p className="mb-1 text-sm text-gray-500">Учебное заведение</p>
                                                        <p className="text-base font-semibold text-gray-900">{bid.institution.name}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col items-end lg:w-64">
                                                <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
                                                    <CalendarIcon className="h-4 w-4" />
                                                    <span>
                                                        {new Date(bid.created_at).toLocaleDateString('ru-RU', {
                                                            day: 'numeric',
                                                            month: 'long',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </span>
                                                </div>
                                                {bid.status == 'rejected' || bid.status == 'completed' ? (
                                                    <div className="flex w-full flex-col gap-2">
                                                        <button
                                                            onClick={() => deleteBid(bid.id)}
                                                            className="action-delete-button action-delete-secondary w-full cursor-pointer text-center"
                                                        >
                                                            Удалить
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex w-full flex-col gap-2">
                                                        <Link
                                                            href={`/profile/manager_menu/${bid.id}/details`}
                                                            className="action-button action-primary w-full text-center"
                                                        >
                                                            Просмотреть детали
                                                        </Link>
                                                        {bid.institution_status ? (
                                                            <button
                                                                onClick={() => openModal(bid)}
                                                                className="action-button action-secondary w-full text-center"
                                                            >
                                                                Статус от УЗ
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => openModal(bid)}
                                                                className="action-button action-secondary w-full text-center"
                                                            >
                                                                Изменить статус
                                                            </button>
                                                        )}
                                                        {bid.institution_status == 'VISA_ISSUED' ? (
                                                            <>
                                                                {bid.instruction == true ? (
                                                                    <p className="action-button instructuon_btn-lock w-full text-center">
                                                                        Инструкция выслана
                                                                    </p>
                                                                ) : (
                                                                    <Link
                                                                        href={`/profile/manager_menu/${bid.id}/instruction`}
                                                                        className="action-button instructuon_btn w-full text-center"
                                                                    >
                                                                        Выслать инструкцию
                                                                    </Link>
                                                                )}
                                                            </>
                                                        ) : null}
                                                    </div>
                                                )}

                                                {bid.files && bid.files.length > 0 && (
                                                    <div className="mt-4 w-full">
                                                        <p className="mb-2 flex items-center gap-1 text-sm text-gray-500">
                                                            <DocumentTextIcon className="h-4 w-4" />
                                                            Файлы: {bid.files.length}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="profile-card py-16 text-center">
                                    <div className="avatar-placeholder mx-auto mb-4">
                                        <DocumentTextIcon className="h-12 w-12 text-gray-400" />
                                    </div>
                                    <h3 className="mb-2 text-xl font-semibold text-gray-900">Нет заявок</h3>
                                    <p className="text-gray-600">На данный момент заявки отсутствуют</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DefaultLayout>
        </>
    );
};

export default Manager;
