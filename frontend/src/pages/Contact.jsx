import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Mail, Phone, MapPin, Send } from "lucide-react";

const Contact = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success(t('contact.successMessage'));
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background pt-28">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            {t('contact.title')}
          </h1>
          <p className="text-xl text-muted-foreground">
            {t('contact.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{t('contact.email')}</h3>
                <p className="text-muted-foreground">hello@shopmate.com</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{t('contact.phone')}</h3>
                <p className="text-muted-foreground">+1 (555) 123-4567</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{t('contact.address')}</h3>
                <p className="text-muted-foreground">
                  123 Shop Street, City, ST 12345
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-secondary rounded-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder={t('contact.namePlaceholder')}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  required
                />
                <input
                  type="email"
                  placeholder={t('contact.emailPlaceholder')}
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  required
                />
              </div>

              <input
                type="text"
                placeholder={t('contact.subjectPlaceholder')}
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                required
              />

              <textarea
                rows="6"
                placeholder={t('contact.messagePlaceholder')}
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
                required
              />

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2"
              >
                <Send className="w-5 h-5" />
                <span>{t('contact.sendMessage')}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
