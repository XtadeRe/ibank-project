import { Link, router, usePage } from '@inertiajs/react';
import React from 'react';

interface User {
    id: number;
    login: string;
    role: string;
    email: string;
}

interface PageProps {
    auth: {
        user: User | null;
    };
}
const Header = () => {
    const { auth } = usePage<PageProps>().props;
    const { user } = auth;

    const handleLogout = (e: React.FormEvent) => {
        e.preventDefault();

        router.post('/logout');
    };

    return (
        <header className="fixed top-0 right-0 left-0 z-50 bg-white shadow-sm">
            <div className="container mx-auto px-4 py-4">
                <nav className="flex items-center justify-between">
                    <Link href="/" className="flex items-center">
                        <h1 className="text-2xl font-bold tracking-widest text-gray-900 uppercase">StudyGate</h1>
                    </Link>

                    <ul className="hidden space-x-8 md:flex">
                        <li>
                            <Link href="/catalog" className="font-medium text-gray-700 transition-colors duration-300 hover:text-blue-600">
                                Учебные заведения
                            </Link>
                        </li>
                        <li>
                            <Link href="/about" className="font-medium text-gray-700 transition-colors duration-300 hover:text-blue-600">
                                О компании
                            </Link>
                        </li>
                        <li>
                            <Link href="/immigration" className="font-medium text-gray-700 transition-colors duration-300 hover:text-blue-600">
                                Правила
                            </Link>
                        </li>
                    </ul>

                    <div className="flex items-center space-x-6">
                        {!user ? (
                            <>
                                <Link
                                    href="/register"
                                    className="cursor-pointer font-medium text-gray-700 transition-colors duration-300 hover:text-blue-600"
                                >
                                    Регистрация
                                </Link>
                                <Link
                                    href="/login"
                                    className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors duration-300 hover:bg-blue-700"
                                >
                                    Вход
                                </Link>
                            </>
                        ) : (
                            <>
                                <div className="flex flex-col items-end">
                                    <span className="font-medium text-gray-900">{user.login}</span>
                                    <span className="text-sm text-gray-500">{user.email}</span>
                                </div>
                                <Link
                                    href={user.role == 'user' ? '/profile' : '/profile/manager'}
                                    className="font-medium text-gray-700 transition-colors duration-300 hover:text-blue-600"
                                >
                                    Профиль
                                </Link>
                                <form onSubmit={handleLogout}>
                                    <button
                                        type="submit"
                                        className="cursor-pointer rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 transition-colors duration-300 hover:bg-gray-200"
                                    >
                                        Выйти
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </nav>
            </div>
        </header>
    );
};

export default Header;
