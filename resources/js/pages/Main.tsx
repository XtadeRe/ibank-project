import { processSectionText, steps } from '@/data/steps';
import { ArrowRightIcon, EyeIcon, StarIcon } from '@heroicons/react/20/solid';
import { usePage } from '@inertiajs/react';
import '../../css/Main.css';
import mainImage from '../../images/main.webp';
import DefaultLayout from '../layouts/DefaultLayouts';

const Main = () => {
    const { institutions } = usePage().props;

    return (
        <DefaultLayout>
            <section className="preview" id="preview">
                <div className="main_container">
                    <div className="preview_text">
                        <h1>StudyGate</h1>
                        <p>Открываем врата знаний - учеба без границ!</p>
                    </div>
                    <div className="preview_image">
                        <img src={mainImage} alt="Фото" />
                    </div>
                </div>
            </section>

            <section id="process" className="process-section">
                <div className="container">
                    <h2>
                        {processSectionText.title} <span className="text-blue-600">{processSectionText.highlightedTitle}</span>
                    </h2>
                    <p className="subtitle">{processSectionText.subtitle}</p>

                    <div className="steps-grid">
                        {steps.map((step) => (
                            <div key={step.id} className="step-card fade-in-up">
                                <div className="step-card-header">
                                    <div className="step-number">{step.number}</div>
                                </div>
                                <h3>{step.title}</h3>
                                <p className="step-description">{step.description}</p>
                                <ul className="step-details">
                                    {step.details.map((detail, idx) => (
                                        <li key={idx} className="step-detail-item">
                                            <span className="step-detail-marker"></span>
                                            {detail}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="process-cta">
                        <button className="cta-button">{processSectionText.cta}</button>
                    </div>
                </div>
            </section>

            <section className="popular-section">
                <div className="popular-container">
                    <div className="popular-header">
                        <span className="popular-badge">Топ выбора</span>
                        <h2>Часто просматриваемые</h2>
                    </div>

                    <div className="popular-grid" id="popular-schools-container">
                        {institutions.map((institution) => (
                            <div key={institution.id} className="popular-card">
                                {institution.featured && <span className="popular-featured">Популярно</span>}

                                <div className="popular-card-image">
                                    <img src={institution.image_url} alt={institution.name} />
                                </div>

                                <div className="popular-card-content">
                                    <div className="popular-card-header">
                                        <h3 className="popular-card-title">{institution.name}</h3>
                                        <div className="popular-card-location">
                                            <span>{institution.city}</span>
                                        </div>
                                    </div>

                                    <p className="popular-card-description">
                                        <span>{institution.description}</span>
                                    </p>

                                    <div className="popular-card-footer">
                                        <div className="popular-price">
                                            {institution.price_from} - {institution.price_to} {institution.currency}
                                            <span className="popular-period"></span>
                                        </div>

                                        <div className="popular-card-stats">
                                            <div className="popular-rating">
                                                <StarIcon className="mr-1 h-4 w-4 text-yellow-500" /> {institution.rating}
                                            </div>

                                            <div className="popular-views">
                                                <EyeIcon className="mr-1 h-4 w-4 text-red-400"></EyeIcon>
                                                {institution.views}
                                            </div>
                                        </div>

                                        <button className="popular-cta cursor-pointer">Подробнее</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="help">
                <div className="help_container flex flex-col items-center justify-center">
                    <h2 className="mb-8 text-center text-3xl font-bold">Нужна помощь с выбором?</h2>
                    <p>Мы вам поможем! Укажите страну и категорию</p>
                    <div className="search_block">
                        <select className="help_select1">
                            <option>Выберите страну</option>
                            <option>1</option>
                            <option>1</option>
                        </select>
                        <select className="help_select2">
                            <option value="1">Категория</option>
                            <option value="2">Языковая школа</option>
                            <option value="3">Колледж</option>
                            <option value="4">Университет</option>
                        </select>
                        <button>
                            <ArrowRightIcon className="ml-1 h-7 w-7"></ArrowRightIcon>
                        </button>
                    </div>
                </div>
            </section>
        </DefaultLayout>
    );
};

export default Main;
