import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { router } from '@inertiajs/react';
import { useState } from 'react';

interface StatusModalProps {
    bid: {
        id: number;
        name?: string;
        status?: string;
        institution_status?: string | null;
    } | null;
    onClose: () => void;
}

export default function StatusModal({ bid, onClose }: StatusModalProps) {
    const changeStatus = (status: string) => {
        router.patch(
            `/profile/manager_menu/${bid.id}/status`,
            {
                status: status,
            },
            {
                onSuccess: () => {
                    setStage(0);
                    onClose();
                },
                onError: (errors) => {
                    console.error('Ошибка при изменении статуса:', errors);
                    alert('Ошибка при изменении статуса');
                },
            },
        );
    };

    const changeInstitutionStatus = (status: string) => {
        router.patch(
            `/profile/manager_menu/${bid.id}/institution/status`,
            {
                status: status,
            },
            {
                onSuccess: () => {
                    setStage(0);
                    onClose();
                },
                onError: (errors) => {
                    console.error('Ошибка при изменении статуса института:', errors);
                    alert('Ошибка при изменении статуса');
                },
            },
        );
    };

    const [stage, setStage] = useState(0);

    const handleRejectClick = () => {
        if (stage === 1) {
            changeStatus('rejected');
        } else {
            setStage(1);
        }
    };

    const handleInstitutionRejectClick = () => {
        if (stage === 1) {
            changeInstitutionStatus('REJECTED_BY_UNIVERSITY');
        } else {
            setStage(1);
        }
    };

    const hasInstitutionStatus = bid?.institution_status && bid.institution_status !== '';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-none">
            <div className="mx-4 w-full max-w-md gap-5 rounded-2xl bg-white p-8 not-italic shadow-2xl">
                <h2 className="mb-6 text-2xl font-bold text-gray-900">Изменить статус заявки #{bid.id}</h2>

                {hasInstitutionStatus ? (
                    <div className="flex flex-col space-y-4">
                        <button
                            onClick={() => changeInstitutionStatus('SENT_TO_UNIVERSITY')}
                            className="cursor-pointer rounded-xl border p-2 hover:bg-gray-50"
                        >
                            Ожидаем ответ от университета
                        </button>
                        <button onClick={() => changeInstitutionStatus('OFFER')} className="cursor-pointer rounded-xl border p-2 hover:bg-gray-50">
                            Оформление визы
                        </button>
                        <button
                            onClick={() => changeInstitutionStatus('VISA_ISSUED')}
                            className="cursor-pointer rounded-xl border p-2 hover:bg-gray-50"
                        >
                            Виза оформлена
                        </button>
                        <button
                            onClick={() => changeInstitutionStatus('completed')}
                            className="cursor-pointer rounded-xl border p-2 hover:bg-gray-50"
                        >
                            Прибыл
                        </button>
                        <button
                            onClick={() => changeInstitutionStatus('')}
                            className="flex cursor-pointer flex-row justify-center gap-3 rounded-xl border p-2 hover:bg-gray-50"
                        >
                            <ArrowLeftIcon className="w-5" /> Убрать статус от УЗ
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col space-y-4">
                        <button onClick={() => changeStatus('approved')} className="cursor-pointer rounded-xl border p-2 hover:bg-gray-50">
                            Одобрить
                        </button>
                        <button onClick={() => changeStatus('pending')} className="cursor-pointer rounded-xl border p-2 hover:bg-gray-50">
                            В ожидании
                        </button>
                        <button
                            onClick={handleRejectClick}
                            className={`cursor-pointer rounded-xl border p-2 ${
                                stage === 1 ? 'border-red-500 bg-red-100 text-red-500' : 'hover:bg-gray-50'
                            }`}
                        >
                            {stage === 1 ? 'Вы уверены?' : 'Отклонить'}
                        </button>
                        <button
                            onClick={() => changeInstitutionStatus('SENT_TO_UNIVERSITY')}
                            className="flex cursor-pointer flex-row justify-center gap-3 rounded-xl border p-2 hover:bg-gray-50"
                        >
                            Ожидаем ответ от университета <ArrowRightIcon className="w-5" />
                        </button>
                    </div>
                )}

                <button onClick={onClose} className="mt-4 w-full cursor-pointer rounded-xl border p-2 text-gray-500 hover:bg-gray-50">
                    Закрыть
                </button>
            </div>
        </div>
    );
}
