import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary mb-4">{t('notFound.title')}</h1>
          <h2 className="text-3xl font-bold text-foreground mb-4">{t('notFound.heading')}</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
            {t('notFound.message')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Home className="w-5 h-5" />
            <span>{t('notFound.goHome')}</span>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t('notFound.goBack')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;