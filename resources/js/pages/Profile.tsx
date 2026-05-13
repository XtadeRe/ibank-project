import DefaultLayout from '@/layouts/DefaultLayouts';
import { ArrowRightIcon, CalendarIcon, EnvelopeIcon, PhoneIcon, ShieldCheckIcon, UserIcon } from '@heroicons/react/24/outline';
import { PageProps } from '@inertiajs/core';
import { Link, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { IMaskInput } from 'react-imask';
import '../../css/Profile.css';
interface User {
    id: number;
    avatar: string;
    login: string;
    email: string;
    role: string;
    phone: string;
    password: string;
    created_at?: string;
    updated_at?: string;
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

interface Phone {
    phone: string;
}

interface Props extends PageProps {
    user: User;
    phone: Phone;
    bids: Bid[];
}

const Profile = ({ user, bids }: Props) => {
    const [openInput, setOpenInput] = useState(false);
    const [phoneValue, setPhoneValue] = useState('');
    const addNumber = () => {
        setOpenInput(!openInput);
    };

    const phoneSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        router.patch(`/profile/phone`, {
            phone: phoneValue,
        });
    };

    return (
        <DefaultLayout>
            <div className="profile-container">
                <div className="profile-content">
                    <div className="profile-header mb-8">
                        <h1 className="profile-title">Личный кабинет</h1>
                        <p className="profile-subtitle">Управление вашими данными и настройками</p>
                    </div>

                    <div className="profile-grid">
                        <div className="lg:col-span-1">
                            <div className="profile-card">
                                <div className="avatar-section">
                                    {user.avatar ? (
                                        <img src={user.avatar} alt={user.login} className="avatar-image" />
                                    ) : (
                                        <div className="avatar-placeholder">
                                            <UserIcon className="h-12 w-12 text-gray-400" />
                                        </div>
                                    )}
                                    <div className="avatar-info">
                                        <h2 className="username">{user.login}</h2>
                                        <span className="user-status">
                                            <ShieldCheckIcon className="h-4 w-4" />
                                            Активный аккаунт
                                        </span>
                                    </div>
                                </div>

                                <div className="info-grid">
                                    <div className="info-item">
                                        <div className="info-label">
                                            <EnvelopeIcon className="info-icon" />
                                            Email
                                        </div>
                                        <div className="info-value">{user.email}</div>
                                    </div>

                                    {user.phone ? (
                                        <div className="info-item">
                                            <div className="info-label">
                                                <PhoneIcon className="info-icon" />
                                                Телефон
                                            </div>
                                            <div className="info-value">{user.phone}</div>
                                        </div>
                                    ) : (
                                        <div className="info-item">
                                            <div className="info-label">
                                                <PhoneIcon className="info-icon" />
                                                Телефон (отсутствует)
                                            </div>
                                            <div className="info-value">
                                                {openInput ? (
                                                    <div className="flex gap-5">
                                                        <form action="" onSubmit={phoneSubmit}>
                                                            <IMaskInput
                                                                type="tel"
                                                                className="add-phone-btn"
                                                                name="phone"
                                                                placeholder="+7 (999) 999-99-99"
                                                                autoComplete="tel"
                                                                value={phoneValue}
                                                                mask="+7 (000) 000-00-00"
                                                                onAccept={(value) => setPhoneValue(value)}
                                                            />
                                                            <button className="add-phone-btn">Добавить</button>
                                                        </form>
                                                    </div>
                                                ) : (
                                                    <button className="add-phone-btn" onClick={addNumber}>
                                                        Добавить номер телефона
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {user.created_at && (
                                        <div className="info-item">
                                            <div className="info-label">
                                                <CalendarIcon className="info-icon" />
                                                Дата регистрации
                                            </div>
                                            <div className="info-value">{new Date(user.created_at).toLocaleDateString('ru-RU')}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <div className="settings-card">
                                <h3 className="settings-title">Безопасность</h3>
                                <div className="security-section">
                                    <div className="security-item">
                                        <div className="security-info">
                                            <h4 className="security-title">Пароль</h4>
                                            <p className="security-description">Изменить пароль на новый</p>
                                        </div>
                                        <button className="security-button">Изменить пароль</button>
                                    </div>
                                </div>

                                <div className="divider"></div>

                                <h3 className="settings-title">Действия с аккаунтом</h3>
                                <div className="actions-grid">
                                    <button className="action-button action-primary">Редактировать профиль</button>
                                    <button className="action-button action-secondary">Выйти из аккаунта</button>
                                </div>
                            </div>

                            <div className="stats-card">
                                <h3 className="stats-title">Статистика аккаунта</h3>
                                <div className="stats-grid">
                                    {user.role == 'manager' ? (
                                        <>
                                            <div className="stat-item">
                                                <div className="stat-label">Всего заявок</div>
                                                <div className="stat-value">{bids.length}</div>
                                            </div>
                                            <div className="stat-item">
                                                <div className="stat-label">В ожидании</div>
                                                <div className="stat-value">{bids.filter((b) => b.status === 'pending').length}</div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="stat-item">
                                                <div className="stat-label">Заявок подано</div>
                                                <div className="stat-value">{bids}</div>
                                            </div>
                                            <div className="stat-item">
                                                <div className="stat-label">В избранном</div>
                                                <div className="stat-value">0</div>
                                            </div>
                                        </>
                                    )}

                                    {user.role == 'user' && (
                                        <Link href="/profile/bids">
                                            <div className="stat-item-button cursor-pointer">
                                                <div className="stat-label-button text-white">Перейти к заявкам</div>
                                                <ArrowRightIcon className="stat-icon-button" />
                                            </div>
                                        </Link>
                                    )}
                                    {user.role == 'manager' && (
                                        <>
                                            <Link href="/profile/bids">
                                                <div className="stat-item-button cursor-pointer">
                                                    <div className="stat-label-button text-white">Перейти к заявкам</div>
                                                    <ArrowRightIcon className="stat-icon-button" />
                                                </div>
                                            </Link>
                                            <Link href="/profile/manager_menu">
                                                <div className="stat-item-button cursor-pointer">
                                                    <div className="stat-label-button text-white">Менеджер меню</div>
                                                    <ArrowRightIcon className="stat-icon-button" />
                                                </div>
                                            </Link>
                                        </>
                                    )}
                                    {user.role == 'admin' && (
                                        <Link href="/profile/admin_menu">
                                            <div className="stat-item-button cursor-pointer">
                                                <div className="stat-label-button text-white">Админ меню</div>
                                                <ArrowRightIcon className="stat-icon-button" />
                                            </div>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DefaultLayout>
    );
};

export default Profile;
