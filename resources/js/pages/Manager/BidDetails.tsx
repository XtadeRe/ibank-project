import DefaultLayout from '@/layouts/DefaultLayouts';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { router } from '@inertiajs/react';
import { useNavigate } from 'react-router-dom';

interface FileInfo {
    id: number | string;
    name: string;
    url: string;
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

interface Institution {
    name: string;
}

interface BidDetailsProps {
    bid: Bid;
    institution: Institution;
}

const BidDetails = ({ bid, institution }: BidDetailsProps) => {
    const navigate = useNavigate();

    const downloadFile = (bidId: number, fileIndex: number) => {
        const url = `/profile/manager_menu/${bidId}/download/${fileIndex}`;
        window.open(url, '_blank');
    };

    const changeStatus = (bidId: number, status: string) => {
        router.patch(`/profile/manager_menu/${bidId}/status`, {
            status: status,
        });
    };

    return (
        <DefaultLayout>
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col gap-5 rounded-lg border-2 border-gray-300 p-10">
                    <button className="m-0 flex cursor-pointer gap-2 p-0 text-blue-500 hover:underline" onClick={() => navigate(-1)}>
                        <ArrowLeftIcon className="w-5" />
                        Вернуться назад
                    </button>
                    <div>
                        <p>
                            <strong>Заявка:</strong> {bid.name}
                        </p>
                        <p>
                            <strong>Учреждение:</strong> {institution.name}
                        </p>
                        <p>
                            <strong>Телефон:</strong> {bid.phone}
                        </p>
                        <p>
                            <strong>Метод оплаты:</strong> {bid.buy_method}
                        </p>
                        <p>
                            <strong>Телеграм:</strong>{' '}
                            <a href={`https://t.me/${bid.tg_username.slice(1)}`} target="_blank">
                                {bid.tg_username}
                            </a>
                        </p>
                    </div>
                    <div className="flex flex-col gap-1">
                        <strong>Прикреплённые файлы</strong>
                        <i className="text-gray-400 underline">нажмите чтобы скачать</i>
                        {bid.files && bid.files.length > 0 ? (
                            <ul className="flex flex-col gap-2">
                                {bid.files.map((file: FileInfo, index: number) => (
                                    <li
                                        key={file.id || `${file.name}-${index}`}
                                        onClick={() => downloadFile(bid.id, index)}
                                        className="cursor-pointer rounded-xl border-2 border-blue-500 p-2 hover:bg-blue-50"
                                    >
                                        <span className="text-blue-600">📄 {file.name || `Файл ${index + 1}`}</span>
                                    </li>
                                ))}
                                <hr className="border-gray-500" />
                                <div className="flex flex-row gap-5">
                                    <button
                                        onClick={() => {
                                            changeStatus(bid.id, 'accepted');
                                        }}
                                        className="cursor-pointer rounded-xl border-2 border-green-500 p-2 text-green-600 hover:bg-green-100"
                                    >
                                        Принять документы
                                    </button>
                                    <button
                                        onClick={() => {
                                            changeStatus(bid.id, 'denied');
                                        }}
                                        className="cursor-pointer rounded-xl border-2 border-red-500 p-2 text-red-500 hover:bg-red-100"
                                    >
                                        Вернуть на доработку
                                    </button>
                                </div>
                            </ul>
                        ) : (
                            <p className="text-yellow-600">Файлы не прикреплены</p>
                        )}
                    </div>
                </div>
            </div>
        </DefaultLayout>
    );
};

export default BidDetails;
